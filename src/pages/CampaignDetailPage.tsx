import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampaigns, useTasks, useCreateTask, useUpdateCampaign, useApprovals, useClients, useAssets, useShotLists, useDeliverables, getAssetPublicUrl, useCampaignCosts, useCreateCost, useDeleteCost, useLogAudit } from "@/hooks/useSupabaseData";
import { DeliverablesPanel } from "@/components/thrive/DeliverablesPanel";
import { WorkflowPipeline } from "@/components/thrive/WorkflowPipeline";
import { TemplateBadge, StatusBadge, ServiceBadge } from "@/components/thrive/Badges";
import { TaskCard } from "@/components/thrive/TaskCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, ArrowRight, Plus, CheckCircle, FolderKanban, AlertTriangle,
  User, Camera, FileText, ImageIcon, Package, Clock, MapPin, Calendar,
  LayoutGrid, Film, Layers, ExternalLink, DollarSign, Trash2, FolderOpen
} from "lucide-react";
import { motion } from "framer-motion";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];
type ServiceType = Database["public"]["Enums"]["service_type"];

// ---- Inline hook: scripts by campaign ----
function useCampaignScripts(campaignId: string) {
  return useQuery({
    queryKey: ["scripts", { campaignId }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scripts")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!campaignId,
  });
}

const SCRIPT_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: "Borrador",    color: "bg-muted text-muted-foreground" },
  review:   { label: "En revisión", color: "bg-yellow-500/15 text-yellow-500" },
  approved: { label: "Aprobado",   color: "bg-success/15 text-success" },
  archived: { label: "Archivado",  color: "bg-muted/50 text-muted-foreground/60" },
};

