import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useUnpaidAlerts, useClients, useCampaigns, useApprovals } from "@/hooks/useSupabaseData";
import { TaskList } from "@/components/thrive/TaskCard";
import { AlertsPanel } from "@/components/thrive/AlertsPanel";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Camera, Scissors, CheckCircle, Send, Clock, Sparkles, TrendingUp,
  Users, FolderKanban, AlertCircle, ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const STAGE_ORDER = ["discovery", "pre-production", "filming", "editing", "review", "revisions", "posting", "reporting", "complete"];

function getStageProgress(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx < 0 ? 0 : Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 17) return "Buenas tardes";
  return "Buenas noches";
}

export default function BrianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: allTasks = [] } = useTasks();
  const { data: alerts = [] } = useUnpaidAlerts();
  const { data: clients = [] } = useClients();
  const { data: campaigns = [] } = useCampaigns();
  const { data: approvals = [] } = useApprovals();
  const { data: leads = [] } = useQuery({
    queryKey: ["leads_count"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, status");
      return data || [];
    },
  });

  const todaysTasks = allTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const tasksToReview = allTasks.filter(t => t.status === "review");
  const approvalsPending = approvals.filter(a => a.status === "pending");
  const contentToPost = allTasks.filter(t => t.stage === "posting" && t.status !== "complete");
  const filmingTasks = todaysTasks.filter(t => t.service_type === "film");
  const overdueTasks = allTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "complete");
  const activeCampaigns = campaigns.filter(c => c.current_stage !== "complete");
  const newLeads = (leads as any[]).filter(l => l.status === "new").length;

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there";

  const stats = [
    { label: "Filmaciones hoy", value: filmingTasks.length, icon: Camera, color: "text-[hsl(200_70%_50%)]", bg: "bg-[hsl(200_70%_50%/0.1)]", onClick: () => navigate("/shot-lists") },
    { label: "Ediciones a revisar", value: tasksToReview.length, icon: Scissors, color: "text-[hsl(280_60%_55%)]", bg: "bg-[hsl(280_60%_55%/0.1)]", onClick: () => {} },
    { label: "Aprobaciones pendientes", value: approvalsPending.length, icon: CheckCircle, color: "text-primary", bg: "bg-primary/10", onClick: () => navigate("/approvals") },
    { label: "Leads nuevos", value: newLeads, icon: TrendingUp, color: "text-success", bg: "bg-success/10", onClick: () => navigate("/leads") },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground capitalize">{format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}</p>
              <h1 className="font-display text-2xl font-bold">
                {getGreeting()}, {displayName}
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(), "h:mm a")}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <AlertsPanel />
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card
                className={cn("luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors", stat.value > 0 && "border-primary/20")}
                onClick={stat.onClick}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="luxury-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Foco del día</h2>
                {overdueTasks.length > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                    <AlertCircle className="h-3 w-3" /> {overdueTasks.length} vencidas
                  </span>
                )}
              </div>
              {todaysTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">¡Todo al día por hoy!</p>
                </div>
              ) : (
                <TaskList tasks={todaysTasks} compact />
              )}
            </Card>

            {/* Active Campaigns Progress */}
            <Card className="luxury-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Campañas activas</h2>
                </div>
                <button
                  onClick={() => navigate("/campaigns")}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Ver todas <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {activeCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin campañas activas</p>
              ) : (
                <div className="space-y-4">
                  {activeCampaigns.slice(0, 5).map(campaign => {
                    const progress = getStageProgress(campaign.current_stage);
                    const client = (campaign as any).clients;
                    return (
                      <div
                        key={campaign.id}
                        className="cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                        onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <p className="text-sm font-medium">{campaign.name}</p>
                            <p className="text-xs text-muted-foreground">{client?.name || "—"}</p>
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">{campaign.current_stage.replace("-", " ")}</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    );
                  })}
                  {activeCampaigns.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">+{activeCampaigns.length - 5} campañas más</p>
                  )}
                </div>
              )}
            </Card>

            {/* Edits to Review */}
            <Card className="luxury-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-[hsl(280_60%_55%)]" />
                  <h2 className="font-display text-lg font-semibold">Ediciones a revisar</h2>
                </div>
                {tasksToReview.length > 0 && (
                  <span className="text-xs bg-[hsl(280_60%_55%/0.15)] text-[hsl(280_60%_50%)] px-2 py-1 rounded-full">
                    {tasksToReview.length} en espera
                  </span>
                )}
              </div>
              <TaskList tasks={tasksToReview} compact emptyMessage="Sin ediciones en espera" />
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card className="luxury-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold">Resumen</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Clientes activos", value: clients.length, icon: Users, color: "text-primary", bg: "bg-primary/10", path: "/clients" },
                  { label: "Campañas totales", value: campaigns.length, icon: FolderKanban, color: "text-accent", bg: "bg-accent/10", path: "/campaigns" },
                  { label: "Aprobaciones pendientes", value: approvalsPending.length, icon: CheckCircle, color: "text-warning", bg: "bg-warning/10", path: "/approvals" },
                  { label: "Campañas activas", value: activeCampaigns.length, icon: Camera, color: "text-[hsl(200_70%_50%)]", bg: "bg-[hsl(200_70%_50%/0.1)]", path: "/campaigns" },
                  { label: "Leads nuevos", value: newLeads, icon: TrendingUp, color: "text-success", bg: "bg-success/10", path: "/leads" },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                    onClick={() => navigate(item.path)}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", item.bg)}>
                        <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                      </div>
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className={cn("font-bold", item.value > 0 && item.label.includes("pendientes") && "text-warning", item.value > 0 && item.label === "Leads nuevos" && "text-success")}>
                      {item.value}
                    </span>
                  </div>
                ))}
                {overdueTasks.length > 0 && (
                  <div className="flex items-center justify-between p-2 -mx-2 rounded-lg bg-destructive/5">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      </div>
                      <span className="text-muted-foreground">Tareas vencidas</span>
                    </div>
                    <span className="font-bold text-destructive">{overdueTasks.length}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Content to Post */}
            <Card className="luxury-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Send className="h-5 w-5 text-success" />
                <h2 className="font-display text-lg font-semibold">Contenido por publicar</h2>
              </div>
              <TaskList tasks={contentToPost} compact emptyMessage="Todo el contenido está publicado" />
            </Card>

            {filmingTasks.length > 0 && (
              <Card className="luxury-card p-5 border-l-4 border-l-[hsl(200_70%_50%)]">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-[hsl(200_70%_50%)]" />
                  <h2 className="font-display text-lg font-semibold">Filmaciones hoy</h2>
                </div>
                <TaskList tasks={filmingTasks} compact />
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
