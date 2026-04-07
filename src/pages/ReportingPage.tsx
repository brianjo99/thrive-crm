import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useCampaigns, useClients, useApprovals } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3, DollarSign, TrendingUp, Users, FolderKanban,
  CheckCircle, Clock, AlertCircle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const STAGE_ORDER = ["discovery","pre-production","filming","editing","review","revisions","posting","reporting","complete"];

function useInvoiceStats() {
  return useQuery({
    queryKey: ["invoice_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices" as any)
        .select("total, status");
      if (error) throw error;
      const rows = (data || []) as { total: number; status: string }[];
      const totalInvoiced = rows.reduce((s, r) => s + (r.total || 0), 0);
      const totalPaid = rows.filter(r => r.status === "paid").reduce((s, r) => s + (r.total || 0), 0);
      const totalPending = rows.filter(r => r.status === "sent").reduce((s, r) => s + (r.total || 0), 0);
      const totalOverdue = rows.filter(r => r.status === "overdue").reduce((s, r) => s + (r.total || 0), 0);
      const count = { total: rows.length, paid: 0, sent: 0, overdue: 0, draft: 0 };
      rows.forEach(r => { if (r.status in count) (count as any)[r.status]++; });
      return { totalInvoiced, totalPaid, totalPending, totalOverdue, count };
    },
  });
}

function useClientProfitability() {
  return useQuery({
    queryKey: ["client_profitability"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("total, status, client_id, clients(name)");
      if (error) throw error;
      const rows = (data || []) as { total: number; status: string; client_id: string; clients: { name: string } | null }[];
      const map: Record<string, { name: string; invoiced: number; paid: number; pending: number; count: number }> = {};
      rows.forEach(r => {
        const id = r.client_id;
        if (!id) return;
        if (!map[id]) map[id] = { name: r.clients?.name || "Desconocido", invoiced: 0, paid: 0, pending: 0, count: 0 };
        map[id].invoiced += r.total || 0;
        map[id].count++;
        if (r.status === "paid") map[id].paid += r.total || 0;
        if (r.status === "sent" || r.status === "overdue") map[id].pending += r.total || 0;
      });
      return Object.entries(map)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.invoiced - a.invoiced);
    },
  });
}

