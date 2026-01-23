import { CampaignTemplateGrid } from "@/components/thrive/CampaignTemplateCard";
import { DefaultChecklistPreview } from "@/components/thrive/ChecklistPanel";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileStack, LayoutTemplate, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";
import { ClientType } from "@/types/thrive";

export default function TemplatesPage() {
  const clientTypes: ClientType[] = ['business', 'influencer', 'creator'];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <FileStack className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Templates</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Campaign templates and default checklists that auto-generate based on service packages
          </p>
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns" className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              Campaign Templates
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Default Checklists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="luxury-card p-6">
                <h2 className="font-display text-lg font-semibold mb-2">
                  Service-Based Campaign Templates
                </h2>
                <p className="text-muted-foreground mb-6">
                  Each template auto-creates the correct pipeline stages, tasks, and deliverables
                  based on the services included. Select a template when creating a new campaign.
                </p>
                <CampaignTemplateGrid />
              </Card>
            </motion.div>

            <Card className="luxury-card p-6 bg-gradient-to-br from-card to-primary/5">
              <h3 className="font-display font-semibold mb-3">How Templates Work</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-primary">1. Select Template</p>
                  <p className="text-muted-foreground">
                    Choose based on the client's service package (Film Only, Film+Edit, etc.)
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-primary">2. Auto-Generate</p>
                  <p className="text-muted-foreground">
                    Pipeline stages, checklists, and task categories are created automatically
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-primary">3. Start Working</p>
                  <p className="text-muted-foreground">
                    Everything is set up correctly — just start moving through the pipeline
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="checklists" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="luxury-card p-6">
                <h2 className="font-display text-lg font-semibold mb-2">
                  Default Checklists by Client Type
                </h2>
                <p className="text-muted-foreground mb-6">
                  These checklists load automatically when you create a new client. They're fully
                  editable per client, but provide smart defaults based on client type.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {clientTypes.map((type, index) => (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <DefaultChecklistPreview clientType={type} />
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <Card className="luxury-card p-6 bg-gradient-to-br from-card to-accent/10">
              <h3 className="font-display font-semibold mb-3">Checklist Philosophy</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">Business Clients</p>
                  <p className="text-muted-foreground">
                    Focus on brand consistency, lead generation CTAs, and detailed reporting
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Influencers</p>
                  <p className="text-muted-foreground">
                    Emphasize hook testing, trend alignment, and engagement-driven content
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Creators</p>
                  <p className="text-muted-foreground">
                    Prioritize volume, speed, iteration, and efficient batch workflows
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
