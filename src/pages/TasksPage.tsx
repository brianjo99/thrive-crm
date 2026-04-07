import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useCampaigns, useCreateTask } from "@/hooks/useSupabaseData";
import { KanbanView } from "@/components/thrive/KanbanView";
import { TaskList } from "@/components/thrive/TaskCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardList, Search, LayoutGrid, List, CheckCircle, Clock, AlertCircle, Plus, Download, Sparkles, Loader2 } from "lucide-react";
import { isToday, isPast } from "date-fns";
import { toast } from "sonner";
import { exportToCsv } from "@/utils/exportCsv";

const PIPELINE_STAGES = [
  { value: "discovery", label: "Discovery" },
  { value: "pre-production", label: "Pre-producción" },
  { value: "filming", label: "Filmación" },
  { value: "editing", label: "Edición" },
  { value: "review", label: "Revisión" },
  { value: "revisions", label: "Revisiones" },
  { value: "posting", label: "Publicación" },
  { value: "reporting", label: "Reportes" },
  { value: "complete", label: "Completado" },
] as const;

export default function TasksPage() {
  const { data: allTasks = [], isLoading } = useTasks();
  const { data: campaigns = [] } = useCampaigns();
  const createTask = useCreateTask();
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, email");
      return (data || []) as { id: string; display_name: string | null; email: string | null }[];
    },
  });
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [aiTasksLoading, setAiTasksLoading] = useState(false);
  const [aiSuggestedTasks, setAiSuggestedTasks] = useState<{title:string;description:string;priority:string}[]>([]);

  const handleAISuggestTasks = async () => {
    if (!createForm.campaign_id) return toast.error("Selecciona una campaña primero");
    const campaign = campaigns.find(c => c.id === createForm.campaign_id) as any;
    setAiTasksLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "tasks",
          campaignName: campaign?.name || "",
          clientName: campaign?.clients?.name || "",
          stage: createForm.stage,
          description: campaign?.description || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiSuggestedTasks(JSON.parse(data.tasks));
      toast.success("Tareas sugeridas");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiTasksLoading(false); }
  };

  const handleAddAITask = (task: {title:string;description:string;priority:string}) => {
    setCreateForm(p => ({ ...p, title: task.title, priority: task.priority as any }));
    setAiSuggestedTasks([]);
    toast.success("Tarea cargada — edita y guarda");
  };
  const [createForm, setCreateForm] = useState({
    campaign_id: "",
    title: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    assignee: "" as "" | "owner" | "editor" | "videographer" | "client",
    assigned_user_id: "",
    stage: "pre-production" as string,
    due_date: "",
  });

  const handleCreate = async () => {
    if (!createForm.campaign_id || !createForm.title) {
      toast.error("Campaña y título son obligatorios");
      return;
    }
    const campaign = campaigns.find(c => c.id === createForm.campaign_id);
    if (!campaign) return;
    try {
      await createTask.mutateAsync({
        campaign_id: createForm.campaign_id,
        client_id: campaign.client_id,
        title: createForm.title,
        priority: createForm.priority,
        assignee: createForm.assignee || null,
        assigned_user_id: (createForm.assigned_user_id || null) as any,
        stage: createForm.stage as any,
        due_date: createForm.due_date || null,
      });
      toast.success("Tarea creada");
      setIsCreateOpen(false);
      setCreateForm({ campaign_id: "", title: "", priority: "medium", assignee: "", assigned_user_id: "", stage: "pre-production", due_date: "" });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filtered = allTasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCampaign = campaignFilter === "all" || t.campaign_id === campaignFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchCampaign && matchStatus;
  });

  const stats = [
    { label: "Total", value: allTasks.length, icon: ClipboardList, color: "text-muted-foreground" },
    { label: "Para hoy", value: allTasks.filter(t => t.due_date && isToday(new Date(t.due_date))).length, icon: Clock, color: "text-warning" },
    { label: "Vencidas", value: allTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== "complete").length, icon: AlertCircle, color: "text-destructive" },
    { label: "Completadas", value: allTasks.filter(t => t.status === "complete").length, icon: CheckCircle, color: "text-success" },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">Tareas</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => exportToCsv("tareas.csv", allTasks.map(t => ({
                  Título: t.title,
                  Campaña: (t as any).campaigns?.name || "",
                  Cliente: (t as any).clients?.name || "",
                  Estado: t.status,
                  Prioridad: t.priority,
                  Asignado: t.assignee || "",
                  Etapa: t.stage,
                  Vencimiento: t.due_date ? t.due_date.split("T")[0] : "",
                })))}
              >
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" /> Nueva tarea
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90vh]">
                  <DialogHeader className="p-6 pb-0 shrink-0">
                    <DialogTitle className="font-display">Nueva tarea</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
                    {/* AI Suggestions */}
                  {aiSuggestedTasks.length > 0 && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Sugerencias IA — clic para usar</p>
                      {aiSuggestedTasks.map((t, i) => (
                        <button key={i} onClick={() => handleAddAITask(t)}
                          className="w-full text-left p-2 rounded-lg bg-background hover:bg-primary/5 border border-border text-sm transition-colors">
                          <p className="font-medium">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                      <Label>Campaña *</Label>
                      <Select value={createForm.campaign_id} onValueChange={v => setCreateForm(p => ({ ...p, campaign_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar campaña" /></SelectTrigger>
                        <SelectContent>
                          {campaigns.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Título *</Label>
                      <Input
                        value={createForm.title}
                        onChange={e => setCreateForm(p => ({ ...p, title: e.target.value }))}
                        placeholder="Ej: Editar reel de producto"
                        onKeyDown={e => e.key === "Enter" && handleCreate()}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Prioridad</Label>
                        <Select value={createForm.priority} onValueChange={(v: any) => setCreateForm(p => ({ ...p, priority: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baja</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Asignado a (rol)</Label>
                        <Select value={createForm.assignee} onValueChange={(v: any) => setCreateForm(p => ({ ...p, assignee: v }))}>
                          <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="videographer">Videógrafo</SelectItem>
                            <SelectItem value="client">Cliente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Etapa</Label>
                      <Select value={createForm.stage} onValueChange={v => setCreateForm(p => ({ ...p, stage: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PIPELINE_STAGES.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {profiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Asignar a persona</Label>
                        <Select value={createForm.assigned_user_id} onValueChange={v => setCreateForm(p => ({ ...p, assigned_user_id: v }))}>
                          <SelectTrigger><SelectValue placeholder="Sin persona asignada" /></SelectTrigger>
                          <SelectContent>
                            {profiles.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.display_name || p.email || p.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Fecha límite</Label>
                      <Input
                        type="date"
                        value={createForm.due_date}
                        onChange={e => setCreateForm(p => ({ ...p, due_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 border-t border-border p-4 flex justify-between gap-3">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleAISuggestTasks} disabled={aiTasksLoading || !createForm.campaign_id}>
                      {aiTasksLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando...</> : <><Sparkles className="h-3.5 w-3.5" /> Sugerir con IA</>}
                    </Button>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                      <Button onClick={handleCreate} disabled={createTask.isPending}>Crear tarea</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={view === "kanban" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2 gap-1.5"
                  onClick={() => setView("kanban")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                </Button>
                <Button
                  variant={view === "list" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2 gap-1.5"
                  onClick={() => setView("list")}
                >
                  <List className="h-3.5 w-3.5" /> Lista
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar tareas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-8" />
            </div>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="Todas las campañas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las campañas</SelectItem>
                {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Por hacer</SelectItem>
                <SelectItem value="in-progress">En progreso</SelectItem>
                <SelectItem value="review">En revisión</SelectItem>
                <SelectItem value="complete">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <Card key={stat.label} className="luxury-card p-4">
              <div className="flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-display font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Cargando tareas...</div>
        ) : filtered.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron tareas</p>
          </Card>
        ) : view === "kanban" ? (
          <KanbanView tasks={filtered} />
        ) : (
          <Card className="luxury-card p-5">
            <TaskList tasks={filtered} />
          </Card>
        )}
      </main>
    </div>
  );
}
