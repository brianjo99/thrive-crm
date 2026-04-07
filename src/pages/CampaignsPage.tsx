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
import { Plus, FolderKanban, Search, AlertTriangle, CheckCircle, Download, Sparkles, Loader2 } from "lucide-react";
import { exportToCsv } from "@/utils/exportCsv";
import { motion } from "framer-motion";
import { CampaignTemplate } from "@/types/thrive";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

const STAGE_ORDER = ["discovery","pre-production","filming","editing","review","revisions","posting","reporting","complete"] as const;

function StagePipelineDots({ stages, currentStage }: { stages: string[]; currentStage: string }) {
  const currentIdx = stages.indexOf(currentStage);
  return (
    <div className="flex items-center gap-1">
      {stages.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            i < currentIdx ? "bg-success flex-1" :
            i === currentIdx ? "bg-primary flex-[2]" :
            "bg-muted flex-1"
          }`}
          title={s}
        />
      ))}
    </div>
  );
}

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: clients = [] } = useClients();
  const { data: allTasks = [] } = useTasks();
  const createCampaign = useCreateCampaign();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForm, setAiForm] = useState({ industry: "", objetivo: "", plataformas: "Instagram, TikTok" });

  const handleAISuggest = async () => {
    const client = clients.find(c => c.id === newCampaign.clientId);
    if (!aiForm.objetivo.trim()) return toast.error("Describe el objetivo de la campaña");
    setAiLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "campaign", clientName: client?.name || "", ...aiForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewCampaign(p => ({ ...p, name: data.name }));
      toast.success("Nombre generado con IA");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(false); }
  };

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
      toast.success("¡Campaña creada!");
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
              <h1 className="font-display text-2xl font-bold">Campañas</h1>
              <span className="text-sm text-muted-foreground">({campaigns.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => exportToCsv("campanas.csv", campaigns.map(c => ({
                  Nombre: c.name,
                  Cliente: clients.find(cl => cl.id === c.client_id)?.name || "",
                  Template: c.template || "",
                  Etapa: c.current_stage || "",
                  Creada: c.created_at ? c.created_at.split("T")[0] : "",
                })))}
              >
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Nueva campaña</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">Crear campaña nueva</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-6">

                  {/* AI Panel */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <p className="text-sm font-medium text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> Sugerir nombre con IA</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Industria</Label>
                        <Input className="h-8 text-sm" placeholder="Ej: Moda, Fitness, Tech" value={aiForm.industry} onChange={e => setAiForm(f => ({ ...f, industry: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Plataformas</Label>
                        <Input className="h-8 text-sm" placeholder="Instagram, TikTok" value={aiForm.plataformas} onChange={e => setAiForm(f => ({ ...f, plataformas: e.target.value }))} />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Objetivo *</Label>
                        <Input className="h-8 text-sm" placeholder="Ej: Lanzar nueva línea de productos en verano" value={aiForm.objetivo} onChange={e => setAiForm(f => ({ ...f, objetivo: e.target.value }))} />
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-2 w-full" onClick={handleAISuggest} disabled={aiLoading}>
                      {aiLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando...</> : <><Sparkles className="h-3.5 w-3.5" /> Generar nombre</>}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="campaignName">Nombre de la campaña</Label>
                      <Input id="campaignName" value={newCampaign.name} onChange={(e) => setNewCampaign((prev) => ({ ...prev, name: e.target.value }))} placeholder="Serie de contenido Q1" />
                    </div>
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select value={newCampaign.clientId} onValueChange={(value) => setNewCampaign((prev) => ({ ...prev, clientId: value }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Plantilla de campaña</Label>
                    <p className="text-sm text-muted-foreground">Elige la plantilla que corresponde al paquete de servicios del cliente</p>
                    <CampaignTemplateGrid
                      selectedTemplate={newCampaign.template}
                      onSelectTemplate={(template) => setNewCampaign((prev) => ({ ...prev, template }))}
                    />
                  </div>
                </div>
                <div className="shrink-0 border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateCampaign} disabled={createCampaign.isPending}>
                    {createCampaign.isPending ? "Creando..." : "Crear campaña"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar campañas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
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
            <h3 className="font-display text-lg font-semibold mb-2">No se encontraron campañas</h3>
            <p className="text-muted-foreground mb-4">{searchQuery ? "Intenta con otro término de búsqueda" : "Crea tu primera campaña para empezar"}</p>
            {!searchQuery && <Button onClick={() => setIsDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Nueva campaña</Button>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map((campaign, index) => {
              const clientName = (campaign as any).clients?.name || "Unknown";
              const campaignTasks = allTasks.filter(t => t.campaign_id === campaign.id);
              const completedTasks = campaignTasks.filter(t => t.status === "complete");
              const urgentTasks = campaignTasks.filter(t => t.priority === "urgent" && t.status !== "complete");
              const overdueTasks = campaignTasks.filter(t =>
                t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status !== "complete"
              );
              const isBlocked = urgentTasks.length > 0 || overdueTasks.length > 0;
              const stages = campaign.stages || [];
              const stageIdx = stages.indexOf(campaign.current_stage);
              const completionPct = campaignTasks.length > 0
                ? Math.round((completedTasks.length / campaignTasks.length) * 100)
                : 0;

              // Derive a "next action" hint from stage
              const stageHints: Record<string, string> = {
                discovery: "Definir script y plan",
                "pre-production": "Preparar shot list",
                filming: "Sesión de filmación",
                editing: "Editar material",
                review: "Revisión interna",
                revisions: "Aplicar correcciones",
                posting: "Publicar contenido",
                reporting: "Cerrar y reportar",
                complete: "Campaña completada",
              };
              const nextHint = stageHints[campaign.current_stage] || campaign.current_stage;

              return (
                <motion.div key={campaign.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card
                    className={`luxury-card p-5 cursor-pointer hover:border-primary/30 transition-colors ${isBlocked ? "border-l-4 border-l-destructive" : ""}`}
                    onClick={() => navigate(`/campaigns/${campaign.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold truncate">{campaign.name}</h3>
                          {isBlocked && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                          {campaign.current_stage === "complete" && <CheckCircle className="h-4 w-4 text-success shrink-0" />}
                        </div>
                        <p className="text-sm text-muted-foreground">{clientName}</p>
                      </div>
                      <TemplateBadge template={campaign.template} />
                    </div>

                    {/* Pipeline progress bar */}
                    {stages.length > 0 && (
                      <div className="mb-3">
                        <StagePipelineDots stages={stages} currentStage={campaign.current_stage} />
                      </div>
                    )}

                    {/* Current stage + next action */}
                    <div className="flex items-center justify-between mb-3">
                      <StatusBadge status={campaign.current_stage} />
                      <span className="text-xs text-muted-foreground italic">{nextHint}</span>
                    </div>

                    <div className="pt-3 border-t border-border space-y-2">
                      {/* Task completion bar */}
                      {campaignTasks.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Tareas</span>
                            <span>{completedTasks.length}/{campaignTasks.length} · {completionPct}%</span>
                          </div>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${completionPct}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Inicio {format(new Date(campaign.start_date), "d MMM yyyy")}</span>
                        {isBlocked && (
                          <span className="text-destructive font-medium">
                            {urgentTasks.length > 0 ? `${urgentTasks.length} urgente${urgentTasks.length !== 1 ? "s" : ""}` : `${overdueTasks.length} vencida${overdueTasks.length !== 1 ? "s" : ""}`}
                          </span>
                        )}
                        {!isBlocked && campaign.due_date && (
                          <span>{format(new Date(campaign.due_date), "d MMM yyyy")}</span>
                        )}
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
