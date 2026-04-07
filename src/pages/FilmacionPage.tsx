import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useShotLists, useCreateShotList, useUpdateShotList, useDeleteShotList, useCampaigns } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Camera, Clock, MapPin, Users, Plus, Trash2, Printer, Calendar, PenLine,
  FileStack, Search, Edit2, CheckCircle, Clapperboard,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, isToday, isTomorrow, isPast, parseISO, startOfDay, addDays, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

// ─── Shot Lists Types ────────────────────────────────────────────────────────

type ShotList = Tables<"shot_lists">;

const SHOT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  planned:      { label: "Planificado", color: "bg-blue-500/15 text-blue-500",   icon: Clock },
  "in-progress":{ label: "En progreso", color: "bg-yellow-500/15 text-yellow-500", icon: Clock },
  completed:    { label: "Completado",  color: "bg-green-500/15 text-green-500", icon: CheckCircle },
  cancelled:    { label: "Cancelado",   color: "bg-red-500/15 text-red-500",     icon: Clock },
};

// ─── Call Sheet Types ────────────────────────────────────────────────────────

type CrewMember    = { name: string; role: string; call_time: string; phone: string };
type ScheduleItem  = { time: string; activity: string; notes: string };

type CallSheet = {
  id: string;
  campaign_id: string | null;
  title: string;
  shoot_date: string | null;
  location: string | null;
  call_time: string | null;
  wrap_time: string | null;
  notes: string | null;
  crew: CrewMember[];
  schedule: ScheduleItem[];
  created_at: string;
};

type CallSheetWithCampaign = CallSheet & {
  campaigns: { name: string; clients: { name: string } | null } | null;
};

const EMPTY_CREW: CrewMember     = { name: "", role: "", call_time: "", phone: "" };
const EMPTY_SCHEDULE: ScheduleItem = { time: "", activity: "", notes: "" };

// ─── Call Sheet Hooks ────────────────────────────────────────────────────────

function useCallSheets() {
  return useQuery({
    queryKey: ["call_sheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_sheets")
        .select("*, campaigns(name, clients(name))")
        .order("shoot_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        crew: Array.isArray(d.crew) ? d.crew : [],
        schedule: Array.isArray(d.schedule) ? d.schedule : [],
      })) as CallSheetWithCampaign[];
    },
  });
}

function useCreateCallSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<CallSheet, "id" | "created_at">) => {
      const { data, error } = await supabase.from("call_sheets").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_sheets"] }),
  });
}

function useUpdateCallSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<CallSheet, "id" | "created_at">>) => {
      const { error } = await supabase.from("call_sheets").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_sheets"] }),
  });
}

function useDeleteCallSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("call_sheets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_sheets"] }),
  });
}

// ─── Call Sheet Helpers ──────────────────────────────────────────────────────

function getShootDateClass(shootDate: string | null) {
  if (!shootDate) return "";
  const date = parseISO(shootDate);
  if (isToday(date))  return "border-green-500/50 bg-green-500/5";
  if (isTomorrow(date)) return "border-yellow-500/50 bg-yellow-500/5";
  if (isPast(startOfDay(date))) return "opacity-60";
  return "";
}