const APPROVAL_STATUS: Record<string, { label: string; color: string }> = {
  pending:            { label: "Pendiente",         color: "bg-muted text-muted-foreground" },
  approved:           { label: "Aprobado",          color: "bg-success/15 text-success" },
  "revision-requested": { label: "Rev. solicitada", color: "bg-warning/15 text-warning" },
  rejected:           { label: "Rechazado",         color: "bg-destructive/15 text-destructive" },
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: campaigns = [] } = useCampaigns();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({ campaignId: id });
  const { data: clients = [] } = useClients();
  const { data: approvals = [] } = useApprovals({ campaignId: id });
  const { data: assets = [] } = useAssets({ campaignId: id });
  const { data: shotLists = [] } = useShotLists({ campaignId: id });
  const { data: deliverables = [] } = useDeliverables({ campaignId: id });
  const { data: scripts = [] } = useCampaignScripts(id!);
  const { data: stageHistory = [] } = useQuery({
    queryKey: ["campaign_stage_history", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("campaign_stage_history")
        .select("*")
        .eq("campaign_id", id)
        .order("entered_at", { ascending: false });
      if (error) throw error;
      return (data || []) as { id: string; stage: string; entered_at: string }[];
    },
    enabled: !!id,
  });

  const createTask = useCreateTask();
  const updateCampaign = useUpdateCampaign();
  const { data: costs = [] } = useCampaignCosts(id);
  const createCost = useCreateCost();
  const deleteCost = useDeleteCost();
  const logAudit = useLogAudit();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [costForm, setCostForm] = useState({ description: "", amount: "", category: "other", cost_date: new Date().toISOString().split("T")[0] });
  const [showCostForm, setShowCostForm] = useState(false);

  const campaign = campaigns.find(c => c.id === id);
  const client = clients.find(c => c.id === campaign?.client_id);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    stage: "" as PipelineStage | "",
    service_type: "" as ServiceType | "",
  });

  if (!campaign) {
    return (
      <div className="p-6">
        <Card className="luxury-card p-12 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold mb-2">Campaña no encontrada</h3>
          <Button onClick={() => navigate("/campaigns")}>Volver a Campañas</Button>
        </Card>
      </div>
    );
  }

  const stages = campaign.stages || [];
  const currentStageIndex = stages.indexOf(campaign.current_stage);

  // Derived stats
  const completedTasks = tasks.filter(t => t.status === "complete");
  const urgentTasks = tasks.filter(t => t.priority === "urgent" && t.status !== "complete");
  const overdueTasks = tasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== "complete");
  const pendingApprovals = approvals.filter(a => a.status === "pending");
  const blockedItems = [...urgentTasks, ...overdueTasks.filter(t => !urgentTasks.includes(t))];
  const pendingDeliverables = deliverables.filter(d => d.status !== "approved" && d.status !== "delivered");

  const advanceStage = async () => {
    if (currentStageIndex < stages.length - 1) {
      const nextStage = stages[currentStageIndex + 1];
      await updateCampaign.mutateAsync({ id: campaign.id, current_stage: nextStage });
      logAudit.mutate({ action: "advance_stage", resource_type: "campaign", resource_id: campaign.id, resource_name: campaign.name, old_value: { stage: campaign.current_stage }, new_value: { stage: nextStage } });
      toast.success(`Avanzado a ${nextStage}`);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.title || !newTask.stage) return;
    try {
      await createTask.mutateAsync({
        title: newTask.title,
        description: newTask.description || undefined,
        priority: newTask.priority,
        stage: newTask.stage as PipelineStage,
        service_type: (newTask.service_type as ServiceType) || undefined,
        campaign_id: campaign.id,
        client_id: campaign.client_id,
      });
      toast.success("Tarea añadida");
      setNewTask({ title: "", description: "", priority: "medium", stage: "", service_type: "" });
      setIsAddTaskOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const completionPct = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{campaign.name}</h1>
              <button
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                onClick={() => client && navigate(`/clients/${client.id}`)}
              >
                <User className="h-3 w-3" />
                {client?.name || "Cliente desconocido"}
                {client && <ExternalLink className="h-3 w-3" />}
              </button>
            </div>
            <TemplateBadge template={campaign.template} />
          </div>

          {/* Pipeline progress */}
          <div className="flex items-center gap-2 flex-wrap">
            {stages.map((stage, i) => {
              const isActive = stage === campaign.current_stage;
              const isPastStage = currentStageIndex > i;
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" :
                    isPastStage ? "bg-success/20 text-success" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {isPastStage && <CheckCircle className="h-3 w-3 inline mr-1" />}
                    {stage.charAt(0).toUpperCase() + stage.slice(1).replace("-", " ")}
                  </span>
                  {i < stages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="luxury-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Progreso de tareas</p>
            <p className="text-2xl font-bold font-display">{completionPct}%</p>
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{completedTasks.length} / {tasks.length} completadas</p>
          </Card>
          <Card className="luxury-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Aprobaciones pendientes</p>
            <p className={`text-2xl font-bold font-display ${pendingApprovals.length > 0 ? "text-warning" : "text-success"}`}>
              {pendingApprovals.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{approvals.length} total</p>
          </Card>
          <Card className="luxury-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Assets</p>
            <p className="text-2xl font-bold font-display">{assets.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{scripts.length} scripts · {shotLists.length} shot lists</p>
          </Card>
          <Card className="luxury-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Entregas pendientes</p>
            <p className={`text-2xl font-bold font-display ${pendingDeliverables.length > 0 ? "text-warning" : "text-success"}`}>
              {pendingDeliverables.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{deliverables.length} total</p>
          </Card>
        </div>

        {/* ── Needs Attention banner ── */}
        {blockedItems.length > 0 && (
          <Card className="luxury-card p-4 border-l-4 border-l-destructive bg-destructive/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h3 className="font-display font-semibold text-destructive">Requiere atención</h3>
              <span className="text-xs bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">{blockedItems.length}</span>
            </div>
            <div className="space-y-2">
              {blockedItems.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{task.title}</span>
                  <div className="flex items-center gap-2">
                    {task.due_date && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {isToday(new Date(task.due_date)) ? "Hoy" : format(new Date(task.due_date), "MMM d")}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      task.priority === "urgent" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                    }`}>
                      {task.priority === "urgent" ? "Urgente" : "Vencida"}
                    </span>
                  </div>
                </div>
              ))}
              {blockedItems.length > 3 && (
                <p className="text-xs text-muted-foreground">+{blockedItems.length - 3} más</p>
              )}
            </div>
          </Card>
        )}

        {/* ── Action bar ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Inicio {format(new Date(campaign.start_date), "d MMM yyyy")}</span>
            {campaign.due_date && <span>· Cierre {format(new Date(campaign.due_date), "d MMM yyyy")}</span>}
          </div>
          <div className="flex gap-2">
            {currentStageIndex < stages.length - 1 && (
              <Button onClick={advanceStage} className="gap-2">
                Pasar a: {stages[currentStageIndex + 1].charAt(0).toUpperCase() + stages[currentStageIndex + 1].slice(1).replace("-", " ")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Añadir tarea</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">Añadir tarea</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Título</Label>
                    <Input value={newTask.title} onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Título de la tarea" />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Input value={newTask.description} onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="Descripción opcional" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Etapa</Label>
                      <Select value={newTask.stage} onValueChange={(v) => setNewTask(p => ({ ...p, stage: v as PipelineStage }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {stages.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridad</Label>
                      <Select value={newTask.priority} onValueChange={(v) => setNewTask(p => ({ ...p, priority: v as TaskPriority }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baja</SelectItem>
                          <SelectItem value="medium">Media</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de servicio (opcional)</Label>
                    <Select value={newTask.service_type} onValueChange={(v) => setNewTask(p => ({ ...p, service_type: v as ServiceType }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar servicio" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="film">Film</SelectItem>
                        <SelectItem value="edit">Edit</SelectItem>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="report">Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="shrink-0 border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAddTask} disabled={createTask.isPending}>
                    {createTask.isPending ? "Añadiendo..." : "Añadir tarea"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="tasks" className="space-y-4">
              <TabsList>
                <TabsTrigger value="tasks" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Tareas <span className="text-xs opacity-60">({tasks.length})</span>
                </TabsTrigger>
                <TabsTrigger value="production" className="gap-2">
                  <Film className="h-4 w-4" />
                  Producción
                  {(scripts.length + shotLists.length) > 0 && (
                    <span className="text-xs opacity-60">({scripts.length + shotLists.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="assets" className="gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Assets
                  {assets.length > 0 && <span className="text-xs opacity-60">({assets.length})</span>}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Historial
                </TabsTrigger>
                <TabsTrigger value="costos" className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Costos
                  {costs.length > 0 && <span className="text-xs opacity-60">({costs.length})</span>}
                </TabsTrigger>
              </TabsList>

              {/* ── Tasks tab ── */}
              <TabsContent value="tasks" className="space-y-4">
                {tasksLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
                ) : (
                  <>
                    {/* Discovery kickoff card — only shown when campaign is new and empty */}
                    {campaign.current_stage === "discovery" && tasks.length === 0 && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                        <Card className="luxury-card p-5 border-l-4 border-l-primary">
                          <h3 className="font-display font-semibold mb-1">Para arrancar esta campaña</h3>
                          <p className="text-sm text-muted-foreground mb-4">Completa estos pasos para poner en marcha la producción.</p>
                          <div className="space-y-2">
                            {[
                              { label: "Crear el script de contenido", action: () => navigate("/scripts"), cta: "Ir a Scripts" },
                              { label: "Definir el plan de filmación (shot list)", action: () => navigate("/shot-lists"), cta: "Shot Lists" },
                              { label: "Añadir las primeras tareas", action: () => setIsAddTaskOpen(true), cta: "Añadir tarea" },
                            ].map((item, i) => (
                              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <div className="flex items-center gap-2">
                                  <div className="w-4 h-4 rounded border-2 border-muted-foreground/30 shrink-0" />
                                  <span className="text-sm text-muted-foreground">{item.label}</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={item.action}>
                                  {item.cta} <ArrowRight className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </motion.div>
                    )}

                    {stages.map(stage => {
                      const stageTasks = tasks.filter(t => t.stage === stage);
                      if (stageTasks.length === 0 && stage !== campaign.current_stage) return null;
                      return (
                        <motion.div key={stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <Card className={`luxury-card p-5 ${stage === campaign.current_stage ? "border-l-4 border-l-primary" : ""}`}>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-display font-semibold">{stage.charAt(0).toUpperCase() + stage.slice(1).replace("-", " ")}</h3>
                              <div className="flex items-center gap-2">
                                <StatusBadge status={stage} />
                                {stageTasks.length > 0 && (
                                  <span className="text-xs text-muted-foreground">{stageTasks.filter(t => t.status === "complete").length}/{stageTasks.length}</span>
                                )}
                              </div>
                            </div>
                            {stageTasks.length === 0 ? (
                              <div className="flex items-center justify-between py-1">
                                <p className="text-sm text-muted-foreground">Sin tareas en esta etapa</p>
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsAddTaskOpen(true)}>
                                  <Plus className="h-3 w-3" /> Añadir
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {stageTasks.map((task, i) => (
                                  <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                                    <TaskCard task={task} showClient={false} />
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </Card>
                        </motion.div>
                      );
                    })}
                  </>
                )}
              </TabsContent>

              {/* ── Production tab ── */}
              <TabsContent value="production" className="space-y-4">
                {/* Combined empty state — only when BOTH scripts and shot lists are missing */}
                {scripts.length === 0 && shotLists.length === 0 ? (
                  <Card className="luxury-card p-5">
                    <p className="text-sm font-medium mb-1">Sin material de producción</p>
                    <p className="text-xs text-muted-foreground mb-4">Esta campaña aún no tiene scripts ni planes de filmación vinculados.</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/scripts")}>
                        <FileText className="h-3.5 w-3.5" /> Crear script
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate("/shot-lists")}>
                        <Camera className="h-3.5 w-3.5" /> Crear shot list
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    {/* Shot Lists — only render section if exists or shot lists present */}
                    {(shotLists.length > 0) && (
                      <Card className="luxury-card p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-primary" />
                            <h3 className="font-display font-semibold">Shot Lists</h3>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{shotLists.length}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/shot-lists")}>
                            Ver todos <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {shotLists.map((sl, i) => (
                            <motion.div key={sl.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                              <div className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">{sl.title}</p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    {sl.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{sl.location}</span>}
                                    {sl.scheduled_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(sl.scheduled_date), "d MMM")}</span>}
                                    {sl.assigned_to && <span className="flex items-center gap-1"><User className="h-3 w-3" />{sl.assigned_to}</span>}
                                  </div>
                                </div>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ml-3 ${
                                  sl.status === "completed" ? "bg-success/15 text-success" :
                                  sl.status === "in-progress" ? "bg-primary/15 text-primary" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {sl.status === "completed" ? "Listo" : sl.status === "in-progress" ? "En curso" : "Pendiente"}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Scripts — only render section if exists */}
                    {(scripts.length > 0) && (
                      <Card className="luxury-card p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <h3 className="font-display font-semibold">Scripts</h3>
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{scripts.length}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/scripts")}>
                            Ver todos <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {scripts.map((script, i) => (
                            <motion.div key={script.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{script.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">v{script.version} · {format(new Date(script.updated_at), "d MMM yyyy")}</p>
                                </div>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ml-3 ${SCRIPT_STATUS[script.status]?.color}`}>
                                  {SCRIPT_STATUS[script.status]?.label}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Individual empty states — only shown when the OTHER section has content */}
                    {shotLists.length === 0 && scripts.length > 0 && (
                      <div className="flex items-center justify-between px-1 py-2">
                        <span className="text-sm text-muted-foreground">Sin shot lists vinculados</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/shot-lists")}>
                          <Plus className="h-3 w-3" /> Crear shot list
                        </Button>
                      </div>
                    )}
                    {scripts.length === 0 && shotLists.length > 0 && (
                      <div className="flex items-center justify-between px-1 py-2">
                        <span className="text-sm text-muted-foreground">Sin scripts vinculados</span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/scripts")}>
                          <Plus className="h-3 w-3" /> Crear script
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              {/* ── Assets tab ── */}
              <TabsContent value="assets">
                <Card className="luxury-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      <h3 className="font-display font-semibold">Assets de campaña</h3>
                      {assets.length > 0 && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{assets.length}</span>}
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate("/assets")}>
                      {assets.length > 0 ? <><ArrowRight className="h-3 w-3" /> Gestionar</> : <><Plus className="h-3 w-3" /> Subir material</>}
                    </Button>
                  </div>
                  {assets.length === 0 ? (
                    <div className="flex items-center gap-3 py-3 px-1">
                      <ImageIcon className="h-8 w-8 text-muted-foreground/30 shrink-0" />
                      <div>
                        <p className="text-sm text-muted-foreground">Sin material subido aún</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">Sube el material filmado una vez que tengas las sesiones completadas</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {assets.map((asset, i) => {
                        const isImage = asset.file_type?.startsWith("image/");
                        const ext = asset.name.split(".").pop()?.toUpperCase() || "FILE";
                        return (
                          <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                            <div className="rounded-lg overflow-hidden bg-muted/30 group">
                              {isImage ? (
                                <img
                                  src={getAssetPublicUrl(asset.file_path)}
                                  alt={asset.name}
                                  className="w-full aspect-video object-cover"
                                />
                              ) : (
                                <div className="w-full aspect-video flex flex-col items-center justify-center bg-muted/50">
                                  <Film className="h-7 w-7 text-muted-foreground mb-1" />
                                  <span className="text-xs font-mono text-muted-foreground">{ext}</span>
                                </div>
                              )}
                              <div className="p-2">
                                <p className="text-xs font-medium truncate">{asset.name}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(asset.created_at), "d MMM")}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ── History tab ── */}
              <TabsContent value="history">
                <Card className="luxury-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="h-4 w-4 text-primary" />
                    <h3 className="font-display font-semibold">Historial de etapas</h3>
                  </div>
                  {stageHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">Sin cambios de etapa registrados todavía</p>
                      <p className="text-xs text-muted-foreground mt-1">Los cambios futuros de etapa aparecerán aquí</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-4">
                        {stageHistory.map((entry, i) => (
                          <div key={entry.id} className="flex gap-4 relative">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                              <CheckCircle className={`h-3.5 w-3.5 ${i === 0 ? "" : "text-muted-foreground"}`} />
                            </div>
                            <div className="flex-1 pb-1">
                              <p className="text-sm font-medium capitalize">{entry.stage.replace("-", " ")}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(entry.entered_at), "d MMM yyyy · HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </TabsContent>

              {/* ── Costos tab ── */}
              <TabsContent value="costos" className="space-y-4">
                <Card className="luxury-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <h3 className="font-display font-semibold">Registro de costos</h3>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => setShowCostForm(v => !v)}>
                      <Plus className="h-3.5 w-3.5" /> Añadir costo
                    </Button>
                  </div>

                  {showCostForm && (
                    <div className="mb-4 p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs text-muted-foreground">Descripción</label>
                          <Input placeholder="Ej: Renta de equipo" value={costForm.description} onChange={e => setCostForm(f => ({ ...f, description: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Monto (USD)</label>
                          <Input type="number" placeholder="0.00" value={costForm.amount} onChange={e => setCostForm(f => ({ ...f, amount: e.target.value }))} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Categoría</label>
                          <Select value={costForm.category} onValueChange={v => setCostForm(f => ({ ...f, category: v }))}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equipment">Equipo</SelectItem>
                              <SelectItem value="talent">Talento</SelectItem>
                              <SelectItem value="location">Locación</SelectItem>
                              <SelectItem value="editing">Edición</SelectItem>
                              <SelectItem value="advertising">Publicidad</SelectItem>
                              <SelectItem value="other">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Fecha</label>
                          <Input type="date" value={costForm.cost_date} onChange={e => setCostForm(f => ({ ...f, cost_date: e.target.value }))} className="h-8 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={!costForm.description || !costForm.amount || createCost.isPending} onClick={async () => {
                          try {
                            await createCost.mutateAsync({ campaign_id: campaign.id, description: costForm.description, amount: parseFloat(costForm.amount), category: costForm.category, cost_date: costForm.cost_date });
                            logAudit.mutate({ action: "create_cost", resource_type: "campaign", resource_id: campaign.id, resource_name: campaign.name, new_value: { description: costForm.description, amount: costForm.amount } });
                            setCostForm({ description: "", amount: "", category: "other", cost_date: new Date().toISOString().split("T")[0] });
                            setShowCostForm(false);
                            toast.success("Costo registrado");
                          } catch (e: any) { toast.error(e.message); }
                        }}>Guardar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCostForm(false)}>Cancelar</Button>
                      </div>
                    </div>
                  )}

                  {costs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Sin costos registrados</p>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4">
                        {costs.map(cost => (
                          <div key={cost.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 group">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cost.description}</p>
                              <p className="text-xs text-muted-foreground">{cost.category} · {cost.cost_date}</p>
                            </div>
                            <div className="flex items-center gap-3 ml-3 shrink-0">
                              <span className="text-sm font-semibold text-destructive">${cost.amount.toLocaleString()}</span>
                              <button onClick={() => deleteCost.mutate({ id: cost.id, campaignId: campaign.id })} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total costos</span>
                        <span className="font-bold text-destructive">${costs.reduce((s, c) => s + c.amount, 0).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-5">
            {/* Production pipeline */}
            <Card className="luxury-card p-4">
              <h3 className="font-display font-semibold text-sm mb-4">Flujo de producción</h3>
              <WorkflowPipeline
                campaign={campaign}
                tasks={tasks}
                scripts={scripts}
                shotLists={shotLists}
                assets={assets}
                approvals={approvals}
                deliverables={deliverables}
                onNavigate={navigate}
              />
            </Card>

            {/* Client card */}
            {client && (
              <Card className="luxury-card p-4">
                <h3 className="font-display font-semibold text-sm mb-3">Cliente</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{client.name}</p>
                    {client.email && <p className="text-xs text-muted-foreground truncate">{client.email}</p>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(`/clients/${client.id}`)}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-1">
                  {(["film", "edit", "post", "report"] as const).filter(s => client.enabled_services.includes(s)).map(s => (
                    <ServiceBadge key={s} service={s} size="sm" showLabel={false} />
                  ))}
                </div>
              </Card>
            )}

            {/* Campaign info */}
            <Card className="luxury-card p-4">
              <h3 className="font-display font-semibold text-sm mb-3">Info de campaña</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Plantilla</span>
                  <TemplateBadge template={campaign.template} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Etapa actual</span>
                  <StatusBadge status={campaign.current_stage} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inicio</span>
                  <span className="font-medium">{format(new Date(campaign.start_date), "d MMM yyyy")}</span>
                </div>
                {campaign.due_date && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cierre</span>
                    <span className={`font-medium ${isPast(new Date(campaign.due_date)) ? "text-destructive" : ""}`}>
                      {format(new Date(campaign.due_date), "d MMM yyyy")}
                    </span>
                  </div>
                )}
              </div>
              {(campaign as any).drive_folder_url ? (
                <a href={(campaign as any).drive_folder_url} target="_blank" rel="noreferrer" className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-primary hover:underline">
                  <FolderOpen className="h-3.5 w-3.5" /> Carpeta de Drive
                </a>
              ) : (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Carpeta Google Drive</p>
                  <Input
                    className="h-7 text-xs"
                    placeholder="https://drive.google.com/..."
                    onBlur={async e => {
                      const url = e.target.value.trim();
                      if (!url) return;
                      await updateCampaign.mutateAsync({ id: campaign.id, drive_folder_url: url } as any);
                      toast.success("Enlace de Drive guardado");
                    }}
                  />
                </div>
              )}
            </Card>

            {/* Pending approvals */}
            <Card className="luxury-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold text-sm">Aprobaciones</h3>
                {pendingApprovals.length > 0 && (
                  <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full">{pendingApprovals.length} pendiente{pendingApprovals.length !== 1 ? "s" : ""}</span>
                )}
              </div>
              {approvals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Sin aprobaciones aún</p>
              ) : (
                <div className="space-y-2">
                  {approvals.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="truncate text-xs">{(a as any).tasks?.title || "Tarea"}</span>
                      <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full ml-2 ${APPROVAL_STATUS[a.status]?.color}`}>
                        {APPROVAL_STATUS[a.status]?.label}
                      </span>
                    </div>
                  ))}
                  {approvals.length > 5 && (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => navigate("/approvals")}
                    >
                      Ver todas ({approvals.length})
                    </button>
                  )}
                </div>
              )}
            </Card>

            {/* Deliverables */}
            <div>
              <p className="text-xs text-muted-foreground px-1 mb-2">
                Los entregables son los outputs finales que se entregan al cliente: videos, imágenes, reportes, reels, etc.
              </p>
              <DeliverablesPanel campaignId={campaign.id} editable={true} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
