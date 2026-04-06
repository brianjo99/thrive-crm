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
  Receipt, ArrowRight, MessageSquare, Sparkles, FolderKanban,
  Instagram, Youtube, Facebook, Linkedin, Twitter, DollarSign,
  ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isPast, isFuture } from "date-fns";
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
        .select("*, tasks(title), campaigns(name)")
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

const DELIVERABLE_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending:     { label: "En preparación", color: "bg-muted text-muted-foreground",     icon: Clock },
  "in-progress":{ label: "En proceso",    color: "bg-primary/15 text-primary",         icon: Clock },
  ready:       { label: "Listo para entrega", color: "bg-warning/15 text-warning",     icon: Package },
  delivered:   { label: "Entregado",      color: "bg-success/15 text-success",         icon: CheckCircle },
  approved:    { label: "Aprobado",       color: "bg-success/15 text-success",         icon: CheckCircle },
};

const INVOICE_STATUS: Record<string, { label: string; color: string }> = {
  sent:      { label: "Pendiente de pago", color: "bg-blue-500/15 text-blue-400" },
  overdue:   { label: "Vencida",           color: "bg-destructive/15 text-destructive" },
  paid:      { label: "Pagada",            color: "bg-success/15 text-success" },
};

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  Instagram: <Instagram className="h-3.5 w-3.5" />,
  YouTube:   <Youtube className="h-3.5 w-3.5" />,
  Facebook:  <Facebook className="h-3.5 w-3.5" />,
  LinkedIn:  <Linkedin className="h-3.5 w-3.5" />,
  Twitter:   <Twitter className="h-3.5 w-3.5" />,
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientPortalPage() {
  const { user } = useAuth();
  const { data: client, isLoading: clientLoading } = useClientByEmail(user?.email);

  const clientId = client?.id;
  const { data: campaigns = [], isLoading: campaignsLoading } = usePortalCampaigns(clientId);
  const { data: approvals = [] } = usePortalApprovals(clientId);
  const campaignIds = campaigns.map(c => c.id);
  const { data: deliverables = [] } = usePortalDeliverables(campaignIds);
  const { data: calendarItems = [] } = usePortalCalendar(clientId);
  const { data: invoices = [] } = usePortalInvoices(clientId);
  const submitDecision = useSubmitApprovalDecision();

  const [reviewApproval, setReviewApproval] = useState<typeof approvals[0] | null>(null);
  const [feedback, setFeedback] = useState("");

  // Derived
  const activeCampaigns   = campaigns.filter(c => c.current_stage !== "complete");
  const pendingApprovals  = approvals.filter(a => a.status === "pending");
  const readyDeliverables = deliverables.filter(d => d.status === "delivered" || d.status === "approved" || d.status === "ready");
  const outstandingTotal  = invoices
    .filter(i => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + (i as any).total, 0);

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
      <div className="p-6 space-y-4">
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
          <p className="text-muted-foreground text-sm">
            Tu espacio de proyecto será visible aquí en cuanto tu equipo lo configure.
            Si tienes preguntas, escríbenos directamente.
          </p>
        </Card>
      </div>
    );
  }

  const displayName = user?.user_metadata?.display_name || client.name;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">Hola, {displayName.split(" ")[0]} 👋</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeCampaigns.length > 0
                  ? `${activeCampaigns.length} proyecto${activeCampaigns.length !== 1 ? "s" : ""} activo${activeCampaigns.length !== 1 ? "s" : ""} en curso`
                  : "Tu portal de proyecto"}
              </p>
            </div>
            {pendingApprovals.length > 0 && (
              <div className="flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-4 py-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">
                  {pendingApprovals.length} esperando tu aprobación
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-4xl">

        {/* ── Status snapshot ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Proyectos activos",  value: activeCampaigns.length,    icon: FolderKanban, color: "text-primary" },
            { label: "Pendientes de aprobación", value: pendingApprovals.length, icon: AlertCircle, color: pendingApprovals.length > 0 ? "text-warning" : "text-muted-foreground" },
            { label: "Entregables listos", value: readyDeliverables.length,   icon: Package,     color: readyDeliverables.length > 0 ? "text-success" : "text-muted-foreground" },
            { label: "Por pagar",
              value: outstandingTotal > 0 ? `$${outstandingTotal.toLocaleString()}` : "Al día",
              icon: DollarSign,
              color: outstandingTotal > 0 ? "text-warning" : "text-success",
            },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="luxury-card p-4">
                <stat.icon className={cn("h-4 w-4 mb-2", stat.color)} />
                <p className={cn("text-xl font-bold font-display", stat.color)}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ── Pending approvals ── */}
        {pendingApprovals.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <h2 className="font-display text-lg font-semibold">Necesita tu aprobación</h2>
              <span className="text-xs bg-warning/15 text-warning px-2 py-0.5 rounded-full font-medium">{pendingApprovals.length}</span>
            </div>
            <div className="space-y-2">
              {pendingApprovals.map((approval, i) => (
                <motion.div key={approval.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <Card
                    className="luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setReviewApproval(approval); setFeedback(""); }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{(approval as any).tasks?.title || "Contenido para revisar"}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {(approval as any).campaigns?.name || "Campaña"} · {format(new Date(approval.created_at), "d MMM")}
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
          </section>
        )}

        {/* ── Active campaigns ── */}
        {(campaignsLoading || activeCampaigns.length > 0) && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Tus proyectos</h2>
            </div>
            {campaignsLoading ? (
              <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-3">
                {activeCampaigns.map((campaign, i) => {
                  const stages = campaign.stages || [];
                  const stageIdx = STAGE_ORDER.indexOf(campaign.current_stage);
                  const pct = stages.length > 0
                    ? Math.round((STAGE_ORDER.indexOf(campaign.current_stage) / (stages.length - 1)) * 100)
                    : 0;
                  return (
                    <motion.div key={campaign.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="luxury-card p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-display font-semibold">{campaign.name}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              Actualmente en: <span className="font-medium text-foreground">{STAGE_LABELS[campaign.current_stage] || campaign.current_stage}</span>
                            </p>
                          </div>
                          {campaign.current_stage === "complete" ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success font-medium">Completado</span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/15 text-primary font-medium">En curso</span>
                          )}
                        </div>
                        {/* Stage progress */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{STAGE_LABELS[stages[0]] || "Inicio"}</span>
                            <span>{STAGE_LABELS[stages[stages.length - 1]] || "Fin"}</span>
                          </div>
                          <div className="flex gap-0.5">
                            {stages.map((s, idx) => (
                              <div
                                key={s}
                                className={cn(
                                  "h-1.5 flex-1 rounded-full transition-all",
                                  idx < STAGE_ORDER.indexOf(campaign.current_stage) ? "bg-success" :
                                  idx === STAGE_ORDER.indexOf(campaign.current_stage) ? "bg-primary" :
                                  "bg-muted"
                                )}
                                title={STAGE_LABELS[s] || s}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground text-right">{pct}% completado</p>
                        </div>
                        {campaign.due_date && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                            Fecha objetivo: {format(new Date(campaign.due_date), "d 'de' MMMM yyyy")}
                          </p>
                        )}
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Deliverables ── */}
        {deliverables.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Tus entregables</h2>
              {readyDeliverables.length > 0 && (
                <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded-full">{readyDeliverables.length} listo{readyDeliverables.length !== 1 ? "s" : ""}</span>
              )}
            </div>
            <div className="space-y-2">
              {deliverables.map((d, i) => {
                const cfg = DELIVERABLE_STATUS[d.status] || DELIVERABLE_STATUS.pending;
                const Icon = cfg.icon;
                return (
                  <motion.div key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="luxury-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", cfg.color.replace("text-", "bg-").replace(/text-\S+/, "") + " bg-muted/30")}>
                            <Icon className={cn("h-4 w-4", cfg.color)} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{d.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(d as any).campaigns?.name}
                              {d.due_date && ` · ${format(new Date(d.due_date), "d MMM")}`}
                            </p>
                          </div>
                        </div>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", cfg.color)}>
                          {cfg.label}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Upcoming content ── */}
        {calendarItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Contenido próximo</h2>
            </div>
            <Card className="luxury-card divide-y divide-border">
              {calendarItems.map((item, i) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
                      {PLATFORM_ICON[(item as any).platform] || <CalendarDays className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{(item as any).content_type} · {(item as any).platform}</p>
                      {(item as any).caption && (
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{(item as any).caption}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date((item as any).scheduled_date), "d MMM")}
                  </span>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* ── Invoices ── */}
        {invoices.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Facturación</h2>
            </div>
            <div className="space-y-2">
              {invoices.map((inv, i) => {
                const cfg = INVOICE_STATUS[inv.status] || INVOICE_STATUS.sent;
                return (
                  <motion.div key={inv.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Card className="luxury-card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Factura {inv.invoice_number}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {inv.due_date ? `Vence ${format(new Date(inv.due_date), "d MMM yyyy")}` : format(new Date(inv.created_at), "d MMM yyyy")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">${(inv.total || 0).toLocaleString()}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", cfg.color)}>
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

        {/* ── Empty state — no campaigns yet ── */}
        {!campaignsLoading && campaigns.length === 0 && (
          <Card className="luxury-card p-12 text-center">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">Tu proyecto está en camino</h3>
            <p className="text-sm text-muted-foreground">
              En cuanto tu equipo arranque la producción, verás el progreso aquí.
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
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Contenido: </span>{(reviewApproval as any).tasks?.title || "—"}</p>
                <p><span className="text-muted-foreground">Campaña: </span>{(reviewApproval as any).campaigns?.name || "—"}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Comentarios (opcional)</label>
                <Textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Si solicitas cambios, descríbelos aquí..."
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
                <p className="text-xs text-center text-muted-foreground">Escribe un comentario para solicitar cambios</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
