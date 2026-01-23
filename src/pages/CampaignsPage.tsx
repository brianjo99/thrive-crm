import { useState } from "react";
import { useThriveStore } from "@/stores/thriveStore";
import { CampaignTemplateGrid } from "@/components/thrive/CampaignTemplateCard";
import { TemplateBadge, StatusBadge, ServiceBadge } from "@/components/thrive/Badges";
import { TaskList } from "@/components/thrive/TaskCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FolderKanban, Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Campaign, CampaignTemplate, SERVICE_TEMPLATES } from "@/types/thrive";
import { format } from "date-fns";

export default function CampaignsPage() {
  const { campaigns, clients, createCampaign, getClientById } = useThriveStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    clientId: "",
    template: "film-edit" as CampaignTemplate,
  });

  const filteredCampaigns = campaigns.filter((campaign) => {
    const client = getClientById(campaign.clientId);
    return (
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleCreateCampaign = () => {
    if (!newCampaign.name || !newCampaign.clientId) return;

    createCampaign(newCampaign.clientId, newCampaign.template, newCampaign.name);

    setNewCampaign({
      name: "",
      clientId: "",
      template: "film-edit",
    });
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
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
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Create New Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaignName">Campaign Name</Label>
                      <Input
                        id="campaignName"
                        value={newCampaign.name}
                        onChange={(e) =>
                          setNewCampaign((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Q1 Content Series"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Select
                        value={newCampaign.clientId}
                        onValueChange={(value) =>
                          setNewCampaign((prev) => ({ ...prev, clientId: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Campaign Template</Label>
                    <p className="text-sm text-muted-foreground">
                      Choose a template that matches the client's service package
                    </p>
                    <CampaignTemplateGrid
                      selectedTemplate={newCampaign.template}
                      onSelectTemplate={(template) =>
                        setNewCampaign((prev) => ({ ...prev, template }))
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateCampaign}>Create Campaign</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </header>

      <main className="p-6">
        {filteredCampaigns.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Try a different search term"
                : "Create your first campaign to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map((campaign, index) => {
              const client = getClientById(campaign.clientId);
              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="luxury-card p-5 cursor-pointer"
                    onClick={() => setSelectedCampaign(campaign)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display font-semibold">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground">{client?.name}</p>
                      </div>
                      <TemplateBadge template={campaign.template} />
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <StatusBadge status={campaign.currentStage} />
                    </div>

                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Started {format(campaign.startDate, "MMM d, yyyy")}</span>
                        <span>{campaign.tasks.length} tasks</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Campaign Detail Dialog */}
        {selectedCampaign && (
          <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {selectedCampaign.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <TemplateBadge template={selectedCampaign.template} />
                  <StatusBadge status={selectedCampaign.currentStage} />
                </div>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Pipeline Stages */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Pipeline Progress</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedCampaign.stages.map((stage, i) => {
                      const isActive = stage === selectedCampaign.currentStage;
                      const isPast =
                        selectedCampaign.stages.indexOf(selectedCampaign.currentStage) > i;
                      return (
                        <div key={stage} className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : isPast
                                ? "bg-success/20 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {stage.charAt(0).toUpperCase() + stage.slice(1).replace("-", " ")}
                          </span>
                          {i < selectedCampaign.stages.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tasks */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Tasks</h4>
                  <TaskList
                    tasks={selectedCampaign.tasks}
                    emptyMessage="No tasks in this campaign yet"
                    showClient={false}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
