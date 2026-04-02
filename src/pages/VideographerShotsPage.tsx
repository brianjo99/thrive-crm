import { useState } from "react";
import { useShotLists, useCreateShotList, useUpdateShotList, useDeleteShotList, useCampaigns } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileStack, Plus, Search, Trash2, Edit2, MapPin, Calendar, CheckCircle, Clock, Camera, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type ShotList = Tables<"shot_lists">;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planned: { label: "Planned", color: "text-blue-500", bg: "bg-blue-500/10" },
  "in-progress": { label: "In Progress", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  completed: { label: "Completed", color: "text-green-500", bg: "bg-green-500/10" },
  cancelled: { label: "Cancelled", color: "text-red-500", bg: "bg-red-500/10" },
};

function getDateLabel(dateStr: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isToday(date)) return { label: "Today", urgent: true };
  if (isTomorrow(date)) return { label: "Tomorrow", urgent: false };
  if (isPast(date)) return { label: "Overdue", urgent: true };
  return { label: format(date, "MMM d"), urgent: false };
}

export default function VideographerShotsPage() {
  const { user } = useAuth();
  const { data: allShotLists = [], isLoading } = useShotLists();
  const { data: campaigns = [] } = useCampaigns();
  const createShotList = useCreateShotList();
  const updateShotList = useUpdateShotList();
  const deleteShotList = useDeleteShotList();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedShotList, setSelectedShotList] = useState<ShotList | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState({
    campaign_id: "",
    title: "",
    description: "",
    location: "",
    scheduled_date: "",
    status: "planned" as const,
  });

  const filtered = allShotLists
    .filter(sl => filterStatus === "all" || sl.status === filterStatus)
    .filter(sl =>
      sl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sl.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const todayShots = allShotLists.filter(sl => sl.scheduled_date && isToday(new Date(sl.scheduled_date)));

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
      toast.error("Please fill in required fields");
      return;
    }
    try {
      if (editingId) {
        await updateShotList.mutateAsync({ id: editingId, ...formData });
        toast.success("Shot list updated!");
      } else {
        await createShotList.mutateAsync(formData);
        toast.success("Shot list created!");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this shot list?")) {
      try {
        await deleteShotList.mutateAsync(id);
        toast.success("Deleted!");
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(200_70%_50%/0.15)] flex items-center justify-center">
                <Camera className="h-5 w-5 text-[hsl(200_70%_50%)]" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Shot Lists</h1>
                <p className="text-sm text-muted-foreground">Pre-production planning ({allShotLists.length})</p>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[hsl(200_70%_50%)] hover:bg-[hsl(200_70%_40%)]" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4" /> New Shot List
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">{editingId ? "Edit Shot List" : "New Shot List"}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign *</Label>
                    <Select value={formData.campaign_id} onValueChange={(v) => setFormData(p => ({ ...p, campaign_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                      <SelectContent>
                        {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input value={formData.title} onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Product Launch Shoot" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={formData.location} onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Studio A, Downtown" />
                  </div>
                  <div className="space-y-2">
                    <Label>Scheduled Date</Label>
                    <Input type="date" value={formData.scheduled_date} onChange={(e) => setFormData(p => ({ ...p, scheduled_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe the shoot..." rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v: any) => setFormData(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="sticky bottom-0 bg-background border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleSave}
                    disabled={createShotList.isPending || updateShotList.isPending}
                    className="bg-[hsl(200_70%_50%)] hover:bg-[hsl(200_70%_40%)]"
                  >
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {todayShots.length > 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-[hsl(200_70%_50%)] animate-pulse" />
              <span className="text-[hsl(200_70%_50%)] font-medium">{todayShots.length} shoot{todayShots.length > 1 ? "s" : ""} today</span>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search shot lists..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="p-6">
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">No Shot Lists</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Create shot lists to plan filming sessions and stay organized on set.
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2 bg-[hsl(200_70%_50%)]">
              <Plus className="h-4 w-4" /> Create Shot List
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((shotList, index) => {
              const campaign = campaigns.find(c => c.id === shotList.campaign_id);
              const statusConfig = STATUS_CONFIG[shotList.status];
              const dateLabel = getDateLabel(shotList.scheduled_date);

              return (
                <motion.div key={shotList.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card
                    className="luxury-card p-4 cursor-pointer hover:border-[hsl(200_70%_50%/0.4)] transition-colors group"
                    onClick={() => setSelectedShotList(shotList)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display font-semibold">{shotList.title}</h3>
                          {dateLabel?.urgent && (
                            <span className="text-xs font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">{dateLabel.label}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{campaign?.name || "Unknown campaign"}</p>
                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                          {shotList.location && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{shotList.location}</span>
                          )}
                          {shotList.scheduled_date && (
                            <span className={cn("flex items-center gap-1", dateLabel?.urgent && "text-red-500")}>
                              <Calendar className="h-3 w-3" />
                              {dateLabel?.label || format(new Date(shotList.scheduled_date), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusConfig.bg, statusConfig.color)}>
                          {statusConfig.label}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleOpenDialog(shotList); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(shotList.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
            <DialogContent className="sm:max-w-xl p-0">
              <DialogHeader className="p-6 pb-4 shrink-0">
                <DialogTitle className="font-display flex items-center gap-2">
                  <Camera className="h-5 w-5 text-[hsl(200_70%_50%)]" />
                  {selectedShotList.title}
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Campaign</p>
                    <p className="font-medium">{campaigns.find(c => c.id === selectedShotList.campaign_id)?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Status</p>
                    <span className={cn("px-2 py-1 rounded-full text-xs font-medium", STATUS_CONFIG[selectedShotList.status].bg, STATUS_CONFIG[selectedShotList.status].color)}>
                      {STATUS_CONFIG[selectedShotList.status].label}
                    </span>
                  </div>
                  {selectedShotList.location && (
                    <div>
                      <p className="text-muted-foreground mb-1">Location</p>
                      <p className="font-medium flex items-center gap-1"><MapPin className="h-3 w-3" />{selectedShotList.location}</p>
                    </div>
                  )}
                  {selectedShotList.scheduled_date && (
                    <div>
                      <p className="text-muted-foreground mb-1">Date</p>
                      <p className="font-medium flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(selectedShotList.scheduled_date), "EEEE, MMM d, yyyy")}</p>
                    </div>
                  )}
                </div>
                {selectedShotList.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Description</p>
                    <p className="text-sm bg-muted rounded-lg p-3">{selectedShotList.description}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button variant="outline" className="gap-2" onClick={() => { setSelectedShotList(null); handleOpenDialog(selectedShotList); }}>
                    <Edit2 className="h-4 w-4" /> Edit
                  </Button>
                  {selectedShotList.status === "planned" && (
                    <Button
                      className="gap-2 bg-[hsl(200_70%_50%)]"
                      onClick={() => {
                        updateShotList.mutate({ id: selectedShotList.id, status: "in-progress" });
                        setSelectedShotList(null);
                        toast.success("Shoot started!");
                      }}
                    >
                      <Camera className="h-4 w-4" /> Start Shoot
                    </Button>
                  )}
                  {selectedShotList.status === "in-progress" && (
                    <Button
                      className="gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        updateShotList.mutate({ id: selectedShotList.id, status: "completed" });
                        setSelectedShotList(null);
                        toast.success("Shoot completed!");
                      }}
                    >
                      <CheckCircle className="h-4 w-4" /> Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
