import { useState } from "react";
import { useShotLists, useCreateShotList, useUpdateShotList, useDeleteShotList, useCampaigns } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileStack, Plus, Search, Trash2, Edit2, MapPin, Calendar, CheckCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

type ShotList = Tables<"shot_lists">;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  planned: { label: "Planned", color: "bg-blue-500/15 text-blue-500", icon: Clock },
  "in-progress": { label: "In Progress", color: "bg-yellow-500/15 text-yellow-500", icon: Clock },
  completed: { label: "Completed", color: "bg-green-500/15 text-green-500", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-500/15 text-red-500", icon: Clock },
};

export default function ShotListsPage() {
  const { data: shotLists = [], isLoading } = useShotLists();
  const { data: campaigns = [] } = useCampaigns();
  const createShotList = useCreateShotList();
  const updateShotList = useUpdateShotList();
  const deleteShotList = useDeleteShotList();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedShotList, setSelectedShotList] = useState<ShotList | null>(null);

  const [formData, setFormData] = useState({
    campaign_id: "",
    title: "",
    description: "",
    location: "",
    scheduled_date: "",
    status: "planned" as const,
  });

  const filteredShotLists = shotLists.filter(
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
      setFormData({
        campaign_id: "",
        title: "",
        description: "",
        location: "",
        scheduled_date: "",
        status: "planned",
      });
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
        await updateShotList.mutateAsync({
          id: editingId,
          ...formData,
        });
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
    if (confirm("Are you sure you want to delete this shot list?")) {
      try {
        await deleteShotList.mutateAsync(id);
        toast.success("Shot list deleted!");
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
              <FileStack className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">Shot Lists</h1>
              <span className="text-sm text-muted-foreground">({shotLists.length})</span>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4" /> New Shot List
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">
                    {editingId ? "Edit Shot List" : "Create Shot List"}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Campaign</Label>
                    <Select
                      value={formData.campaign_id}
                      onValueChange={(v) => setFormData((p) => ({ ...p, campaign_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g., Product Launch Shoot"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Describe the shoot..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
                      placeholder="e.g., Studio A, Downtown"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Scheduled Date</Label>
                    <Input
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData((p) => ({ ...p, scheduled_date: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v: any) => setFormData((p) => ({ ...p, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="shrink-0 sticky bottom-0 bg-background border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={createShotList.isPending || updateShotList.isPending}>
                    {editingId ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shot lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <main className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : filteredShotLists.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <FileStack className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">No Shot Lists Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Create shot lists to plan your filming sessions and organize your production schedule.
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" /> Create Shot List
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredShotLists.map((shotList, index) => {
              const campaign = campaigns.find((c) => c.id === shotList.campaign_id);
              const StatusIcon = STATUS_CONFIG[shotList.status]?.icon || Clock;
              return (
                <motion.div
                  key={shotList.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors group"
                    onClick={() => setSelectedShotList(shotList)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-display font-semibold mb-1">{shotList.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{campaign?.name || "Unknown campaign"}</p>
                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                          {shotList.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {shotList.location}
                            </div>
                          )}
                          {shotList.scheduled_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />{" "}
                              {format(new Date(shotList.scheduled_date), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            STATUS_CONFIG[shotList.status]?.color
                          }`}
                        >
                          <StatusIcon className="h-3 w-3" /> {STATUS_CONFIG[shotList.status]?.label}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDialog(shotList);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(shotList.id);
                          }}
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
            <DialogContent className="sm:max-w-xl p-0">
              <DialogHeader className="p-6 pb-4 shrink-0">
                <DialogTitle className="font-display">{selectedShotList.title}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Campaign</p>
                    <p className="font-medium">
                      {campaigns.find((c) => c.id === selectedShotList.campaign_id)?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-medium">{STATUS_CONFIG[selectedShotList.status]?.label}</p>
                  </div>
                  {selectedShotList.location && (
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedShotList.location}</p>
                    </div>
                  )}
                  {selectedShotList.scheduled_date && (
                    <div>
                      <p className="text-muted-foreground">Scheduled Date</p>
                      <p className="font-medium">
                        {format(new Date(selectedShotList.scheduled_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>
                {selectedShotList.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Description</p>
                    <p className="text-sm">{selectedShotList.description}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
