import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampaigns, useClients } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Camera,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  Printer,
  Calendar,
  PenLine,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  format,
  isToday,
  isTomorrow,
  isPast,
  parseISO,
  startOfDay,
  addDays,
  isWithinInterval,
} from "date-fns";
import { cn } from "@/lib/utils";

type CrewMember = {
  name: string;
  role: string;
  call_time: string;
  phone: string;
};

type ScheduleItem = {
  time: string;
  activity: string;
  notes: string;
};

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
    mutationFn: async (
      input: Omit<CallSheet, "id" | "created_at">
    ) => {
      const { data, error } = await supabase
        .from("call_sheets")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_sheets"] }),
  });
}

function useUpdateCallSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<Omit<CallSheet, "id" | "created_at">>) => {
      const { error } = await supabase
        .from("call_sheets")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_sheets"] }),
  });
}

function useDeleteCallSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("call_sheets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_sheets"] }),
  });
}

function getShootDateClass(shootDate: string | null): string {
  if (!shootDate) return "";
  const date = parseISO(shootDate);
  if (isToday(date)) return "border-green-500/50 bg-green-500/5";
  if (isTomorrow(date)) return "border-yellow-500/50 bg-yellow-500/5";
  if (isPast(startOfDay(date))) return "opacity-60";
  return "";
}

function getShootDateBadge(
  shootDate: string | null
): { label: string; color: string } | null {
  if (!shootDate) return null;
  const date = parseISO(shootDate);
  if (isToday(date))
    return { label: "Hoy", color: "bg-green-500/15 text-green-500" };
  if (isTomorrow(date))
    return { label: "Mañana", color: "bg-yellow-500/15 text-yellow-500" };
  if (isPast(startOfDay(date)))
    return { label: "Pasado", color: "bg-muted text-muted-foreground" };
  return null;
}

const EMPTY_CREW: CrewMember = { name: "", role: "", call_time: "", phone: "" };
const EMPTY_SCHEDULE: ScheduleItem = { time: "", activity: "", notes: "" };