function useLeadStats() {
  return useQuery({
    queryKey: ["lead_stats"],
    queryFn: async () => {
      const { data } = await supabase.from("leads" as any).select("status");
      const rows = (data || []) as { status: string }[];
      return {
        total: rows.length,
        new: rows.filter(r => r.status === "new").length,
        contacted: rows.filter(r => r.status === "contacted").length,
        converted: rows.filter(r => r.status === "converted").length,
        closed: rows.filter(r => r.status === "closed").length,
      };
    },
  });
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function ReportingPage() {
  const { data: invoices } = useInvoiceStats();
  const { data: clientProfit = [] } = useClientProfitability();
  const { data: leads } = useLeadStats();
  const { data: allTasks = [] } = useTasks();
  const { data: campaigns = [] } = useCampaigns();
  const { data: clients = [] } = useClients();
  const { data: approvals = [] } = useApprovals();

  const activeCampaigns = campaigns.filter(c => c.current_stage !== "complete");
  const completedCampaigns = campaigns.filter(c => c.current_stage === "complete");

  // Tasks by status
  const taskStats = {
    total: allTasks.length,
    complete: allTasks.filter(t => t.status === "complete").length,
    inProgress: allTasks.filter(t => t.status === "in-progress").length,
    pending: allTasks.filter(t => t.status === "pending").length,
    review: allTasks.filter(t => t.status === "review").length,
  };
  const completionRate = taskStats.total > 0 ? Math.round((taskStats.complete / taskStats.total) * 100) : 0;

  // Campaigns by stage
  const stageBreakdown = STAGE_ORDER.map(stage => ({
    stage,
    label: stage.replace("-", " "),
    count: campaigns.filter(c => c.current_stage === stage).length,
  })).filter(s => s.count > 0);

  // Tasks by assignee
  const byAssignee = ["owner", "editor", "videographer", "client"].map(role => ({
    role,
    label: role === "videographer" ? "Videógrafo" : role === "owner" ? "Owner" : role === "editor" ? "Editor" : "Cliente",
    total: allTasks.filter(t => t.assignee === role).length,
    done: allTasks.filter(t => t.assignee === role && t.status === "complete").length,
  })).filter(r => r.total > 0);

  // Approval stats
  const approvalStats = {
    total: approvals.length,
    pending: approvals.filter(a => a.status === "pending").length,
    approved: approvals.filter(a => a.status === "approved").length,
    revision: approvals.filter(a => a.status === "revision-requested").length,
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Reportes</h1>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Revenue */}
        <section>
          <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" /> Facturación
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total facturado", value: fmt(invoices?.totalInvoiced || 0), sub: `${invoices?.count.total || 0} facturas`, color: "text-foreground", bg: "bg-primary/10", icon: DollarSign, iconColor: "text-primary" },
              { label: "Cobrado", value: fmt(invoices?.totalPaid || 0), sub: `${invoices?.count.paid || 0} pagadas`, color: "text-success", bg: "bg-success/10", icon: CheckCircle, iconColor: "text-success" },
              { label: "Por cobrar", value: fmt(invoices?.totalPending || 0), sub: `${invoices?.count.sent || 0} enviadas`, color: "text-blue-400", bg: "bg-blue-500/10", icon: Clock, iconColor: "text-blue-400" },
              { label: "Vencido", value: fmt(invoices?.totalOverdue || 0), sub: `${invoices?.count.overdue || 0} vencidas`, color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle, iconColor: "text-destructive" },
            ].map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="luxury-card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", card.bg)}>
                      <card.icon className={cn("h-4 w-4", card.iconColor)} />
                    </div>
                  </div>
                  <p className={cn("text-2xl font-display font-bold", card.color)}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Rentabilidad por cliente */}
        {clientProfit.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Rentabilidad por cliente
            </h2>
            <Card className="luxury-card p-5">
              <div className="space-y-4">
                {clientProfit.map((client, i) => {
                  const paidPct = client.invoiced > 0 ? Math.round((client.paid / client.invoiced) * 100) : 0;
                  const topInvoiced = clientProfit[0]?.invoiced || 1;
                  const barWidth = Math.round((client.invoiced / topInvoiced) * 100);
                  return (
                    <motion.div key={client.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                          <span className="font-medium">{client.name}</span>
                          <span className="text-xs text-muted-foreground">{client.count} factura{client.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-success text-xs">{fmt(client.paid)} cobrado</span>
                          {client.pending > 0 && <span className="text-blue-400 text-xs">{fmt(client.pending)} pendiente</span>}
                          <span className="font-bold">{fmt(client.invoiced)}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary/30 relative" style={{ width: `${barWidth}%` }}>
                          <div className="absolute inset-y-0 left-0 bg-success rounded-full" style={{ width: `${paidPct}%` }} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
                Barra verde = cobrado · barra gris = total facturado
              </p>
            </Card>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Campaigns by stage */}
            <Card className="luxury-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <FolderKanban className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Campañas por etapa</h2>
                <span className="ml-auto text-sm text-muted-foreground">{campaigns.length} total</span>
              </div>
              {stageBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin campañas activas</p>
              ) : (
                <div className="space-y-3">
                  {stageBreakdown.map(({ stage, label, count }) => (
                    <div key={stage}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-muted-foreground">{label}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <Progress value={(count / campaigns.length) * 100} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Lead funnel */}
            <Card className="luxury-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-success" />
                <h2 className="font-display text-lg font-semibold">Embudo de leads</h2>
                <span className="ml-auto text-sm text-muted-foreground">{leads?.total || 0} total</span>
              </div>
              {(leads?.total || 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin leads todavía</p>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Nuevos", value: leads?.new || 0, color: "bg-blue-500", textColor: "text-blue-400" },
                    { label: "Contactados", value: leads?.contacted || 0, color: "bg-yellow-500", textColor: "text-yellow-400" },
                    { label: "Convertidos", value: leads?.converted || 0, color: "bg-green-500", textColor: "text-green-400" },
                    { label: "Cerrados", value: leads?.closed || 0, color: "bg-muted-foreground", textColor: "text-muted-foreground" },
                  ].map(({ label, value, color, textColor }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={cn("font-medium", textColor)}>{value}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", color)}
                          style={{ width: leads?.total ? `${(value / leads.total) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                  ))}
                  {(leads?.total || 0) > 0 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Tasa de conversión: <span className="text-success font-medium">
                        {Math.round(((leads?.converted || 0) / (leads?.total || 1)) * 100)}%
                      </span>
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Tasks by assignee */}
            {byAssignee.length > 0 && (
              <Card className="luxury-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Tareas por rol</h2>
                </div>
                <div className="space-y-3">
                  {byAssignee.map(({ role, label, total, done }) => {
                    const rate = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div key={role}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{done}/{total} <span className="text-xs text-muted-foreground">({rate}%)</span></span>
                        </div>
                        <Progress value={rate} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Summary stats */}
            <Card className="luxury-card p-5">
              <h3 className="font-display font-semibold mb-4">Resumen general</h3>
              <div className="space-y-3">
                {[
                  { label: "Clientes", value: clients.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
                  { label: "Campañas activas", value: activeCampaigns.length, icon: FolderKanban, color: "text-accent", bg: "bg-accent/10" },
                  { label: "Campañas completadas", value: completedCampaigns.length, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
                  { label: "Leads convertidos", value: leads?.converted || 0, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", item.bg)}>
                        <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                      </div>
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-bold">{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Task completion */}
            <Card className="luxury-card p-5">
              <h3 className="font-display font-semibold mb-1">Tareas</h3>
              <p className="text-3xl font-display font-bold text-primary mb-1">{completionRate}%</p>
              <p className="text-xs text-muted-foreground mb-4">tasa de completado</p>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Completadas", value: taskStats.complete, color: "text-success" },
                  { label: "En progreso", value: taskStats.inProgress, color: "text-yellow-400" },
                  { label: "En revisión", value: taskStats.review, color: "text-blue-400" },
                  { label: "Pendientes", value: taskStats.pending, color: "text-muted-foreground" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={cn("font-medium", s.color)}>{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Approvals */}
            <Card className="luxury-card p-5">
              <h3 className="font-display font-semibold mb-3">Aprobaciones</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Pendientes", value: approvalStats.pending, color: "text-warning" },
                  { label: "Aprobadas", value: approvalStats.approved, color: "text-success" },
                  { label: "En revisión", value: approvalStats.revision, color: "text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className={cn("font-medium", s.color)}>{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
