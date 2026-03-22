import { useState } from "react";
import { useCampaigns, useClients, useCreateCampaign, useTasks } from "@/hooks/useSupabaseData";
import { CampaignTemplateGrid } from "@/components/thrive/CampaignTemplateCard";
import { TemplateBadge, StatusBadge } from "@/components/thrive/Badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FolderKanban, Search } from "lucide-react";
import { motion } from "framer-motion";
import { CampaignTemplate } from "@/types/thrive";
import { format } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: clients = [] } = useClients();
  const { data: allTasks = [] } = useTasks();
  const createCampaign = useCreateCampaign();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    clientId: "",
    template: "film-edit" as CampaignTemplate,
  });

  const filteredCampaigns = campaigns.filter((campaign) => {
    const clientName = (campaign as any).clients?.name || "";
    return (
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.clientId) return;
    try {
      await createCampaign.mutateAsync({
        name: newCampaign.name,
        clientId: newCampaign.clientId,
        template: newCampaign.template,
      });
      toast.success("Campaign created!");
      setNewCampaign({ name: "", clientId: "", template: "film-edit" });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderKanban className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">Campaigns</h1>
              <span className="text-sm text-muted-foreground">({campaigns.length})</span>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> New Campaign</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl p-0">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">Create New Campaign</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaignName">Campaign Name</Label>
                      <Input id="campaignName" value={newCampaign.name} onChange={(e) => setNewCampaign((prev) => ({ ...prev, name: e.target.value }))} placeholder="Q1 Content Series" />
                    </div>
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Select value={newCampaign.clientId} onValueChange={(value) => setNewCampaign((prev) => ({ ...prev, clientId: value }))}>
                        <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Campaign Template</Label>
                    <p className="text-sm text-muted-foreground">Choose a template that matches the client's service package</p>
                    <CampaignTemplateGrid
                      selectedTemplate={newCampaign.template}
                      onSelectTemplate={(template) => setNewCampaign((prev) => ({ ...prev, template }))}
                    />
                  </div>
                </div>
                <div className="shrink-0 sticky bottom-0 bg-background border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateCampaign} disabled={createCampaign.isPending}>
                    {createCampaign.isPending ? "Creating..." : "Create Campaign"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search campaigns..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
      </header>

      <main className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">{searchQuery ? "Try a different search term" : "Create your first campaign to get started"}</p>
            {!searchQuery && <Button onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Create Campaign</Button>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map((campaign, index) => {
              const clientName = (campaign as any).clients?.name || "Unknown";
              const taskCount = allTasks.filter(t => t.campaign_id === campaign.id).length;
              return (
                <motion.div key={campaign.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="luxury-card p-5 cursor-pointer" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display font-semibold">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground">{clientName}</p>
                      </div>
                      <TemplateBadge template={campaign.template} />
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <StatusBadge status={campaign.current_stage} />
                    </div>
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Started {format(new Date(campaign.start_date), "MMM d, yyyy")}</span>
                        <span>{taskCount} tasks</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