function getShootDateBadge(shootDate: string | null): { label: string; color: string } | null {
  if (!shootDate) return null;
  const date = parseISO(shootDate);
  if (isToday(date))  return { label: "Hoy",    color: "bg-green-500/15 text-green-500" };
  if (isTomorrow(date)) return { label: "Mañana", color: "bg-yellow-500/15 text-yellow-500" };
  if (isPast(startOfDay(date))) return { label: "Pasado", color: "bg-muted text-muted-foreground" };
  return null;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FilmacionPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clapperboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Filmación</h1>
              <p className="text-sm text-muted-foreground">Planificación y coordinación de producción</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="shot-lists">
          <TabsList className="mb-6">
            <TabsTrigger value="shot-lists" className="gap-2">
              <FileStack className="h-4 w-4" /> Shot Lists
            </TabsTrigger>
            <TabsTrigger value="call-sheets" className="gap-2">
              <Camera className="h-4 w-4" /> Call Sheets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shot-lists">
            <ShotListsTab />
          </TabsContent>

          <TabsContent value="call-sheets">
            <CallSheetsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── Shot Lists Tab ──────────────────────────────────────────────────────────

function ShotListsTab() {
  const { data: shotLists = [], isLoading } = useShotLists();
  const { data: campaigns = [] } = useCampaigns();
  const createShotList = useCreateShotList();
  const updateShotList = useUpdateShotList();
  const deleteShotList = useDeleteShotList();

  const [searchQuery, setSearchQuery]     = useState("");
  const [isDialogOpen, setIsDialogOpen]   = useState(false);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [selectedShotList, setSelectedShotList] = useState<ShotList | null>(null);

  const [formData, setFormData] = useState({
    campaign_id: "",
    title: "",
    description: "",
    location: "",
    scheduled_date: "",
    status: "planned" as const,
  });

  const filtered = shotLists.filter(
    (sl) =>
      sl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sl.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (shotList?: ShotList) => {
    if (shotList) {
      setEditingId(shotList.id);
      setFormData({
        campaign_id: shotList.campaign_id,
        title: shotList.title,
        description: shotList.description || "",
        location: shotList.location || "",
        scheduled_date: shotList.scheduled_date?.split("T")[0] || "",
        status: shotList.status as any,
      });
    } else {
      setEditingId(null);
      setFormData({ campaign_id: "", title: "", description: "", location: "", scheduled_date: "", status: "planned" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.campaign_id) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    try {
      if (editingId) {
        await updateShotList.mutateAsync({ id: editingId, ...formData });
        toast.success("Shot list actualizado");
      } else {
        await createShotList.mutateAsync(formData);
        toast.success("Shot list creado");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este shot list?")) return;
    try {
      await deleteShotList.mutateAsync(id);
      toast.success("Shot list eliminado");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar shot lists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 ml-4" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4" /> Nuevo shot list
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-0 shrink-0">
              <DialogTitle className="font-display">
                {editingId ? "Editar shot list" : "Nuevo shot list"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label>Campaña</Label>
                <Select value={formData.campaign_id} onValueChange={(v) => setFormData((p) => ({ ...p, campaign_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar campaña" /></SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ej: Filmación lanzamiento producto"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe la filmación..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Ej: Estudio A, Centro"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha programada</Label>
                <Input type="date" value={formData.scheduled_date} onChange={(e) => setFormData((p) => ({ ...p, scheduled_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planificado</SelectItem>
                    <SelectItem value="in-progress">En progreso</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="shrink-0 border-t border-border p-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createShotList.isPending || updateShotList.isPending}>
                {editingId ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="luxury-card p-12 text-center">
          <FileStack className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold mb-2">Sin shot lists</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Crea shot lists para organizar los planos de tus sesiones de filmación.
          </p>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" /> Crear shot list
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((shotList, index) => {
            const campaign = campaigns.find((c) => c.id === shotList.campaign_id);
            const StatusIcon = SHOT_STATUS_CONFIG[shotList.status]?.icon || Clock;
            return (
              <motion.div key={shotList.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card
                  className="luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => setSelectedShotList(shotList)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-display font-semibold mb-1">{shotList.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{campaign?.name || "Sin campaña"}</p>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        {shotList.location && (
                          <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {shotList.location}</div>
                        )}
                        {shotList.scheduled_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {format(new Date(shotList.scheduled_date), "MMM d, yyyy")}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${SHOT_STATUS_CONFIG[shotList.status]?.color}`}>
                        <StatusIcon className="h-3 w-3" /> {SHOT_STATUS_CONFIG[shotList.status]?.label}
                      </span>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleOpenDialog(shotList); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(shotList.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedShotList && (
        <Dialog open={!!selectedShotList} onOpenChange={() => setSelectedShotList(null)}>
          <DialogContent className="sm:max-w-xl p-0 flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-4 shrink-0">
              <DialogTitle className="font-display">{selectedShotList.title}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Campaña</p>
                  <p className="font-medium">{campaigns.find((c) => c.id === selectedShotList.campaign_id)?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <p className="font-medium">{SHOT_STATUS_CONFIG[selectedShotList.status]?.label}</p>
                </div>
                {selectedShotList.location && (
                  <div>
                    <p className="text-muted-foreground">Ubicación</p>
                    <p className="font-medium">{selectedShotList.location}</p>
                  </div>
                )}
                {selectedShotList.scheduled_date && (
                  <div>
                    <p className="text-muted-foreground">Fecha programada</p>
                    <p className="font-medium">{format(new Date(selectedShotList.scheduled_date), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>
              {selectedShotList.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Descripción</p>
                  <p className="text-sm">{selectedShotList.description}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Call Sheets Tab ─────────────────────────────────────────────────────────

function CallSheetsTab() {
  const { data: callSheets = [], isLoading } = useCallSheets();
  const { data: campaigns = [] } = useCampaigns();
  const createCallSheet = useCreateCallSheet();
  const updateCallSheet = useUpdateCallSheet();
  const deleteCallSheet = useDeleteCallSheet();

  const [filter, setFilter]           = useState<"upcoming" | "past" | "all">("upcoming");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [viewSheet, setViewSheet]     = useState<CallSheetWithCampaign | null>(null);
  const [editSheet, setEditSheet]     = useState<CallSheetWithCampaign | null>(null);

  const [form, setForm] = useState({
    title: "", campaign_id: "", shoot_date: "", location: "", call_time: "", wrap_time: "", notes: "",
  });
  const [crew, setCrew]         = useState<CrewMember[]>([{ ...EMPTY_CREW }]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([{ ...EMPTY_SCHEDULE }]);

  const [editForm, setEditForm] = useState({
    title: "", campaign_id: "", shoot_date: "", location: "", call_time: "", wrap_time: "", notes: "",
  });
  const [editCrew, setEditCrew]         = useState<CrewMember[]>([]);
  const [editSchedule, setEditSchedule] = useState<ScheduleItem[]>([]);

  const today = startOfDay(new Date());
  const filtered = callSheets.filter((cs) => {
    if (filter === "all") return true;
    if (!cs.shoot_date) return filter === "upcoming";
    const date = startOfDay(parseISO(cs.shoot_date));
    if (filter === "upcoming") return date >= today;
    if (filter === "past")     return date < today;
    return true;
  });

  const upcomingThisWeek = callSheets.filter((cs) => {
    if (!cs.shoot_date) return false;
    const date = parseISO(cs.shoot_date);
    return isWithinInterval(date, { start: today, end: addDays(today, 7) });
  }).length;

  const todayCount = callSheets.filter((cs) => cs.shoot_date && isToday(parseISO(cs.shoot_date))).length;

  const resetForm = () => {
    setForm({ title: "", campaign_id: "", shoot_date: "", location: "", call_time: "", wrap_time: "", notes: "" });
    setCrew([{ ...EMPTY_CREW }]);
    setSchedule([{ ...EMPTY_SCHEDULE }]);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error("El título es obligatorio");
    await createCallSheet.mutateAsync({
      title: form.title.trim(),
      campaign_id: (form.campaign_id && form.campaign_id !== "none") ? form.campaign_id : null,
      shoot_date: form.shoot_date || null,
      location: form.location || null,
      call_time: form.call_time || null,
      wrap_time: form.wrap_time || null,
      notes: form.notes || null,
      crew: crew.filter((c) => c.name.trim()),
      schedule: schedule.filter((s) => s.activity.trim()),
    });
    toast.success("Call sheet creado");
    setShowNewDialog(false);
    resetForm();
  };

  const openEdit = (sheet: CallSheetWithCampaign) => {
    setViewSheet(null);
    setEditSheet(sheet);
    setEditForm({
      title: sheet.title,
      campaign_id: sheet.campaign_id ?? "",
      shoot_date: sheet.shoot_date ?? "",
      location: sheet.location ?? "",
      call_time: sheet.call_time ?? "",
      wrap_time: sheet.wrap_time ?? "",
      notes: sheet.notes ?? "",
    });
    setEditCrew(sheet.crew.length > 0 ? [...sheet.crew] : [{ ...EMPTY_CREW }]);
    setEditSchedule(sheet.schedule.length > 0 ? [...sheet.schedule] : [{ ...EMPTY_SCHEDULE }]);
  };

  const handleUpdate = async () => {
    if (!editSheet) return;
    if (!editForm.title.trim()) return toast.error("El título es obligatorio");
    await updateCallSheet.mutateAsync({
      id: editSheet.id,
      title: editForm.title.trim(),
      campaign_id: editForm.campaign_id || null,
      shoot_date: editForm.shoot_date || null,
      location: editForm.location || null,
      call_time: editForm.call_time || null,
      wrap_time: editForm.wrap_time || null,
      notes: editForm.notes || null,
      crew: editCrew.filter((c) => c.name.trim()),
      schedule: editSchedule.filter((s) => s.activity.trim()),
    });
    toast.success("Call sheet actualizado");
    setEditSheet(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este call sheet?")) return;
    await deleteCallSheet.mutateAsync(id);
    setViewSheet(null);
    toast.success("Call sheet eliminado");
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Esta semana", value: upcomingThisWeek, dot: "bg-primary",           sub: "rodajes próximos" },
          { label: "Total",       value: callSheets.length, dot: "bg-muted-foreground", sub: "call sheets" },
          { label: "Hoy",         value: todayCount,        dot: "bg-green-500",         sub: "rodajes hoy" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="luxury-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-display font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.sub}</p>
                </div>
                <span className={cn("w-3 h-3 rounded-full", stat.dot)} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters + New button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "upcoming" ? "Próximos" : f === "past" ? "Pasados" : "Todos"}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo call sheet
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="luxury-card p-12 text-center">
          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold mb-2">
            {callSheets.length === 0 ? "Aún no hay call sheets" : "Sin rodajes en este período"}
          </h3>
          <p className="text-muted-foreground">
            {callSheets.length === 0 ? "Crea tu primer call sheet para un día de filmación." : "Prueba cambiando el filtro."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((sheet, index) => {
            const dateBadge = getShootDateBadge(sheet.shoot_date);
            const dateClass = getShootDateClass(sheet.shoot_date);
            return (
              <motion.div key={sheet.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card
                  className={cn("luxury-card p-5 cursor-pointer hover:border-primary/30 transition-colors border", dateClass)}
                  onClick={() => setViewSheet(sheet)}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{sheet.title}</h3>
                      {sheet.campaigns && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {sheet.campaigns.name}
                          {sheet.campaigns.clients && <span className="text-muted-foreground/60"> · {sheet.campaigns.clients.name}</span>}
                        </p>
                      )}
                    </div>
                    {dateBadge && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0", dateBadge.color)}>
                        {dateBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {sheet.shoot_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{format(parseISO(sheet.shoot_date), "EEEE, MMM d yyyy")}</span>
                      </div>
                    )}
                    {sheet.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{sheet.location}</span>
                      </div>
                    )}
                    {sheet.call_time && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Call {sheet.call_time}{sheet.wrap_time && ` → Wrap ${sheet.wrap_time}`}</span>
                      </div>
                    )}
                    {sheet.crew.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{sheet.crew.length} miembro{sheet.crew.length !== 1 ? "s" : ""} de crew</span>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* New Dialog */}
      <Dialog open={showNewDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowNewDialog(open); }}>
        <DialogContent className="sm:max-w-2xl p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="font-display flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Nuevo call sheet
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
            <CallSheetForm form={form} setForm={setForm} campaigns={campaigns} crew={crew} setCrew={setCrew} schedule={schedule} setSchedule={setSchedule} />
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => { setShowNewDialog(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createCallSheet.isPending || !form.title.trim()}>Crear call sheet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      {viewSheet && (
        <Dialog open={!!viewSheet} onOpenChange={() => setViewSheet(null)}>
          <DialogContent className="sm:max-w-2xl p-0 max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 pb-0 shrink-0">
              <DialogTitle className="font-display flex items-center gap-2">
                <Camera className="h-5 w-5 text-primary" /> {viewSheet.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewSheet.campaigns && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Campaña</p>
                    <p className="font-medium">
                      {viewSheet.campaigns.name}
                      {viewSheet.campaigns.clients && <span className="text-muted-foreground ml-1.5">· {viewSheet.campaigns.clients.name}</span>}
                    </p>
                  </div>
                )}
                {viewSheet.shoot_date && (
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Fecha de rodaje</p>
                    <p className="font-medium">{format(parseISO(viewSheet.shoot_date), "EEEE, MMMM d yyyy")}</p>
                  </div>
                )}
                {viewSheet.location && (
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Ubicación</p>
                    <p className="font-medium">{viewSheet.location}</p>
                  </div>
                )}
                {(viewSheet.call_time || viewSheet.wrap_time) && (
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Horarios</p>
                    <p className="font-medium">
                      {viewSheet.call_time && `Call ${viewSheet.call_time}`}
                      {viewSheet.call_time && viewSheet.wrap_time && " → "}
                      {viewSheet.wrap_time && `Wrap ${viewSheet.wrap_time}`}
                    </p>
                  </div>
                )}
                {viewSheet.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Notas</p>
                    <p className="text-sm bg-muted rounded-lg p-3 leading-relaxed">{viewSheet.notes}</p>
                  </div>
                )}
              </div>

              {viewSheet.crew.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-primary" /> Crew ({viewSheet.crew.length})
                  </h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {["Nombre", "Rol", "Hora llamada", "Teléfono"].map((h) => (
                            <th key={h} className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewSheet.crew.map((member, i) => (
                          <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                            <td className="px-3 py-2 font-medium">{member.name}</td>
                            <td className="px-3 py-2 text-muted-foreground">{member.role}</td>
                            <td className="px-3 py-2 font-mono text-xs">{member.call_time}</td>
                            <td className="px-3 py-2 text-muted-foreground">{member.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {viewSheet.schedule.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" /> Horario del día
                  </h3>
                  <div className="space-y-2">
                    {viewSheet.schedule.map((item, i) => (
                      <div key={i} className="flex gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="font-mono text-sm text-primary font-semibold w-16 flex-shrink-0 pt-0.5">{item.time}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.activity}</p>
                          {item.notes && <p className="text-xs text-muted-foreground mt-0.5">{item.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5" onClick={() => handleDelete(viewSheet.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => openEdit(viewSheet)}>
                    <PenLine className="h-3.5 w-3.5" /> Editar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editSheet && (
        <Dialog open={!!editSheet} onOpenChange={() => setEditSheet(null)}>
          <DialogContent className="sm:max-w-2xl p-0 max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 pb-0 shrink-0">
              <DialogTitle className="font-display flex items-center gap-2">
                <PenLine className="h-5 w-5 text-primary" /> Editar call sheet
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
              <CallSheetForm form={editForm} setForm={setEditForm} campaigns={campaigns} crew={editCrew} setCrew={setEditCrew} schedule={editSchedule} setSchedule={setEditSchedule} />
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" onClick={() => setEditSheet(null)}>Cancelar</Button>
                <Button onClick={handleUpdate} disabled={updateCallSheet.isPending || !editForm.title.trim()}>Guardar cambios</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Shared Form Component ────────────────────────────────────────────────────

function CallSheetForm({
  form, setForm, campaigns, crew, setCrew, schedule, setSchedule,
}: {
  form: any; setForm: any; campaigns: any[];
  crew: CrewMember[]; setCrew: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  schedule: ScheduleItem[]; setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
}) {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Información básica</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Título</Label>
            <Input placeholder="Ej: Día de rodaje — Campaña Nike Primavera" value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Campaña</Label>
            <Select value={form.campaign_id} onValueChange={(v) => setForm((f: any) => ({ ...f, campaign_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Seleccionar campaña..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin campaña</SelectItem>
                {campaigns.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.clients?.name && <span className="text-muted-foreground ml-1.5">· {c.clients.name}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Fecha de rodaje</Label>
            <Input type="date" value={form.shoot_date} onChange={(e) => setForm((f: any) => ({ ...f, shoot_date: e.target.value }))} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Ubicación</Label>
            <Input placeholder="Dirección o nombre del estudio" value={form.location} onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Hora de llamada</Label>
            <Input type="time" value={form.call_time} onChange={(e) => setForm((f: any) => ({ ...f, call_time: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Hora de cierre</Label>
            <Input type="time" value={form.wrap_time} onChange={(e) => setForm((f: any) => ({ ...f, wrap_time: e.target.value }))} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Notas generales</Label>
            <Textarea placeholder="Notas para el día de rodaje..." value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
        </div>
      </div>
      <CrewSection crew={crew} setCrew={setCrew} />
      <ScheduleSection schedule={schedule} setSchedule={setSchedule} />
    </>
  );
}

// ─── Crew & Schedule Sub-components ─────────────────────────────────────────

function CrewSection({ crew, setCrew }: { crew: CrewMember[]; setCrew: React.Dispatch<React.SetStateAction<CrewMember[]>> }) {
  const update = (index: number, field: keyof CrewMember, value: string) => {
    setCrew((prev) => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Crew
        </h3>
        <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-xs"
          onClick={() => setCrew((prev) => [...prev, { name: "", role: "", call_time: "", phone: "" }])}>
          <Plus className="h-3 w-3" /> Agregar miembro
        </Button>
      </div>
      <div className="space-y-2">
        {crew.map((member, i) => (
          <div key={i} className="grid grid-cols-9 gap-2 items-center">
            <Input className="col-span-2" placeholder="Nombre" value={member.name} onChange={(e) => update(i, "name", e.target.value)} />
            <Input className="col-span-2" placeholder="Rol" value={member.role} onChange={(e) => update(i, "role", e.target.value)} />
            <Input className="col-span-2" type="time" value={member.call_time} onChange={(e) => update(i, "call_time", e.target.value)} />
            <Input className="col-span-2" placeholder="Teléfono" value={member.phone} onChange={(e) => update(i, "phone", e.target.value)} />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setCrew((prev) => prev.filter((_, idx) => idx !== i))} disabled={crew.length === 1}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Columnas: Nombre · Rol · Hora de llamada · Teléfono</p>
    </div>
  );
}

function ScheduleSection({ schedule, setSchedule }: { schedule: ScheduleItem[]; setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>> }) {
  const update = (index: number, field: keyof ScheduleItem, value: string) => {
    setSchedule((prev) => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Horario del día
        </h3>
        <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-xs"
          onClick={() => setSchedule((prev) => [...prev, { time: "", activity: "", notes: "" }])}>
          <Plus className="h-3 w-3" /> Agregar ítem
        </Button>
      </div>
      <div className="space-y-2">
        {schedule.map((item, i) => (
          <div key={i} className="grid grid-cols-9 gap-2 items-start">
            <Input className="col-span-2" type="time" value={item.time} onChange={(e) => update(i, "time", e.target.value)} />
            <Input className="col-span-3" placeholder="Actividad" value={item.activity} onChange={(e) => update(i, "activity", e.target.value)} />
            <Input className="col-span-3" placeholder="Notas (opcional)" value={item.notes} onChange={(e) => update(i, "notes", e.target.value)} />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => setSchedule((prev) => prev.filter((_, idx) => idx !== i))} disabled={schedule.length === 1}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
