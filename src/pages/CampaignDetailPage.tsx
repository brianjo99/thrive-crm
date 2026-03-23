import { useParams, useNavigate } from "react-router-dom";
import { useCampaigns, useTasks, useCreateTask, useUpdateCampaign, useApprovals, useClients, useAssets } from "@/hooks/useSupabaseData";
import { TaskList } from "@/components/thrive/TaskCard";
import { DeliverablesPanel } from "@/components/thrive/DeliverablesPanel";
import { TemplateBadge, StatusBadge } from "@/components/thrive/Badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, ArrowRight, Plus, CheckCircle, FolderKanban } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];
type ServiceType = Database["public"]["Enums"]["service_type"];

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: campaigns = [] } = useCampaigns();
  const { data: tasks = [], isLoading: tasksLoading } = useTasks({ campaignId: id });
  const { data: clients = [] } = useClients();
  const { data: approvals = [] } = useApprovals({ campaignId: id });
  const createTask = useCreateTask();
  const updateCampaign = useUpdateCampaign();
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

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
          <h3 className="font-display text-lg font-semibold mb-2">Campaign not found</h3>
          <Button onClick={() => navigate("/campaigns")}>Back to Campaigns</Button>
        </Card>
      </div>
    );
  }

  const stages = campaign.stages || [];
  const currentStageIndex = stages.indexOf(campaign.current_stage);

  const advanceStage = async () => {
    if (currentStageIndex < stages.length - 1) {
      const nextStage = stages[currentStageIndex + 1];
      await updateCampaign.mutateAsync({ id: campaign.id, current_stage: nextStage });
      toast.success(`Advanced to ${nextStage}`);
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
      toast.success("Task added!");
      setNewTask({ title: "", description: "", priority: "medium", stage: "", service_type: "" });
      setIsAddTaskOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{campaign.name}</h1>
              <p className="text-sm text-muted-foreground">{client?.name || "Unknown client"}</p>
            </div>
            <TemplateBadge template={campaign.template} />
          </div>

          {/* Pipeline Progress */}
          <div className="flex items-center gap-2 flex-wrap">
            {stages.map((stage, i) => {
              const isActive = stage === campaign.current_stage;
              const isPast = currentStageIndex > i;
              return (
                <div key={stage} className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : isPast ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                  }`}>
                    {isPast && <CheckCircle className="h-3 w-3 inline mr-1" />}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Started {format(new Date(campaign.start_date), "MMM d, yyyy")}</span>
            {campaign.due_date && <span>• Due {format(new Date(campaign.due_date), "MMM d, yyyy")}</span>}
            <span>• {tasks.length} tasks</span>
            <span>• {approvals.length} approvals</span>
          </div>
          <div className="flex gap-2">
            {currentStageIndex < stages.length - 1 && (
              <Button onClick={advanceStage} className="gap-2">
                Advance Stage <ArrowRight className="h-4 w-4" />
              </Button>
            )}
            <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Add Task</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">Add Task</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={newTask.title} onChange={(e) => setNewTask(p => ({ ...p, title: e.target.value }))} placeholder="Task title" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={newTask.description} onChange={(e) => setNewTask(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Stage</Label>
                      <Select value={newTask.stage} onValueChange={(v) => setNewTask(p => ({ ...p, stage: v as PipelineStage }))}>
                        <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                        <SelectContent>
                          {stages.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select value={newTask.priority} onValueChange={(v) => setNewTask(p => ({ ...p, priority: v as TaskPriority }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Service Type (optional)</Label>
                    <Select value={newTask.service_type} onValueChange={(v) => setNewTask(p => ({ ...p, service_type: v as ServiceType }))}>
                      <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="film">Film</SelectItem>
                        <SelectItem value="edit">Edit</SelectItem>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="report">Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="shrink-0 sticky bottom-0 bg-background border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsAddTaskOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddTask} disabled={createTask.isPending}>
                    {createTask.isPending ? "Adding..." : "Add Task"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {stages.map(stage => {
              const stageTasks = tasks.filter(t => t.stage === stage);
              if (stageTasks.length === 0 && stage !== campaign.current_stage) return null;
              return (
                <motion.div key={stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`luxury-card p-5 ${stage === campaign.current_stage ? "border-l-4 border-l-primary" : ""}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-semibold">{stage.charAt(0).toUpperCase() + stage.slice(1).replace("-", " ")}</h3>
                      <StatusBadge status={stage} />
                    </div>
                    <TaskList tasks={stageTasks} emptyMessage="No tasks in this stage" />
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="space-y-6">
            <Card className="luxury-card p-5">
              <h3 className="font-display font-semibold mb-4">Campaign Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Template</span><TemplateBadge template={campaign.template} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Current Stage</span><StatusBadge status={campaign.current_stage} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Tasks</span><span className="font-medium">{tasks.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Completed</span><span className="font-medium">{tasks.filter(t => t.status === "complete").length}</span></div>
              </div>
            </Card>

            <Card className="luxury-card p-5">
              <DeliverablesPanel campaignId={campaign.id} editable={true} />
            </Card>

            <Card className="luxury-card p-5">
              <h3 className="font-display font-semibold mb-4">Approvals</h3>
              {approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No approvals yet</p>
              ) : (
                <div className="space-y-2">
                  {approvals.slice(0, 5).map(a => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{(a as any).tasks?.title || "Task"}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        a.status === "approved" ? "bg-success/15 text-success" :
                        a.status === "pending" ? "bg-muted text-muted-foreground" :
                        "bg-warning/15 text-warning"
                      }`}>{a.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
