import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCampaigns, useClients } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FileText, PenLine, Check, Archive, Copy, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type Script = {
  id: string;
  campaign_id: string | null;
  title: string;
  content: string | null;
  version: number;
  status: "draft" | "review" | "approved" | "archived";
  created_at: string;
  updated_at: string;
};

type ScriptWithCampaign = Script & {
  campaigns: { name: string; clients: { name: string } | null } | null;
};

const STATUS_CONFIG = {
  draft: {
    label: "Borrador",
    color: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    icon: FileText,
  },
  review: {
    label: "En revisión",
    color: "bg-yellow-500/15 text-yellow-500",
    dot: "bg-yellow-500",
    icon: PenLine,
  },
  approved: {
    label: "Aprobado",
    color: "bg-green-500/15 text-green-500",
    dot: "bg-green-500",
    icon: Check,
  },
  archived: {
    label: "Archivado",
    color: "bg-muted/50 text-muted-foreground/60",
    dot: "bg-muted-foreground/40",
    icon: Archive,
  },
};

function useScripts() {
  return useQuery({
    queryKey: ["scripts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scripts")
        .select("*, campaigns(name, clients(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ScriptWithCampaign[];
    },
  });
}

function useCreateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      campaign_id: string | null;
      status: Script["status"];
      content: string;
    }) => {
      const { data, error } = await supabase
        .from("scripts")
        .insert({ ...input, version: 1 })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

function useUpdateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      bumpVersion,
      ...updates
    }: { id: string; bumpVersion?: boolean } & Partial<Script>) => {
      if (bumpVersion) {
        const { data: current } = await supabase
          .from("scripts")
          .select("version")
          .eq("id", id)
          .single();
        updates.version = (current?.version ?? 1) + 1;
      }
      const { error } = await supabase
        .from("scripts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

function useDuplicateScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (script: ScriptWithCampaign) => {
      // Find existing copies to determine next version suffix
      const { data: existing } = await supabase
        .from("scripts")
        .select("title")
        .ilike("title", `${script.title} (Copy%`);
      const copyNum = (existing?.length ?? 0) + 1;
      const { error } = await supabase.from("scripts").insert({
        title: `${script.title} (Copy ${copyNum})`,
        campaign_id: script.campaign_id,
        content: script.content,
        status: "draft",
        version: 1,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scripts"] }),
  });
}

export default function ScriptsPage() {
  const { data: scripts = [], isLoading } = useScripts();
  const { data: campaigns = [] } = useCampaigns();
  const createScript = useCreateScript();
  const updateScript = useUpdateScript();
  const duplicateScript = useDuplicateScript();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ScriptWithCampaign | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedStatus, setEditedStatus] = useState<Script["status"]>("draft");
  const [contentChanged, setContentChanged] = useState(false);

  // New script form state
  const [newTitle, setNewTitle] = useState("");
  const [newCampaignId, setNewCampaignId] = useState("");
  const [newStatus, setNewStatus] = useState<Script["status"]>("draft");
  const [newContent, setNewContent] = useState("");

  const filtered = scripts.filter((s) => {
    const campaignName = s.campaigns?.name ?? "";
    const clientName = s.campaigns?.clients?.name ?? "";
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaignName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: scripts.length,
    review: scripts.filter((s) => s.status === "review").length,
    approved: scripts.filter((s) => s.status === "approved").length,
    draft: scripts.filter((s) => s.status === "draft").length,
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return toast.error("El título es obligatorio");
    await createScript.mutateAsync({
      title: newTitle.trim(),
      campaign_id: newCampaignId || null,
      status: newStatus,
      content: newContent,
    });
    toast.success("Script creado");
    setShowNewDialog(false);
    setNewTitle("");
    setNewCampaignId("");
    setNewStatus("draft");
    setNewContent("");
  };

  const openScript = (script: ScriptWithCampaign) => {
    setSelectedScript(script);
    setEditedContent(script.content ?? "");
    setEditedTitle(script.title);
    setEditedStatus(script.status);
    setContentChanged(false);
  };

  const handleSaveScript = async () => {
    if (!selectedScript) return;
    const contentActuallyChanged =
      editedContent !== (selectedScript.content ?? "");
    await updateScript.mutateAsync({
      id: selectedScript.id,
      title: editedTitle,
      content: editedContent,
      status: editedStatus,
      bumpVersion: contentActuallyChanged,
    });
    toast.success(
      contentActuallyChanged
        ? `Guardado — versión actualizada a v${selectedScript.version + 1}`
        : "Script guardado"
    );
    setSelectedScript(null);
  };

  const handleDuplicate = async (
    script: ScriptWithCampaign,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    await duplicateScript.mutateAsync(script);
    toast.success("Script duplicado");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Scripts</h1>
                <p className="text-sm text-muted-foreground">
                  Gestión de scripts ({scripts.length} total)
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowNewDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo script
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total scripts", value: counts.total, dot: "bg-primary" },
            {
              label: "En revisión",
              value: counts.review,
              dot: "bg-yellow-500",
            },
            {
              label: "Aprobados",
              value: counts.approved,
              dot: "bg-green-500",
            },
            { label: "Borradores", value: counts.draft, dot: "bg-muted-foreground" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="luxury-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-display font-bold">
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                  <span className={cn("w-3 h-3 rounded-full", stat.dot)} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar scripts o campañas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({scripts.length})</SelectItem>
              <SelectItem value="draft">Borrador ({counts.draft})</SelectItem>
              <SelectItem value="review">
                En revisión ({counts.review})
              </SelectItem>
              <SelectItem value="approved">
                Aprobado ({counts.approved})
              </SelectItem>
              <SelectItem value="archived">Archivado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scripts List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">
              {scripts.length === 0 ? "Aún no hay scripts" : "Sin resultados"}
            </h3>
            <p className="text-muted-foreground">
              {scripts.length === 0
                ? "Crea tu primer script para empezar."
                : "Prueba ajustando la búsqueda o el filtro."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((script, index) => {
              const StatusIcon = STATUS_CONFIG[script.status].icon;
              return (
                <motion.div
                  key={script.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Card
                    className="luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors group"
                    onClick={() => openScript(script)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <StatusIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {script.title}
                            </p>
                            <span className="text-xs text-muted-foreground font-mono">
                              v{script.version}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                            {script.campaigns ? (
                              <>
                                <span className="truncate">
                                  {script.campaigns.name}
                                </span>
                                {script.campaigns.clients && (
                                  <span className="text-muted-foreground/60">
                                    · {script.campaigns.clients.name}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="italic text-muted-foreground/60">
                                Sin campaña
                              </span>
                            )}
                            <span className="hidden md:inline">
                              · {format(new Date(script.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={cn(
                            "px-2 py-1 rounded-full text-xs font-medium",
                            STATUS_CONFIG[script.status].color
                          )}
                        >
                          {STATUS_CONFIG[script.status].label}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          onClick={(e) => handleDuplicate(script, e)}
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Script Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-2xl p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="font-display flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nuevo script
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Título</Label>
                <Input
                  placeholder="Título del script..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Campaña</Label>
                <Select
                  value={newCampaignId}
                  onValueChange={setNewCampaignId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar campaña..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin campaña</SelectItem>
                    {(campaigns as any[]).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.clients?.name && (
                          <span className="text-muted-foreground ml-1.5">
                            · {c.clients.name}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select
                  value={newStatus}
                  onValueChange={(v) => setNewStatus(v as Script["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="review">En revisión</SelectItem>
                    <SelectItem value="approved">Aprobado</SelectItem>
                    <SelectItem value="archived">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Contenido del script</Label>
                <Textarea
                  placeholder="Escribe el script completo aquí..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={12}
                  className="text-sm font-mono leading-relaxed resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowNewDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createScript.isPending || !newTitle.trim()}
              >
                Crear script
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Script Editor Dialog */}
      {selectedScript && (
        <Dialog
          open={!!selectedScript}
          onOpenChange={() => setSelectedScript(null)}
        >
          <DialogContent className="sm:max-w-3xl p-0 max-h-[90vh] flex flex-col">
            <DialogHeader className="p-6 pb-0 shrink-0">
              <DialogTitle className="font-display flex items-center gap-2">
                <PenLine className="h-5 w-5 text-primary" />
                Editar script
                <span className="text-sm font-mono font-normal text-muted-foreground ml-1">
                  v{selectedScript.version}
                  {editedContent !== (selectedScript.content ?? "") && (
                    <span className="text-yellow-500 ml-1">→ v{selectedScript.version + 1}</span>
                  )}
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Título</Label>
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Campaña</Label>
                  <p className="text-sm text-muted-foreground py-2">
                    {selectedScript.campaigns
                      ? `${selectedScript.campaigns.name}${selectedScript.campaigns.clients ? ` · ${selectedScript.campaigns.clients.name}` : ""}`
                      : "Sin campaña"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select
                    value={editedStatus}
                    onValueChange={(v) =>
                      setEditedStatus(v as Script["status"])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="review">En revisión</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="archived">Archivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Contenido del script</Label>
                  {editedContent !== (selectedScript.content ?? "") && (
                    <span className="text-xs text-yellow-500">
                      Contenido modificado — la versión se actualizará al guardar
                    </span>
                  )}
                </div>
                <Textarea
                  value={editedContent}
                  onChange={(e) => {
                    setEditedContent(e.target.value);
                    setContentChanged(
                      e.target.value !== (selectedScript.content ?? "")
                    );
                  }}
                  rows={16}
                  className="text-sm font-mono leading-relaxed resize-none"
                  placeholder="Contenido del script..."
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Creado{" "}
                  {format(new Date(selectedScript.created_at), "MMM d, yyyy")}
                  {" · "}
                  Editado{" "}
                  {format(new Date(selectedScript.updated_at), "MMM d, yyyy")}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedScript(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveScript}
                    disabled={updateScript.isPending}
                  >
                    Guardar cambios
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
