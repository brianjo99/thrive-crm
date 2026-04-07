import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useCampaigns } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2,
  Instagram, Youtube, Facebook, Linkedin, Twitter, Edit2
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type ContentStatus = "draft" | "scheduled" | "posted" | "cancelled";
type Platform = "Instagram" | "TikTok" | "YouTube" | "Facebook" | "LinkedIn" | "Twitter" | "Pinterest";
type ContentType = "Reel" | "Post" | "Story" | "Short" | "Video" | "Carousel";

type CalendarEntry = {
  id: string;
  campaign_id: string | null;
  client_id: string | null;
  platform: Platform;
  scheduled_date: string;
  content_type: ContentType;
  status: ContentStatus;
  caption: string | null;
  hashtags: string | null;
  notes: string | null;
  asset_url: string | null;
  created_at: string;
};

// ---------- Config ----------
const PLATFORM_CONFIG: Record<Platform, { color: string; bg: string; icon: React.ReactNode }> = {
  Instagram: { color: "text-pink-400", bg: "bg-pink-500/15", icon: <Instagram className="h-3 w-3" /> },
  TikTok:    { color: "text-white",    bg: "bg-zinc-700",    icon: <span className="text-xs font-black leading-none">TT</span> },
  YouTube:   { color: "text-red-400",  bg: "bg-red-500/15",  icon: <Youtube className="h-3 w-3" /> },
  Facebook:  { color: "text-blue-400", bg: "bg-blue-500/15", icon: <Facebook className="h-3 w-3" /> },
  LinkedIn:  { color: "text-sky-400",  bg: "bg-sky-500/15",  icon: <Linkedin className="h-3 w-3" /> },
  Twitter:   { color: "text-slate-300",bg: "bg-slate-500/15",icon: <Twitter className="h-3 w-3" /> },
  Pinterest: { color: "text-rose-400", bg: "bg-rose-500/15", icon: <span className="text-xs font-black leading-none">P</span> },
};

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; dot: string }> = {
  draft:     { label: "Borrador",    color: "bg-muted text-muted-foreground",   dot: "bg-muted-foreground" },
  scheduled: { label: "Programado",  color: "bg-blue-500/15 text-blue-400",     dot: "bg-blue-400" },
  posted:    { label: "Publicado",   color: "bg-green-500/15 text-green-400",   dot: "bg-green-400" },
  cancelled: { label: "Cancelado",   color: "bg-red-500/15 text-red-400",       dot: "bg-red-400" },
};

const PLATFORMS: Platform[] = ["Instagram", "TikTok", "YouTube", "Facebook", "LinkedIn", "Twitter", "Pinterest"];
const CONTENT_TYPES: ContentType[] = ["Reel", "Post", "Story", "Short", "Video", "Carousel"];
const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// ---------- Local Hooks ----------
function useContentCalendar(month: Date) {
  const start = format(startOfMonth(month), "yyyy-MM-dd");
  const end = format(endOfMonth(month), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["content_calendar", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_calendar")
        .select("*")
        .gte("scheduled_date", start)
        .lte("scheduled_date", end)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as CalendarEntry[];
    },
  });
}

function useCreateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<CalendarEntry, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("content_calendar")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_calendar"] }),
  });
}

function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CalendarEntry>) => {
      const { error } = await supabase.from("content_calendar").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_calendar"] }),
  });
}

function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("content_calendar").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content_calendar"] }),
  });
}

// ---------- Form State ----------
type FormState = {
  client_id: string;
  campaign_id: string;
  platform: Platform | "";
  content_type: ContentType | "";
  scheduled_date: string;
  caption: string;
  hashtags: string;
  notes: string;
  status: ContentStatus;
};

const EMPTY_FORM: FormState = {
  client_id: "",
  campaign_id: "",
  platform: "",
  content_type: "",
  scheduled_date: "",
  caption: "",
  hashtags: "",
  notes: "",
  status: "draft",
};

// ---------- Entry Pill ----------
function EntryPill({ entry, clientName, onClick }: { entry: CalendarEntry; clientName: string; onClick: () => void }) {
  const platform = PLATFORM_CONFIG[entry.platform];
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn("w-full text-left rounded px-1.5 py-0.5 flex items-center gap-1 text-xs transition-opacity hover:opacity-80", platform.bg)}
    >
      <span className={cn("flex-shrink-0", platform.color)}>{platform.icon}</span>
      <span className={cn("truncate font-medium", platform.color)}>{clientName}</span>
      <span className={cn("ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0", STATUS_CONFIG[entry.status].dot)} />
    </button>
  );
}

