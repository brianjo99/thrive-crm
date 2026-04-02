import { useApprovals, useUpdateApproval, useTasks, getAssetPublicUrl } from "@/hooks/useSupabaseData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, MessageSquare, Clock, ShieldCheck, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function useRevisionRounds(approvalId: string | null) {
  return useQuery({
    queryKey: ["revision_rounds", approvalId],
    queryFn: async () => {
      if (!approvalId) return [];
      const { data, error } = await supabase
        .from("revision_rounds")
        .select("*")
        .eq("approval_id", approvalId)
        .order("round_number");
      if (error) throw error;
      return data || [];
    },
    enabled: !!approvalId,
  });
}

function useAddRevisionRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ approval_id, round_number, feedback }: { approval_id: string; round_number: number; feedback: string }) => {
      const { error } = await supabase.from("revision_rounds").insert({ approval_id, round_number, feedback });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["revision_rounds", vars.approval_id] }),
  });
}

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
  const { data: revisionRounds = [] } = useRevisionRounds(selectedApproval?.id || null);
  const addRevisionRound = useAddRevisionRound();

  const pendingApprovals = allApprovals.filter(a => a.status === "pending");
  const processedApprovals = allApprovals.filter(a => a.status !== "pending");

  const handleDecision = async (id: string, status: string) => {
    try {
      await updateApproval.mutateAsync({ id, status, feedback: feedback || undefined, reviewer_id: user?.id });
      if (status === "revision-requested" && feedback) {
        const nextRound = (revisionRounds.length || 0) + 1;
        await addRevisionRound.mutateAsync({ approval_id: id, round_number: nextRound, feedback });
      }
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
            <DialogContent className="sm:max-w-xl p-0 flex flex-col max-h-[90vh]">
              <DialogHeader className="p-6 pb-4 shrink-0">
                <DialogTitle className="font-display">Review Content</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-6 space-y-4">
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

                {revisionRounds.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-warning" />
                      <label className="text-sm font-medium">Revision History ({revisionRounds.length} round{revisionRounds.length !== 1 ? "s" : ""})</label>
                    </div>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {revisionRounds.map(r => (
                        <div key={r.id} className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                          <p className="text-xs text-warning font-medium mb-1">Round {r.round_number}</p>
                          <p className="text-sm text-muted-foreground">{r.feedback}</p>
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(r.created_at), "MMM d, h:mm a")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {revisionRounds.length > 0 ? `New Feedback (Round ${revisionRounds.length + 1})` : "Feedback (optional)"}
                  </label>
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
