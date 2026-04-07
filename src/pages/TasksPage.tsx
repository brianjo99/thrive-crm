import { useState } from "react";
import { useTasks, useCampaigns } from "@/hooks/useSupabaseData";
import { KanbanView } from "@/components/thrive/KanbanView";
import { TaskList } from "@/components/thrive/TaskCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Search, LayoutGrid, List, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { isToday, isPast } from "date-fns";

export default function TasksPage() {
  const { data: allTasks = [], isLoading } = useTasks();
  const { data: campaigns = [] } = useCampaigns();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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
