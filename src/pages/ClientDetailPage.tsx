import { useParams, useNavigate } from "react-router-dom";
import { useClients, useAssets, useClientOnboarding, useUpdateClient, getAssetPublicUrl } from "@/hooks/useSupabaseData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ServiceBadge, ClientTypeBadge } from "@/components/thrive/Badges";
import { ClientOnboardingWizard } from "@/components/thrive/ClientOnboardingWizard";
import { BrandKitCard } from "@/components/thrive/BrandKitCard";
import {
  ArrowLeft, Users, Mail, Calendar, Pencil, FolderKanban,
  CheckCircle, ShieldCheck, Receipt, Clock, AlertCircle,
  Send, FileText, DollarSign, Layers, Image as ImageIcon,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ClientType, ServiceType } from "@/types/thrive";
import { Tables } from "@/integrations/supabase/types";

type ClientRow = Tables<"clients">;

// ─── Inline data hooks ───────────────────────────────────────────────────────

function useClientCampaigns(clientId: string) {
  return useQuery({
    queryKey: ["campaigns", "client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, template, current_stage, stages, start_date, due_date, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!clientId,
  });
}

function useClientApprovals(clientId: string) {
  return useQuery({
    queryKey: ["approvals", "client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approvals")
        .select("id, status, created_at, reviewer_type, tasks(title)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; status: string; created_at: string;
        reviewer_type: string; tasks: { title: string } | null;
      }>;
    },
    enabled: !!clientId,
  });
}

function useClientInvoices(clientId: string) {
  return useQuery({
    queryKey: ["invoices", "client", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total, due_date, paid_date, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; invoice_number: string; status: string;
        total: number; due_date: string | null; paid_date: string | null; created_at: string;
      }>;
    },
    enabled: !!clientId,
  });
}

// ─── Status configs ──────────────────────────────────────────────────────────

const APPROVAL_STATUS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending:            { label: "Pendiente", color: "bg-muted text-muted-foreground",     icon: Clock },
  approved:           { label: "Aprobado",  color: "bg-success/15 text-success",         icon: CheckCircle },
  "revision-requested":{ label: "Revisión", color: "bg-warning/15 text-warning",         icon: AlertCircle },
  rejected:           { label: "Rechazado", color: "bg-destructive/15 text-destructive", icon: AlertCircle },
};