// ---------- Main Page ----------
export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<CalendarEntry | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: entries = [], isLoading } = useContentCalendar(currentMonth);
  const { data: clients = [] } = useClients();
  const { data: campaigns = [] } = useCampaigns();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const paddedDays: (Date | null)[] = [...Array(startPadding).fill(null), ...calendarDays];

  // Stats
  const scheduled = entries.filter(e => e.status === "scheduled").length;
  const posted = entries.filter(e => e.status === "posted").length;
  const drafts = entries.filter(e => e.status === "draft").length;
  const platformCounts = PLATFORMS.map(p => ({ name: p, count: entries.filter(e => e.platform === p).length })).filter(p => p.count > 0);

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.name ?? "—";

  const filteredCampaigns = campaigns.filter(c => !form.client_id || c.client_id === form.client_id);

  const openNew = (date?: Date) => {
    setEditEntry(null);
    setForm({ ...EMPTY_FORM, scheduled_date: date ? format(date, "yyyy-MM-dd") : "" });
    setDialogOpen(true);
  };

  const openEdit = (entry: CalendarEntry) => {
    setEditEntry(entry);
    setForm({
      client_id: entry.client_id ?? "",
      campaign_id: entry.campaign_id ?? "",
      platform: entry.platform,
      content_type: entry.content_type,
      scheduled_date: entry.scheduled_date,
      caption: entry.caption ?? "",
      hashtags: entry.hashtags ?? "",
      notes: entry.notes ?? "",
      status: entry.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.platform || !form.content_type || !form.scheduled_date) {
      toast.error("Platform, content type, and date are required.");
      return;
    }
    const payload = {
      client_id: form.client_id || null,
      campaign_id: form.campaign_id || null,
      platform: form.platform as Platform,
      content_type: form.content_type as ContentType,
      scheduled_date: form.scheduled_date,
      caption: form.caption || null,
      hashtags: form.hashtags || null,
      notes: form.notes || null,
      asset_url: null,
      status: form.status,
    };
    try {
      if (editEntry) {
        await updateEntry.mutateAsync({ id: editEntry.id, ...payload });
        toast.success("Post updated");
      } else {
        await createEntry.mutateAsync(payload);
        toast.success("Post scheduled");
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!editEntry) return;
    if (!confirm("Delete this post?")) return;
    await deleteEntry.mutateAsync(editEntry.id);
    setDialogOpen(false);
    toast.success("Post deleted");
  };

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Content Calendar</h1>
              <p className="text-sm text-muted-foreground">{entries.length} posts this month</p>
            </div>
          </div>
          <Button onClick={() => openNew()} className="gap-2">
            <Plus className="h-4 w-4" /> New Post
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Programados", value: scheduled, color: "text-blue-400" },
            { label: "Publicados",  value: posted,    color: "text-green-400" },
            { label: "Borradores",  value: drafts,    color: "text-muted-foreground" },
            { label: "Total",     value: entries.length, color: "text-primary" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="luxury-card p-4">
                <p className={cn("text-2xl font-display font-bold", stat.color)}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Platform breakdown */}
        {platformCounts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {platformCounts.map(({ name, count }) => {
              const cfg = PLATFORM_CONFIG[name as Platform];
              return (
                <span key={name} className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", cfg.bg, cfg.color)}>
                  {cfg.icon} {name} · {count}
                </span>
              );
            })}
          </div>
        )}

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <Card className="luxury-card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS_OF_WEEK.map(day => (
              <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="p-4">
              <Skeleton className="h-80 w-full rounded-lg" />
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-border">
              {paddedDays.map((day, idx) => {
                const dayEntries = day ? entries.filter(e => isSameDay(new Date(e.scheduled_date + "T00:00:00"), day)) : [];
                const isToday = day ? isSameDay(day, new Date()) : false;
                const isCurrentMonth = day ? isSameMonth(day, currentMonth) : false;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "min-h-[110px] p-1.5 border-b border-border transition-colors",
                      day && "cursor-pointer hover:bg-muted/30",
                      !isCurrentMonth && "opacity-40"
                    )}
                    onClick={() => day && openNew(day)}
                  >
                    {day && (
                      <>
                        <span className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                          isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {format(day, "d")}
                        </span>
                        <div className="space-y-0.5">
                          {dayEntries.slice(0, 3).map(entry => (
                            <EntryPill
                              key={entry.id}
                              entry={entry}
                              clientName={clientName(entry.client_id)}
                              onClick={() => openEdit(entry)}
                            />
                          ))}
                          {dayEntries.length > 3 && (
                            <span className="text-xs text-muted-foreground pl-1">+{dayEntries.length - 3} more</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {(Object.entries(STATUS_CONFIG) as [ContentStatus, typeof STATUS_CONFIG[ContentStatus]][]).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
              {cfg.label}
            </span>
          ))}
        </div>
      </main>

      {/* New / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-display flex items-center gap-2">
              {editEntry ? <><Edit2 className="h-4 w-4" /> Edit Post</> : <><Plus className="h-4 w-4" /> New Post</>}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
            {/* Client */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Client</label>
                <Select value={form.client_id} onValueChange={v => { setField("client_id", v); setField("campaign_id", ""); }}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Campaign */}
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Campaign</label>
                <Select value={form.campaign_id} onValueChange={v => setField("campaign_id", v)} disabled={!form.client_id}>
                  <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>
                    {filteredCampaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Platform + Content Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Platform <span className="text-destructive">*</span></label>
                <Select value={form.platform} onValueChange={v => setField("platform", v as Platform)}>
                  <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p} value={p}>
                        <span className="flex items-center gap-2">
                          <span className={cn("flex items-center", PLATFORM_CONFIG[p].color)}>{PLATFORM_CONFIG[p].icon}</span>
                          {p}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Content Type <span className="text-destructive">*</span></label>
                <Select value={form.content_type} onValueChange={v => setField("content_type", v as ContentType)}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Scheduled Date <span className="text-destructive">*</span></label>
                <Input type="date" value={form.scheduled_date} onChange={e => setField("scheduled_date", e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setField("status", v as ContentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_CONFIG) as ContentStatus[]).map(s => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Caption</label>
              <Textarea
                value={form.caption}
                onChange={e => setField("caption", e.target.value)}
                placeholder="Write your caption..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* Hashtags */}
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Hashtags</label>
              <Input
                value={form.hashtags}
                onChange={e => setField("hashtags", e.target.value)}
                placeholder="#content #agency #brand"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Internal Notes</label>
              <Textarea
                value={form.notes}
                onChange={e => setField("notes", e.target.value)}
                placeholder="Any notes for the team..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              {editEntry ? (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={createEntry.isPending || updateEntry.isPending}
                >
                  {editEntry ? "Save Changes" : "Schedule Post"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
