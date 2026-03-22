import { useApprovals, useUpdateApproval, useTasks, getAssetPublicUrl } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, MessageSquare, Clock, Eye, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  approved: { label: "Approved", color: "bg-success/15 text-success", icon: CheckCircle },
  "revision-requested": { label: "Revision Requested", color: "bg-warning/15 text-warning", icon: MessageSquare },
  rejected: { label: "Rejected", color: "bg-destructive/15 text-destructive", icon: XCircle },
};

export default function ApprovalsPage() {
  const { data: allApprovals = [], isLoading } = useApprovals();
  const updateApproval = useUpdateApproval();
  const { user } = useAuth();
  const [selectedApproval, setSelectedApproval] = useState<typeof allApprovals[0] | null>(null);
  const [feedback, setFeedback] = useState("");

  const pendingApprovals = allApprovals.filter(a => a.status === "pending");
  const processedApprovals = allApprovals.filter(a => a.status !== "pending");

  const handleDecision = async (id: string, status: string) => {
    try {
      await updateApproval.mutateAsync({ id, status, feedback: feedback || undefined, reviewer_id: user?.id });
      toast.success(status === "approved" ? "Content approved!" : "Revision requested");
      setSelectedApproval(null);
      setFeedback("");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Content Approvals</h1>
            {pendingApprovals.length > 0 && (
              <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium">
                {pendingApprovals.length} pending
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" /> Pending ({pendingApprovals.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-2">
              <CheckCircle className="h-4 w-4" /> Processed ({processedApprovals.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : pendingApprovals.length === 0 ? (
              <Card className="luxury-card p-12 text-center">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending approvals right now.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((approval, index) => (
                  <motion.div key={approval.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card className="luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedApproval(approval)}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{(approval as any).tasks?.title || "Task"}</h4>
                          <p className="text-sm text-muted-foreground">{(approval as any).clients?.name || "Client"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{format(new Date(approval.created_at), "MMM d")}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[approval.status]?.color}`}>
                            {statusConfig[approval.status]?.label}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="processed">
            {processedApprovals.length === 0 ? (
              <Card className="luxury-card p-12 text-center">
                <p className="text-muted-foreground">No processed approvals yet.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {processedApprovals.map((approval) => (
                  <Card key={approval.id} className="luxury-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{(approval as any).tasks?.title || "Task"}</h4>
                        <p className="text-sm text-muted-foreground">{(approval as any).clients?.name || "Client"}</p>
                        {approval.feedback && <p className="text-sm mt-1 italic text-muted-foreground">"{approval.feedback}"</p>}
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[approval.status]?.color}`}>
                        {statusConfig[approval.status]?.label}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {selectedApproval && (
          <Dialog open={!!selectedApproval} onOpenChange={() => { setSelectedApproval(null); setFeedback(""); }}>
            <DialogContent className="sm:max-w-xl p-0">
              <DialogHeader className="p-6 pb-4 shrink-0">
                <DialogTitle className="font-display">Review Content</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 space-y-4">
                <div className="space-y-2">
                  <p className="text-sm"><span className="text-muted-foreground">Task:</span> {(selectedApproval as any).tasks?.title}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Client:</span> {(selectedApproval as any).clients?.name}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Type:</span> {selectedApproval.reviewer_type === "internal" ? "Internal Review" : "Client Review"}</p>
                </div>

                {(selectedApproval as any).assets?.file_path && (
                  <div className="rounded-lg overflow-hidden bg-muted">
                    {(selectedApproval as any).assets?.file_path && (
                      <img src={getAssetPublicUrl((selectedApproval as any).assets.file_path)} alt="Preview" className="w-full max-h-64 object-contain" />
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Feedback (optional)</label>
                  <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Add notes or revision requests..." />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button className="flex-1 gap-2" onClick={() => handleDecision(selectedApproval.id, "approved")}>
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => handleDecision(selectedApproval.id, "revision-requested")}>
                    <MessageSquare className="h-4 w-4" /> Request Revision
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