const INVOICE_STATUS: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  draft:     { label: "Borrador",  color: "bg-muted text-muted-foreground",   icon: FileText },
  sent:      { label: "Enviada",   color: "bg-blue-500/15 text-blue-400",     icon: Send },
  paid:      { label: "Pagada",    color: "bg-green-500/15 text-green-400",   icon: CheckCircle },
  overdue:   { label: "Vencida",   color: "bg-red-500/15 text-red-400",       icon: AlertCircle },
  cancelled: { label: "Cancelada", color: "bg-zinc-500/15 text-zinc-400",     icon: Clock },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: clients = [], isLoading: clientsLoading } = useClients();
  const updateClient = useUpdateClient();

  const client = clients.find(c => c.id === id);

  const { data: campaigns = [], isLoading: campaignsLoading } = useClientCampaigns(id!);
  const { data: approvals = [] } = useClientApprovals(id!);
  const { data: assets = [] } = useAssets({ clientId: id });
  const { data: invoices = [] } = useClientInvoices(id!);
  const { data: onboarding } = useClientOnboarding(id);

  const [editOpen, setEditOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    type: "business" as ClientType,
    enabledServices: [] as ServiceType[],
  });

  // ── Derived stats
  const activeCampaigns = campaigns.filter(c => {
    const stages = c.stages as string[];
    return !stages?.length || c.current_stage !== stages[stages.length - 1];
  });
  const pendingApprovals = approvals.filter(a => a.status === "pending");
  const outstandingAmount = invoices
    .filter(i => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + i.total, 0);
  const paidAmount = invoices
    .filter(i => i.status === "paid")
    .reduce((s, i) => s + i.total, 0);

  // ── Onboarding progress
  const checklistItems = (client?.default_checklist as any[]) ?? [];
  const doneCount = checklistItems.filter(i => i.checked).length;
  const onboardingPct = checklistItems.length > 0
    ? Math.round((doneCount / checklistItems.length) * 100)
    : 0;

  const openEdit = () => {
    if (!client) return;
    setEditForm({
      name: client.name,
      email: client.email ?? "",
      type: client.type as ClientType,
      enabledServices: (client.enabled_services ?? []) as ServiceType[],
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!client || !editForm.name) return;
    try {
      await updateClient.mutateAsync({
        id: client.id,
        name: editForm.name,
        email: editForm.email,
        type: editForm.type,
        enabledServices: editForm.enabledServices,
      });
      toast.success("Cliente actualizado");
      setEditOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleEditService = (s: ServiceType) =>
    setEditForm(f => ({
      ...f,
      enabledServices: f.enabledServices.includes(s)
        ? f.enabledServices.filter(x => x !== s)
        : [...f.enabledServices, s],
    }));

  // ── Loading
  if (clientsLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <Card className="luxury-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold mb-2">Cliente no encontrado</h3>
          <Button onClick={() => navigate("/clients")}>
            <ArrowLeft className="h-4 w-4 mr-2" />Volver a clientes
          </Button>
        </Card>
      </div>
    );
  }

  // ── Invoice status counts
  const invoiceStatusCounts = invoices.reduce((acc, inv) => {
    acc[inv.status] = (acc[inv.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen">
      {/* ── Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-bold">{client.name}</h1>
                <ClientTypeBadge type={client.type} size="sm" />
              </div>
              {client.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOnboardingOpen(true)}>
                <CheckCircle className="h-3.5 w-3.5" /> Onboarding
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openEdit}>
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* ── Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Campañas activas",
              value: activeCampaigns.length,
              icon: FolderKanban,
              color: "text-primary",
              bg: "bg-primary/10",
            },
            {
              label: "Aprobaciones pendientes",
              value: pendingApprovals.length,
              icon: ShieldCheck,
              color: pendingApprovals.length > 0 ? "text-warning" : "text-muted-foreground",
              bg: pendingApprovals.length > 0 ? "bg-warning/10" : "bg-muted/50",
            },
            {
              label: "Archivos",
              value: assets.length,
              icon: Layers,
              color: "text-accent",
              bg: "bg-accent/10",
            },
            {
              label: "Por cobrar",
              value: `$${outstandingAmount.toLocaleString()}`,
              icon: DollarSign,
              color: outstandingAmount > 0 ? "text-orange-400" : "text-success",
              bg: outstandingAmount > 0 ? "bg-orange-400/10" : "bg-success/10",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="luxury-card p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", stat.bg)}>
                    <stat.icon className={cn("h-4 w-4", stat.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-display font-bold truncate">{stat.value}</p>
                    <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: content sections */}
          <div className="lg:col-span-2 space-y-6">

            {/* Brand Kit */}
            <BrandKitCard clientId={client.id} />

            {/* Campaigns */}
            <Card className="luxury-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-primary" /> Campañas
                </h3>
                <span className="text-sm text-muted-foreground">{campaigns.length} total</span>
              </div>
              {campaignsLoading ? (
                <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin campañas aún</p>
              ) : (
                <div className="space-y-2">
                  {campaigns.map(campaign => {
                    const stages = (campaign.stages as string[]) ?? [];
                    const currentIdx = stages.indexOf(campaign.current_stage);
                    const isComplete = currentIdx === stages.length - 1 && stages.length > 0;
                    return (
                      <div
                        key={campaign.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{campaign.name}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {/* Stage progress dots */}
                            <div className="flex items-center gap-0.5">
                              {stages.map((s, i) => (
                                <div
                                  key={s}
                                  className={cn("h-1.5 rounded-full transition-all", {
                                    "w-8 bg-primary": i === currentIdx,
                                    "w-3 bg-success/70": i < currentIdx,
                                    "w-3 bg-muted-foreground/20": i > currentIdx,
                                  })}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground capitalize">
                              {campaign.current_stage.replace(/-/g, " ")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", isComplete
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/15 text-primary"
                          )}>
                            {isComplete ? "Completa" : "Activa"}
                          </span>
                          {campaign.due_date && (
                            <span className="text-xs text-muted-foreground hidden md:block">
                              {format(new Date(campaign.due_date), "d MMM")}
                            </span>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Pending Approvals */}
            <Card className="luxury-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Aprobaciones
                </h3>
                {pendingApprovals.length > 0 && (
                  <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium">
                    {pendingApprovals.length} pendiente{pendingApprovals.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin aprobaciones</p>
              ) : (
                <div className="space-y-2">
                  {approvals.map(approval => {
                    const cfg = APPROVAL_STATUS[approval.status] ?? APPROVAL_STATUS["pending"];
                    const Icon = cfg.icon;
                    return (
                      <div key={approval.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">{approval.tasks?.title ?? "Tarea"}</span>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.color)}>
                            {cfg.label}
                          </span>
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {format(new Date(approval.created_at), "d MMM")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Recent Assets */}
            <Card className="luxury-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Archivos recientes
                </h3>
                <span className="text-sm text-muted-foreground">{assets.length} total</span>
              </div>
              {assets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin archivos aún</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {assets.slice(0, 16).map(asset => {
                    const isImage = asset.file_type?.startsWith("image/");
                    const ext = asset.name.split(".").pop()?.toUpperCase() ?? "";
                    return (
                      <div
                        key={asset.id}
                        title={asset.name}
                        className="aspect-square rounded-lg bg-muted/50 overflow-hidden flex items-center justify-center border border-border/40 hover:border-primary/30 transition-colors"
                      >
                        {isImage ? (
                          <img
                            src={getAssetPublicUrl(asset.file_path)}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 p-1">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-[8px] text-muted-foreground font-mono">{ext}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {assets.length > 16 && (
                    <div className="aspect-square rounded-lg bg-muted/30 flex items-center justify-center border border-border/40">
                      <span className="text-xs text-muted-foreground font-medium">+{assets.length - 16}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right: sidebar */}
          <div className="space-y-4">

            {/* Client Info */}
            <Card className="luxury-card p-5">
              <h3 className="font-display font-semibold mb-4">Información del cliente</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Cliente desde
                  </span>
                  <span className="font-medium">{format(new Date(client.created_at), "MMM yyyy")}</span>
                </div>
                {client.email && (
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="text-muted-foreground flex items-center gap-1.5 flex-shrink-0">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                    <a
                      href={`mailto:${client.email}`}
                      className="font-medium text-primary hover:underline truncate text-right"
                      title={client.email}
                    >
                      {client.email}
                    </a>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Campañas</span>
                  <span className="font-medium">{campaigns.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Archivos</span>
                  <span className="font-medium">{assets.length}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">Servicios habilitados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(["film", "edit", "post", "report"] as ServiceType[]).map(s => (
                      <ServiceBadge key={s} service={s} enabled={client.enabled_services.includes(s)} size="sm" />
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Billing snapshot */}
            <Card className="luxury-card p-5">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Facturación
              </h3>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin facturas</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-success/10 p-3 text-center">
                      <p className="text-lg font-display font-bold text-success">${paidAmount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Cobrado</p>
                    </div>
                    <div className={cn("rounded-lg p-3 text-center", outstandingAmount > 0 ? "bg-orange-400/10" : "bg-muted/30")}>
                      <p className={cn("text-lg font-display font-bold", outstandingAmount > 0 ? "text-orange-400" : "text-muted-foreground")}>
                        ${outstandingAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Por cobrar</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border space-y-1.5">
                    {Object.entries(invoiceStatusCounts).map(([status, count]) => {
                      const cfg = INVOICE_STATUS[status];
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <div key={status} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </span>
                          <span className={cn("px-1.5 py-0.5 rounded-full font-medium", cfg.color)}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Onboarding progress */}
            {checklistItems.length > 0 && (
              <Card className="luxury-card p-5">
                <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" /> Onboarding
                </h3>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{doneCount}/{checklistItems.length} pasos</span>
                  <span className={cn("font-semibold", onboardingPct === 100 ? "text-success" : "text-primary")}>
                    {onboardingPct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <motion.div
                    className={cn("h-full rounded-full", onboardingPct === 100 ? "bg-success" : "bg-primary")}
                    initial={{ width: 0 }}
                    animate={{ width: `${onboardingPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                {/* Show first few unchecked items */}
                <div className="space-y-1.5">
                  {checklistItems
                    .filter((item: any) => !item.checked)
                    .slice(0, 4)
                    .map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded border border-border flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  {checklistItems.filter((item: any) => !item.checked).length > 4 && (
                    <p className="text-xs text-muted-foreground pl-5">
                      +{checklistItems.filter((item: any) => !item.checked).length - 4} más
                    </p>
                  )}
                  {onboardingPct === 100 && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Onboarding completado
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-xs"
                  onClick={() => setOnboardingOpen(true)}
                >
                  Ver checklist completo
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* ── Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="font-display">Editar cliente</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del cliente" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="cliente@ejemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={editForm.type} onValueChange={(v: ClientType) => setEditForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="influencer">Influencer</SelectItem>
                  <SelectItem value="creator">Creator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Servicios habilitados</Label>
              <div className="flex flex-wrap gap-2">
                {(["film", "edit", "post", "report"] as ServiceType[]).map(s => (
                  <button key={s} onClick={() => toggleEditService(s)} className="transition-transform hover:scale-105">
                    <ServiceBadge service={s} enabled={editForm.enabledServices.includes(s)} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t border-border p-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateClient.isPending || !editForm.name}>
              {updateClient.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Onboarding wizard */}
      {onboardingOpen && (
        <ClientOnboardingWizard
          client={client}
          isOpen={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onComplete={() => setOnboardingOpen(false)}
        />
      )}
    </div>
  );
}
