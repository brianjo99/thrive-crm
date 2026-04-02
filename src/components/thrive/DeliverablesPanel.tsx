import { useState } from "react";
import { useDeliverables, useCreateDeliverable, useUpdateDeliverable, useDeleteDeliverable } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle, Clock, AlertCircle, Package } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";

type Deliverable = Tables<"deliverables">;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  "in-progress": { label: "In Progress", color: "bg-blue/15 text-blue", icon: Clock },
  ready: { label: "Ready", color: "bg-yellow/15 text-yellow", icon: AlertCircle },
  delivered: { label: "Delivered", color: "bg-green/15 text-green", icon: CheckCircle },
  approved: { label: "Approved", color: "bg-success/15 text-success", icon: CheckCircle },
};

interface DeliverablesProps {
  campaignId: string;
  editable?: boolean;
}

export function DeliverablesPanel({ campaignId, editable = true }: DeliverablesProps) {
  const { data: deliverables = [], isLoading } = useDeliverables({ campaignId });
  const createDeliverable = useCreateDeliverable();
  const updateDeliverable = useUpdateDeliverable();
  const deleteDeliverable = useDeleteDeliverable();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "video" as const,
    description: "",
    due_date: "",
    status: "pending" as const,
  });

  const handleOpenDialog = (deliverable?: Deliverable) => {
    if (deliverable) {
      setEditingId(deliverable.id);
      setFormData({
        name: deliverable.name,
        type: deliverable.type as any,
        description: deliverable.description || "",
        due_date: deliverable.due_date?.split("T")[0] || "",
        status: deliverable.status as any,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        type: "video",
        description: "",
        due_date: "",
        status: "pending",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Please enter a deliverable name");
      return;
    }

    try {
      if (editingId) {
        await updateDeliverable.mutateAsync({
          id: editingId,
          ...formData,
        });
        toast.success("Deliverable updated!");
      } else {
        await createDeliverable.mutateAsync({
          campaign_id: campaignId,
          ...formData,
        });
        toast.success("Deliverable created!");
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure?")) {
      try {
        await deleteDeliverable.mutateAsync(id);
        toast.success("Deliverable deleted!");
      } catch (error: any) {
        toast.error(error.message);
      }
    }
  };

  const statusSummary = {
    pending: deliverables.filter((d) => d.status === "pending").length,
    "in-progress": deliverables.filter((d) => d.status === "in-progress").length,
    ready: deliverables.filter((d) => d.status === "ready").length,
    delivered: deliverables.filter((d) => d.status === "delivered").length,
    approved: deliverables.filter((d) => d.status === "approved").length,
  };

  return (
    <Card className="luxury-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold">Deliverables</h3>
          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
            {deliverables.length}
          </span>
        </div>
        {editable && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={() => handleOpenDialog()}>
                <Plus className="h-3 w-3" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg p-0">
              <DialogHeader className="p-6 pb-0 shrink-0">
                <DialogTitle className="font-display">
                  {editingId ? "Edit Deliverable" : "Add Deliverable"}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Main Promotional Video"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v: any) => setFormData((p) => ({ ...p, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="report">Report</SelectItem>
                      <SelectItem value="reel">Reel</SelectItem>
                      <SelectItem value="thumbnail">Thumbnail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Optional description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value }))}
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
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="shrink-0 border-t border-border p-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={createDeliverable.isPending || updateDeliverable.isPending}>
                  {editingId ? "Update" : "Add"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-5 gap-2 mb-4 text-xs">
        {(["pending", "in-progress", "ready", "delivered", "approved"] as const).map((status) => (
          <div key={status} className="text-center p-2 rounded-lg bg-muted/50">
            <p className="font-medium">{statusSummary[status]}</p>
            <p className="text-muted-foreground capitalize">{status.replace("-", " ")}</p>
          </div>
        ))}
      </div>

      {/* Deliverables List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : deliverables.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <p>No deliverables yet</p>
          {editable && <p className="text-xs mt-1">Click "Add" to create one</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {deliverables.map((deliverable, index) => {
            const StatusIcon = STATUS_CONFIG[deliverable.status]?.icon || Clock;
            return (
              <motion.div
                key={deliverable.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{deliverable.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{deliverable.type}</span>
                    {deliverable.due_date && (
                      <>
                        <span>•</span>
                        <span>{format(new Date(deliverable.due_date), "MMM d")}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_CONFIG[deliverable.status]?.color
                    }`}
                  >
                    <StatusIcon className="h-3 w-3" />
                  </span>
                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(deliverable.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