export default function CallSheetsPage() {
  const { data: callSheets = [], isLoading } = useCallSheets();
  const { data: campaigns = [] } = useCampaigns();
  const createCallSheet = useCreateCallSheet();
  const updateCallSheet = useUpdateCallSheet();
  const deleteCallSheet = useDeleteCallSheet();

  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [viewSheet, setViewSheet] = useState<CallSheetWithCampaign | null>(null);
  const [editSheet, setEditSheet] = useState<CallSheetWithCampaign | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    campaign_id: "",
    shoot_date: "",
    location: "",
    call_time: "",
    wrap_time: "",
    notes: "",
  });
  const [crew, setCrew] = useState<CrewMember[]>([{ ...EMPTY_CREW }]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([
    { ...EMPTY_SCHEDULE },
  ]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: "",
    campaign_id: "",
    shoot_date: "",
    location: "",
    call_time: "",
    wrap_time: "",
    notes: "",
  });
  const [editCrew, setEditCrew] = useState<CrewMember[]>([]);
  const [editSchedule, setEditSchedule] = useState<ScheduleItem[]>([]);

  const today = startOfDay(new Date());
  const filtered = callSheets.filter((cs) => {
    if (filter === "all") return true;
    if (!cs.shoot_date) return filter === "upcoming";
    const date = startOfDay(parseISO(cs.shoot_date));
    if (filter === "upcoming") return date >= today;
    if (filter === "past") return date < today;
    return true;
  });

  const upcomingThisWeek = callSheets.filter((cs) => {
    if (!cs.shoot_date) return false;
    const date = parseISO(cs.shoot_date);
    return isWithinInterval(date, { start: today, end: addDays(today, 7) });
  }).length;

  const todayCount = callSheets.filter(
    (cs) => cs.shoot_date && isToday(parseISO(cs.shoot_date))
  ).length;

  const resetForm = () => {
    setForm({
      title: "",
      campaign_id: "",
      shoot_date: "",
      location: "",
      call_time: "",
      wrap_time: "",
      notes: "",
    });
    setCrew([{ ...EMPTY_CREW }]);
    setSchedule([{ ...EMPTY_SCHEDULE }]);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error("El título es obligatorio");
    await createCallSheet.mutateAsync({
      title: form.title.trim(),
      campaign_id: form.campaign_id || null,
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
    setEditCrew(
      sheet.crew.length > 0 ? [...sheet.crew] : [{ ...EMPTY_CREW }]
    );
    setEditSchedule(
      sheet.schedule.length > 0
        ? [...sheet.schedule]
        : [{ ...EMPTY_SCHEDULE }]
    );
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Call Sheets</h1>
                <p className="text-sm text-muted-foreground">
                  Gestión de días de filmación ({callSheets.length} total)
                </p>
              </div>
            </div>
            <Button onClick={() => setShowNewDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo call sheet
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Esta semana",
              value: upcomingThisWeek,
              dot: "bg-primary",
              sub: "rodajes próximos",
            },
            {
              label: "Total",
              value: callSheets.length,
              dot: "bg-muted-foreground",
              sub: "call sheets",
            },
            {
              label: "Hoy",
              value: todayCount,
              dot: "bg-green-500",
              sub: "rodajes hoy",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="luxury-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-display font-bold">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                  <span className={cn("w-3 h-3 rounded-full", stat.dot)} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filter toggle */}
        <div className="flex items-center gap-2">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === "upcoming" ? "Próximos" : f === "past" ? "Pasados" : "Todos"}
            </Button>
          ))}
        </div>

        {/* Call Sheets */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">
              {callSheets.length === 0
                ? "Aún no hay call sheets"
                : "Sin rodajes en este período"}
            </h3>
            <p className="text-muted-foreground">
              {callSheets.length === 0
                ? "Crea tu primer call sheet para un día de filmación."
                : "Prueba cambiando el filtro."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((sheet, index) => {
              const dateBadge = getShootDateBadge(sheet.shoot_date);
              const dateClass = getShootDateClass(sheet.shoot_date);
              return (
                <motion.div
                  key={sheet.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={cn(
                      "luxury-card p-5 cursor-pointer hover:border-primary/30 transition-colors border",
                      dateClass
                    )}
                    onClick={() => setViewSheet(sheet)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold truncate">
                          {sheet.title}
                        </h3>
                        {sheet.campaigns && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {sheet.campaigns.name}
                            {sheet.campaigns.clients && (
                              <span className="text-muted-foreground/60">
                                {" "}
                                · {sheet.campaigns.clients.name}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                      {dateBadge && (
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                            dateBadge.color
                          )}
                        >
                          {dateBadge.label}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-sm">
                      {sheet.shoot_date && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            {format(parseISO(sheet.shoot_date), "EEEE, MMM d yyyy")}
                          </span>
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
                          <span>
                            Call {sheet.call_time}
                            {sheet.wrap_time && ` → Wrap ${sheet.wrap_time}`}
                          </span>
                        </div>
                      )}
                      {sheet.crew.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            {sheet.crew.length} crew member
                            {sheet.crew.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Call Sheet Dialog */}
      <Dialog
        open={showNewDialog}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setShowNewDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-2xl p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="font-display flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Nuevo call sheet
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Información básica
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. Brand Day — Nike Spring Campaign"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Campaign</Label>
                  <Select
                    value={form.campaign_id}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, campaign_id: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar campaña..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin campaña</SelectItem>
                      {(campaigns as any[]).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.clients?.name && (
                            <span className="text-muted-foreground ml-1.5">
                              · {c.clients.name}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Shoot Date</Label>
                  <Input
                    type="date"
                    value={form.shoot_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, shoot_date: e.target.value }))
                    }
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    placeholder="Studio address or location name"
                    value={form.location}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, location: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Call Time</Label>
                  <Input
                    type="time"
                    value={form.call_time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, call_time: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Wrap Time</Label>
                  <Input
                    type="time"
                    value={form.wrap_time}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, wrap_time: e.target.value }))
                    }
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="General notes for the shoot day..."
                    value={form.notes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, notes: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Crew Section */}
            <CrewSection crew={crew} setCrew={setCrew} />

            {/* Schedule Section */}
            <ScheduleSection schedule={schedule} setSchedule={setSchedule} />

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewDialog(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createCallSheet.isPending || !form.title.trim()}
              >
                Crear call sheet
              </Button>
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
                <Camera className="h-5 w-5 text-primary" />
                {viewSheet.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6 print:overflow-visible">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewSheet.campaigns && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Campaign</p>
                    <p className="font-medium">
                      {viewSheet.campaigns.name}
                      {viewSheet.campaigns.clients && (
                        <span className="text-muted-foreground ml-1.5">
                          · {viewSheet.campaigns.clients.name}
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {viewSheet.shoot_date && (
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Shoot Date
                    </p>
                    <p className="font-medium">
                      {format(parseISO(viewSheet.shoot_date), "EEEE, MMMM d yyyy")}
                    </p>
                  </div>
                )}
                {viewSheet.location && (
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Location
                    </p>
                    <p className="font-medium">{viewSheet.location}</p>
                  </div>
                )}
                {(viewSheet.call_time || viewSheet.wrap_time) && (
                  <div>
                    <p className="text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Times
                    </p>
                    <p className="font-medium">
                      {viewSheet.call_time && `Call ${viewSheet.call_time}`}
                      {viewSheet.call_time && viewSheet.wrap_time && " → "}
                      {viewSheet.wrap_time && `Wrap ${viewSheet.wrap_time}`}
                    </p>
                  </div>
                )}
                {viewSheet.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm bg-muted rounded-lg p-3 leading-relaxed">
                      {viewSheet.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Crew */}
              {viewSheet.crew.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-primary" /> Crew (
                    {viewSheet.crew.length})
                  </h3>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {["Name", "Role", "Call Time", "Phone"].map((h) => (
                            <th
                              key={h}
                              className="text-left px-3 py-2 text-xs text-muted-foreground font-medium"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewSheet.crew.map((member, i) => (
                          <tr
                            key={i}
                            className="border-t border-border/50 hover:bg-muted/20"
                          >
                            <td className="px-3 py-2 font-medium">
                              {member.name}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {member.role}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {member.call_time}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {member.phone}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Schedule */}
              {viewSheet.schedule.length > 0 && (
                <div>
                  <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" /> Schedule
                  </h3>
                  <div className="space-y-2">
                    {viewSheet.schedule.map((item, i) => (
                      <div
                        key={i}
                        className="flex gap-4 p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="font-mono text-sm text-primary font-semibold w-16 flex-shrink-0 pt-0.5">
                          {item.time}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.activity}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive gap-1.5"
                  onClick={() => handleDelete(viewSheet.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={handlePrint}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => openEdit(viewSheet)}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Editar
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
                <PenLine className="h-5 w-5 text-primary" />
                Editar call sheet
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Información básica
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <Label>Title</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, title: e.target.value }))
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Campaign</Label>
                    <Select
                      value={editForm.campaign_id}
                      onValueChange={(v) =>
                        setEditForm((f) => ({ ...f, campaign_id: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar campaña..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin campaña</SelectItem>
                        {(campaigns as any[]).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.clients?.name && (
                              <span className="text-muted-foreground ml-1.5">
                                · {c.clients.name}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shoot Date</Label>
                    <Input
                      type="date"
                      value={editForm.shoot_date}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          shoot_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Location</Label>
                    <Input
                      value={editForm.location}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, location: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Call Time</Label>
                    <Input
                      type="time"
                      value={editForm.call_time}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          call_time: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Wrap Time</Label>
                    <Input
                      type="time"
                      value={editForm.wrap_time}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          wrap_time: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <CrewSection crew={editCrew} setCrew={setEditCrew} />
              <ScheduleSection
                schedule={editSchedule}
                setSchedule={setEditSchedule}
              />

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setEditSheet(null)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updateCallSheet.isPending || !editForm.title.trim()}
                >
                  Guardar cambios
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ---- Sub-components ----

function CrewSection({
  crew,
  setCrew,
}: {
  crew: CrewMember[];
  setCrew: React.Dispatch<React.SetStateAction<CrewMember[]>>;
}) {
  const update = (
    index: number,
    field: keyof CrewMember,
    value: string
  ) => {
    setCrew((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Crew
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 h-7 text-xs"
          onClick={() => setCrew((prev) => [...prev, { name: "", role: "", call_time: "", phone: "" }])}
        >
          <Plus className="h-3 w-3" /> Agregar miembro
        </Button>
      </div>
      <div className="space-y-2">
        {crew.map((member, i) => (
          <div key={i} className="grid grid-cols-9 gap-2 items-center">
            <Input
              className="col-span-2"
              placeholder="Name"
              value={member.name}
              onChange={(e) => update(i, "name", e.target.value)}
            />
            <Input
              className="col-span-2"
              placeholder="Role"
              value={member.role}
              onChange={(e) => update(i, "role", e.target.value)}
            />
            <Input
              className="col-span-2"
              type="time"
              value={member.call_time}
              onChange={(e) => update(i, "call_time", e.target.value)}
            />
            <Input
              className="col-span-2"
              placeholder="Phone"
              value={member.phone}
              onChange={(e) => update(i, "phone", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() =>
                setCrew((prev) => prev.filter((_, idx) => idx !== i))
              }
              disabled={crew.length === 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Columnas: Nombre · Rol · Hora de llamada · Teléfono
      </p>
    </div>
  );
}

function ScheduleSection({
  schedule,
  setSchedule,
}: {
  schedule: ScheduleItem[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleItem[]>>;
}) {
  const update = (
    index: number,
    field: keyof ScheduleItem,
    value: string
  ) => {
    setSchedule((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Schedule
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1 h-7 text-xs"
          onClick={() =>
            setSchedule((prev) => [...prev, { time: "", activity: "", notes: "" }])
          }
        >
          <Plus className="h-3 w-3" /> Agregar ítem
        </Button>
      </div>
      <div className="space-y-2">
        {schedule.map((item, i) => (
          <div key={i} className="grid grid-cols-9 gap-2 items-start">
            <Input
              className="col-span-2"
              type="time"
              value={item.time}
              onChange={(e) => update(i, "time", e.target.value)}
            />
            <Input
              className="col-span-3"
              placeholder="Activity"
              value={item.activity}
              onChange={(e) => update(i, "activity", e.target.value)}
            />
            <Input
              className="col-span-3"
              placeholder="Notes (optional)"
              value={item.notes}
              onChange={(e) => update(i, "notes", e.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() =>
                setSchedule((prev) => prev.filter((_, idx) => idx !== i))
              }
              disabled={schedule.length === 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
