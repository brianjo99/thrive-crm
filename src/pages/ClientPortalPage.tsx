import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle, Clock, AlertCircle, Package, CalendarDays,
  Receipt, MessageSquare, Sparkles, FolderKanban,
  Instagram, Youtube, Facebook, Linkedin, Twitter, DollarSign,
  ChevronRight, ArrowRight, FileVideo, FileImage, FileText,
  File, Bell,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
type ApprovalStatus = "pending" | "approved" | "revision-requested" | "rejected";

// ─── Data hooks ──────────────────────────────────────────────────────────────

function useClientByEmail(email: string | undefined) {
  return useQuery({
    queryKey: ["client_by_email", email],
    queryFn: async () => {
      if (!email) return null;
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!email,
  });
}

function usePortalCampaigns(clientId: string | undefined) {
  return useQuery({
    queryKey: ["portal_campaigns", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
}

function usePortalApprovals(clientId: string | undefined) {
  return useQuery({
    queryKey: ["portal_approvals", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("approvals")
        .select("*, tasks(title, description), campaigns(name), assets(name, file_type)")
        .eq("client_id", clientId)
        .eq("reviewer_type", "client")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
}

function usePortalDeliverables(campaignIds: string[]) {
  return useQuery({
    queryKey: ["portal_deliverables", campaignIds],
    queryFn: async () => {
      if (campaignIds.length === 0) return [];
      const { data, error } = await supabase
        .from("deliverables")
        .select("*, campaigns(name)")
        .in("campaign_id", campaignIds)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: campaignIds.length > 0,
  });
}

function usePortalCalendar(clientId: string | undefined) {
  return useQuery({
    queryKey: ["portal_calendar", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("content_calendar")
        .select("*")
        .eq("client_id", clientId)
        .gte("scheduled_date", today)
        .in("status", ["scheduled", "draft"])
        .order("scheduled_date", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
}

function usePortalInvoices(clientId: string | undefined) {
  return useQuery({
    queryKey: ["portal_invoices", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("client_id", clientId)
        .in("status", ["sent", "overdue", "paid"])
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data || []) as Array<{
        id: string; invoice_number: string; status: string;
        total: number; due_date: string | null; paid_date: string | null; created_at: string;
      }>;
    },
    enabled: !!clientId,
  });
}

function usePortalAlerts(clientId: string | undefined) {
  return useQuery({
    queryKey: ["portal_alerts", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("unpaid_alerts")
        .select("*")
        .eq("client_id", clientId)
        .eq("dismissed", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });
}

function useSubmitApprovalDecision() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, feedback }: { id: string; status: ApprovalStatus; feedback?: string }) => {
      const { error } = await supabase
        .from("approvals")
        .update({ status, feedback: feedback || null, reviewer_id: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal_approvals"] });
      qc.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

// ─── Config ──────────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<string, string> = {
  discovery: "Planificación",
  "pre-production": "Pre-producción",
  filming: "Filmación",
  editing: "Edición",
  review: "Revisión",
  revisions: "Ajustes",
  posting: "Publicación",
  reporting: "Reporte",
  complete: "Completado",
};

const STAGE_ORDER = ["discovery","pre-production","filming","editing","review","revisions","posting","reporting","complete"];

const STAGE_CLIENT_MESSAGE: Record<string, string> = {
  discovery: "Tu equipo está definiendo la estrategia y el plan de contenido.",
  "pre-production": "Se está preparando el guion, el call sheet y la logística del rodaje.",
  filming: "El equipo de filmación está grabando tu contenido.",
  editing: "Los editores están trabajando en el corte y la post-producción.",
  review: "El contenido está siendo revisado internamente antes de enviarte la aprobación.",
  revisions: "Se están aplicando los ajustes solicitados.",
  posting: "Tu contenido está siendo publicado en las plataformas acordadas.",
  reporting: "Se está generando el reporte de rendimiento de tu campaña.",
  complete: "¡Campaña completada! Todo el trabajo fue entregado.",
};

const DELIVERABLE_STATUS: Record<string, { label: string; bgColor: string; textColor: string; icon: typeof CheckCircle }> = {
  pending:       { label: "En preparación",     bgColor: "bg-muted/40",       textColor: "text-muted-foreground", icon: Clock },
  "in-progress": { label: "En proceso",         bgColor: "bg-primary/10",     textColor: "text-primary",          icon: Clock },
  ready:         { label: "Listo para entrega", bgColor: "bg-amber-500/10",   textColor: "text-amber-500",        icon: Package },
  delivered:     { label: "Entregado",          bgColor: "bg-emerald-500/10", textColor: "text-emerald-500",      icon: CheckCircle },
  approved:      { label: "Aprobado",           bgColor: "bg-emerald-500/10", textColor: "text-emerald-500",      icon: CheckCircle },
};

const DELIVERABLE_TYPE_ICON: Record<string, typeof File> = {
  video: FileVideo,
  reel: FileVideo,
  image: FileImage,
  thumbnail: FileImage,
  document: FileText,
  report: FileText,
};

const INVOICE_STATUS: Record<string, { label: string; bgColor: string; textColor: string }> = {
  sent:    { label: "Pendiente de pago", bgColor: "bg-blue-500/10",        textColor: "text-blue-400" },
  overdue: { label: "Vencida",           bgColor: "bg-destructive/10",     textColor: "text-destructive" },
  paid:    { label: "Pagada",            bgColor: "bg-emerald-500/10",     textColor: "text-emerald-500" },
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  Instagram: <Instagram className="h-3.5 w-3.5" />,
  YouTube:   <Youtube className="h-3.5 w-3.5" />,
  Facebook:  <Facebook className="h-3.5 w-3.5" />,
  LinkedIn:  <Linkedin className="h-3.5 w-3.5" />,
  Twitter:   <Twitter className="h-3.5 w-3.5" />,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, badge }: {
  icon: typeof FolderKanban;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {badge}
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }: {
  icon: typeof CheckCircle;
  title: string;
  body: string;
}) {
  return (
    <Card className="luxury-card p-5 flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4.5 w-4.5 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{body}</p>
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const { user } = useAuth();
  const { data: client, isLoading: clientLoading } = useClientByEmail(user?.email);

  const clientId = client?.id;
  const { data: campaigns = [], isLoading: campaignsLoading } = usePortalCampaigns(clientId);
  const { data: approvals = [], isLoading: approvalsLoading } = usePortalApprovals(clientId);
  const campaignIds = campaigns.map(c => c.id);
  const { data: deliverables = [] } = usePortalDeliverables(campaignIds);
  const { data: calendarItems = [] } = usePortalCalendar(clientId);
  const { data: invoices = [] } = usePortalInvoices(clientId);
  const { data: alerts = [] } = usePortalAlerts(clientId);
  const submitDecision = useSubmitApprovalDecision();

  const [reviewApproval, setReviewApproval] = useState<typeof approvals[0] | null>(null);
  const [feedback, setFeedback] = useState("");

  // Derived
  const activeCampaigns      = campaigns.filter(c => c.current_stage !== "complete");
  const completedCampaigns   = campaigns.filter(c => c.current_stage === "complete");
  const pendingApprovals     = approvals.filter(a => a.status === "pending");
  const resolvedApprovals    = approvals.filter(a => a.status === "approved" || a.status === "revision-requested");
  const readyDeliverables    = deliverables.filter(d => d.status === "delivered" || d.status === "approved" || d.status === "ready");
  const outstandingInvoices  = invoices.filter(i => i.status === "sent" || i.status === "overdue");
  const outstandingTotal     = outstandingInvoices.reduce((sum, i) => sum + ((i as any).total || 0), 0);
  const hasAnyData           = campaigns.length > 0 || approvals.length > 0 || deliverables.length > 0 || invoices.length > 0;

  const handleDecision = async (status: ApprovalStatus) => {
    if (!reviewApproval) return;
    try {
      await submitDecision.mutateAsync({ id: reviewApproval.id, status, feedback: feedback || undefined });
      toast.success(status === "approved" ? "Aprobado. ¡Gracias!" : "Revisión solicitada. Lo tendremos en cuenta.");
      setReviewApproval(null);
      setFeedback("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Loading state
  if (clientLoading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        {[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  // No client record found for this email
  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="luxury-card p-12 text-center max-w-md">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="font-display text-xl font-bold mb-2">Tu portal está siendo preparado</h2>
          <p className="text-sm text-muted-foreground">
            Tu espacio de proyecto será visible aquí en cuanto tu equipo lo configure.
            Si tienes preguntas, escríbenos directamente.
          </p>
        </Card>
      </div>
    );
  }

  const displayName = user?.user_metadata?.display_name || client.name;
  const firstName   = displayName.split(" ")[0];

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-5 max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold">Hola, {firstName}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeCampaigns.length > 0
                  ? `${activeCampaigns.length} proyecto${activeCampaigns.length !== 1 ? "s" : ""} activo${activeCampaigns.length !== 1 ? "s" : ""} en curso`
                  : campaigns.length > 0
                    ? "Todos tus proyectos están completados"
                    : "Bienvenido a tu portal de cliente"}
              </p>
            </div>
            {pendingApprovals.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-500">
                  {pendingApprovals.length} {pendingApprovals.length === 1 ? "aprobación pendiente" : "aprobaciones pendientes"}
                </span>
              </div>
            )}
            {alerts.length > 0 && pendingApprovals.length === 0 && (
              <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2 shrink-0">
                <Bell className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">{alerts.length} alerta{alerts.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-4xl">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Proyectos activos",
              value: campaignsLoading ? "—" : activeCampaigns.length,
              icon: FolderKanban,
              textColor: activeCampaigns.length > 0 ? "text-primary" : "text-muted-foreground",
            },
            {
              label: "Pendientes de revisión",
              value: approvalsLoading ? "—" : pendingApprovals.length,
              icon: AlertCircle,
              textColor: pendingApprovals.length > 0 ? "text-amber-500" : "text-muted-foreground",
            },
            {
              label: "Entregables listos",
              value: readyDeliverables.length,
              icon: Package,
              textColor: readyDeliverables.length > 0 ? "text-emerald-500" : "text-muted-foreground",
            },
            {
              label: outstandingTotal > 0 ? "Por pagar" : "Facturación",
              value: outstandingTotal > 0
                ? `$${outstandingTotal.toLocaleString()}`
                : invoices.length > 0 ? "Al día" : "Sin facturas",
              icon: DollarSign,
              textColor: outstandingTotal > 0 ? "text-amber-500" : "text-muted-foreground",
            },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="luxury-card p-4">
                <stat.icon className={cn("h-4 w-4 mb-2", stat.textColor)} />
                <p className={cn("text-xl font-bold font-display", stat.textColor)}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Pending approvals (always visible) ── */}
        <section>
          <SectionHeader
            icon={AlertCircle}
            title="Aprobaciones"
            badge={pendingApprovals.length > 0 && (
              <span className="text-xs bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full font-medium">
                {pendingApprovals.length} pendiente{pendingApprovals.length !== 1 ? "s" : ""}
              </span>
            )}
          />
          {approvalsLoading ? (
            <Skeleton className="h-16 rounded-xl" />
          ) : pendingApprovals.length > 0 ? (
            <div className="space-y-2">
              {pendingApprovals.map((approval, i) => (
                <motion.div key={approval.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card
                    className="luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setReviewApproval(approval); setFeedback(""); }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {(approval as any).assets?.name || (approval as any).tasks?.title || "Contenido para revisar"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {(approval as any).campaigns?.name || "Campaña"}
                          {(approval as any).assets?.file_type && (
                            <span className="ml-1.5 text-xs uppercase opacity-60">
                              · {(approval as any).assets.file_type}
                            </span>
                          )}
                          <span className="ml-1.5">· {format(new Date(approval.created_at), "d MMM", { locale: es })}</span>
                        </p>
                      </div>
                      <Button size="sm" className="gap-1.5 shrink-0">
                        Revisar <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : resolvedApprovals.length > 0 ? (
            <Card className="luxury-card p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Todo al día</p>
                <p className="text-sm text-muted-foreground">
                  {resolvedApprovals.length} contenido{resolvedApprovals.length !== 1 ? "s" : ""} revisado{resolvedApprovals.length !== 1 ? "s" : ""} anteriormente.
                  Te avisaremos cuando haya algo nuevo para revisar.
                </p>
              </div>
            </Card>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title="Sin aprobaciones pendientes"
              body="Cuando tu equipo tenga contenido listo para que lo revises, aparecerá aquí."
            />
          )}
        </section>

        {/* ── Active campaigns (always visible) ── */}
        <section>
          <SectionHeader icon={FolderKanban} title="Tus proyectos" />
          {campaignsLoading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
          ) : activeCampaigns.length > 0 ? (
            <div className="space-y-3">
              {activeCampaigns.map((campaign, i) => {
                const stages = (campaign.stages as string[]) || [];
                const currentIdx = STAGE_ORDER.indexOf(campaign.current_stage);
                const completedCount = stages.filter(s => STAGE_ORDER.indexOf(s) < currentIdx).length;
                const pct = stages.length > 1
                  ? Math.round((currentIdx / (STAGE_ORDER.length - 1)) * 100)
                  : 0;
                const clientMessage = STAGE_CLIENT_MESSAGE[campaign.current_stage];
                return (
                  <motion.div key={campaign.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="luxury-card p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <h3 className="font-display font-semibold">{campaign.name}</h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Etapa actual:{" "}
                            <span className="font-medium text-foreground">
                              {STAGE_LABELS[campaign.current_stage] || campaign.current_stage}
                            </span>
                          </p>
                        </div>
                        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                          En curso
                        </span>
                      </div>

                      {/* Stage progress dots */}
                      {stages.length > 0 && (
                        <div className="space-y-2 mb-4">
                          <div className="flex gap-1">
                            {stages.map((s) => {
                              const sIdx = STAGE_ORDER.indexOf(s);
                              const isDone    = sIdx < currentIdx;
                              const isCurrent = sIdx === currentIdx;
                              return (
                                <div
                                  key={s}
                                  className={cn(
                                    "h-1.5 flex-1 rounded-full transition-all",
                                    isDone    ? "bg-emerald-500" :
                                    isCurrent ? "bg-primary" :
                                    "bg-muted"
                                  )}
                                  title={STAGE_LABELS[s] || s}
                                />
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{completedCount} de {stages.length} etapas completadas</span>
                            <span>{pct}%</span>
                          </div>
                        </div>
                      )}

                      {/* What's happening now */}
                      {clientMessage && (
                        <div className="flex items-start gap-2 bg-muted/30 rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
                          <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                          <span>{clientMessage}</span>
                        </div>
                      )}

                      {campaign.due_date && (
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                          Fecha objetivo:{" "}
                          <span className="font-medium text-foreground">
                            {format(new Date(campaign.due_date), "d 'de' MMMM yyyy", { locale: es })}
                          </span>
                        </p>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : completedCampaigns.length > 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Todos tus proyectos están completados"
              body="Cuando arranque un nuevo proyecto, aparecerá aquí con el progreso en tiempo real."
            />
          ) : (
            <EmptyState
              icon={FolderKanban}
              title="Tu primer proyecto está en camino"
              body="En cuanto tu equipo cree tu campaña, podrás seguir el progreso desde aquí."
            />
          )}

          {/* Completed campaigns — collapsed view */}
          {completedCampaigns.length > 0 && activeCampaigns.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Proyectos completados ({completedCampaigns.length})
              </p>
              <div className="space-y-2">
                {completedCampaigns.map(c => (
                  <Card key={c.id} className="luxury-card px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                      Completado
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Deliverables (always visible once campaigns exist) ── */}
        {(campaigns.length > 0 || deliverables.length > 0) && (
          <section>
            <SectionHeader
              icon={Package}
              title="Entregables"
              badge={readyDeliverables.length > 0 && (
                <span className="text-xs bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full font-medium">
                  {readyDeliverables.length} listo{readyDeliverables.length !== 1 ? "s" : ""}
                </span>
              )}
            />
            {deliverables.length > 0 ? (
              <div className="space-y-2">
                {deliverables.map((d, i) => {
                  const cfg = DELIVERABLE_STATUS[d.status] || DELIVERABLE_STATUS.pending;
                  const TypeIcon = DELIVERABLE_TYPE_ICON[(d as any).type] || File;
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card className="luxury-card p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", cfg.bgColor)}>
                            <TypeIcon className={cn("h-4 w-4", cfg.textColor)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{d.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(d as any).campaigns?.name}
                              {d.due_date && ` · ${format(new Date(d.due_date), "d MMM", { locale: es })}`}
                            </p>
                          </div>
                          <div className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium shrink-0", cfg.bgColor, cfg.textColor)}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Package}
                title="Tus entregables aparecerán aquí"
                body="A medida que el equipo complete el trabajo — videos, imágenes, reportes — los verás listados aquí con su estado."
              />
            )}
          </section>
        )}

        {/* ── Upcoming content calendar ── */}
        {calendarItems.length > 0 && (
          <section>
            <SectionHeader icon={CalendarDays} title="Contenido próximo" />
            <Card className="luxury-card divide-y divide-border">
              {calendarItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground">
                      {PLATFORM_ICON[(item as any).platform] || <CalendarDays className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {(item as any).content_type}{(item as any).platform && ` · ${(item as any).platform}`}
                      </p>
                      {(item as any).caption && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{(item as any).caption}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date((item as any).scheduled_date), "d MMM", { locale: es })}
                  </span>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* ── Billing alerts ── */}
        {alerts.length > 0 && (
          <section>
            <SectionHeader icon={Bell} title="Alertas de facturación" />
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <motion.div key={alert.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card className="luxury-card p-4 border-destructive/20">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(alert.created_at), "d 'de' MMMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Invoices ── */}
        {invoices.length > 0 && (
          <section>
            <SectionHeader
              icon={Receipt}
              title="Facturación"
              badge={outstandingInvoices.length > 0 && (
                <span className="text-xs bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full font-medium">
                  {outstandingInvoices.length} pendiente{outstandingInvoices.length !== 1 ? "s" : ""}
                </span>
              )}
            />
            <div className="space-y-2">
              {invoices.map((inv, i) => {
                const cfg = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent;
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="luxury-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">Factura {inv.invoice_number}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {inv.due_date
                              ? `Vence ${format(new Date(inv.due_date), "d MMM yyyy", { locale: es })}`
                              : format(new Date(inv.created_at), "d MMM yyyy", { locale: es })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold text-sm">${(inv.total || 0).toLocaleString()}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.bgColor, cfg.textColor)}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Fallback: total empty state (no campaigns at all) ── */}
        {!campaignsLoading && campaigns.length === 0 && !hasAnyData && (
          <Card className="luxury-card p-10 text-center">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">Tu proyecto está en camino</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              En cuanto tu equipo arranque la producción, verás el progreso, los entregables y las aprobaciones aquí.
            </p>
          </Card>
        )}

      </main>

      {/* ── Approval review dialog ── */}
      {reviewApproval && (
        <Dialog open onOpenChange={() => { setReviewApproval(null); setFeedback(""); }}>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-4 shrink-0">
              <DialogTitle className="font-display">Revisar contenido</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2 space-y-4">
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                {(reviewApproval as any).assets?.name && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Archivo</span>
                    <span className="font-medium">{(reviewApproval as any).assets.name}</span>
                  </div>
                )}
                {(reviewApproval as any).tasks?.title && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tarea</span>
                    <span className="font-medium">{(reviewApproval as any).tasks.title}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Campaña</span>
                  <span className="font-medium">{(reviewApproval as any).campaigns?.name || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Enviado</span>
                  <span className="font-medium">
                    {format(new Date(reviewApproval.created_at), "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </div>
              </div>
              {(reviewApproval as any).tasks?.description && (
                <div className="text-sm text-muted-foreground bg-muted/20 rounded-lg p-3">
                  {(reviewApproval as any).tasks.description}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Comentarios (opcional)</label>
                <Textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Si solicitas cambios, descríbelos aquí con el mayor detalle posible..."
                  rows={3}
                />
              </div>
            </div>
            <div className="shrink-0 border-t border-border p-4 space-y-2">
              <Button
                className="w-full gap-2"
                onClick={() => handleDecision("approved")}
                disabled={submitDecision.isPending}
              >
                <CheckCircle className="h-4 w-4" /> Aprobar contenido
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleDecision("revision-requested")}
                disabled={submitDecision.isPending || !feedback.trim()}
              >
                <MessageSquare className="h-4 w-4" /> Solicitar cambios
              </Button>
              {!feedback.trim() && (
                <p className="text-xs text-center text-muted-foreground">
                  Escribe un comentario para solicitar cambios
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
