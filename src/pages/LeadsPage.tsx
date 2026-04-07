import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Mail, MessageSquare, TrendingUp, Trash2, ArrowRight, ArrowLeft, Sparkles, Loader2, Copy, LayoutList, Columns3 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type Lead = {
  id: string;
  nombre: string;
  email: string;
  servicio: string | null;
  mensaje: string | null;
  status: "new" | "contacted" | "converted" | "closed";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG = {
  new: { label: "Nuevo", color: "bg-blue-500/15 text-blue-500", dot: "bg-blue-500" },
  contacted: { label: "Contactado", color: "bg-yellow-500/15 text-yellow-500", dot: "bg-yellow-500" },
  converted: { label: "Convertido", color: "bg-green-500/15 text-green-500", dot: "bg-green-500" },
  closed: { label: "Cerrado", color: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
};

function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });
}

function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Lead>) => {
      const { error } = await supabase.from("leads").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

function useConvertLeadToClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: Lead) => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ name: lead.nombre, email: lead.email, type: "business" })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("leads").update({ status: "converted" }).eq("id", lead.id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export default function LeadsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLeadToClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [aiEmailLoading, setAiEmailLoading] = useState(false);
  const [aiEmail, setAiEmail] = useState<{subject:string;body:string} | null>(null);

  const handleGenerateEmail = async () => {
    if (!selectedLead) return;
    setAiEmailLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "lead-email",
          leadName: selectedLead.nombre,
          empresa: "",
          servicio: selectedLead.servicio || "",
          notas: selectedLead.mensaje || notes || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAiEmail(data);
    } catch (e: any) { toast.error(e.message); }
    finally { setAiEmailLoading(false); }
  };

  const filtered = leads.filter(l => {
    const matchesSearch = l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.servicio?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || l.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    new: leads.filter(l => l.status === "new").length,
    contacted: leads.filter(l => l.status === "contacted").length,
    converted: leads.filter(l => l.status === "converted").length,
    closed: leads.filter(l => l.status === "closed").length,
  };

  const handleStatusChange = async (lead: Lead, status: Lead["status"]) => {
    await updateLead.mutateAsync({ id: lead.id, status });
    if (selectedLead?.id === lead.id) setSelectedLead({ ...lead, status });
    toast.success(`Lead marcado como ${STATUS_CONFIG[status].label}`);
  };

  const handleSaveNotes = async () => {
    if (!selectedLead) return;
    await updateLead.mutateAsync({ id: selectedLead.id, notes });
    setSelectedLead({ ...selectedLead, notes });
    toast.success("Notas guardadas");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este lead?")) return;
    await deleteLead.mutateAsync(id);
    setSelectedLead(null);
    toast.success("Lead eliminado");
  };

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || "");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Leads</h1>
              <p className="text-sm text-muted-foreground">Contactos del website ({leads.length} total)</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(["new", "contacted", "converted", "closed"] as const).map((status) => (
            <motion.div key={status} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className={cn("luxury-card p-4 cursor-pointer transition-colors hover:border-primary/30", filterStatus === status && "border-primary/50")}
                onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-display font-bold">{counts[status]}</p>
                    <p className="text-xs text-muted-foreground">{STATUS_CONFIG[status].label}</p>
                  </div>
                  <span className={cn("w-3 h-3 rounded-full", STATUS_CONFIG[status].dot)} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar leads..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          {viewMode === "list" && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos ({leads.length})</SelectItem>
                <SelectItem value="new">Nuevos ({counts.new})</SelectItem>
                <SelectItem value="contacted">Contactados ({counts.contacted})</SelectItem>
                <SelectItem value="converted">Convertidos ({counts.converted})</SelectItem>
                <SelectItem value="closed">Cerrados ({counts.closed})</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              className={cn("rounded-none h-9 px-3", viewMode === "list" && "bg-primary/10 text-primary")}
              onClick={() => setViewMode("list")}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("rounded-none h-9 px-3 border-l border-border", viewMode === "kanban" && "bg-primary/10 text-primary")}
              onClick={() => setViewMode("kanban")}
            >
              <Columns3 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Leads View */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : leads.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">Esperando leads...</h3>
            <p className="text-muted-foreground">Cuando alguien llene el formulario en thrv.media aparecerá aquí automáticamente.</p>
          </Card>
        ) : viewMode === "kanban" ? (
          /* Kanban View */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {(["new", "contacted", "converted", "closed"] as const).map((col) => {
              const STATUS_ORDER = ["new", "contacted", "converted", "closed"] as const;
              const colLeads = leads.filter(l =>
                l.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (l.servicio || "").toLowerCase().includes(searchQuery.toLowerCase())
              ).filter(l => l.status === col);
              const cfg = STATUS_CONFIG[col];
              const colIdx = STATUS_ORDER.indexOf(col);
              return (
                <div key={col} className="space-y-2">
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-1 mb-3">
                    <span className={cn("w-2.5 h-2.5 rounded-full", cfg.dot)} />
                    <span className="font-medium text-sm">{cfg.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 ml-auto">{colLeads.length}</span>
                  </div>
                  {colLeads.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                      Sin leads
                    </div>
                  )}
                  {colLeads.map((lead, i) => (
                    <motion.div key={lead.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Card
                        className="luxury-card p-3 cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => openLead(lead)}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">{lead.nombre.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{lead.nombre}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                          </div>
                        </div>
                        {lead.servicio && (
                          <p className="text-xs text-muted-foreground mb-2 truncate bg-muted/50 px-2 py-1 rounded">{lead.servicio}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                          </span>
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            {colIdx > 0 && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                title={`Mover a ${STATUS_CONFIG[STATUS_ORDER[colIdx - 1]].label}`}
                                onClick={() => handleStatusChange(lead, STATUS_ORDER[colIdx - 1])}
                              >
                                <ArrowLeft className="h-3 w-3" />
                              </Button>
                            )}
                            {colIdx < STATUS_ORDER.length - 1 && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                title={`Mover a ${STATUS_CONFIG[STATUS_ORDER[colIdx + 1]].label}`}
                                onClick={() => handleStatusChange(lead, STATUS_ORDER[colIdx + 1])}
                              >
                                <ArrowRight className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          filtered.length === 0 ? (
            <Card className="luxury-card p-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">Sin resultados</h3>
              <p className="text-muted-foreground">Intenta con otro filtro o búsqueda.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((lead, index) => (
                <motion.div key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                  <Card
                    className="luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors group"
                    onClick={() => openLead(lead)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{lead.nombre.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{lead.nombre}</p>
                            {lead.status === "new" && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Nuevo" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{lead.email}</span>
                            {lead.servicio && <span className="hidden md:block truncate">• {lead.servicio}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", STATUS_CONFIG[lead.status].color)}>
                          {STATUS_CONFIG[lead.status].label}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )
        )}
      </main>

      {/* Lead Detail Dialog */}
      {selectedLead && (
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="sm:max-w-xl p-0 flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-0 shrink-0">
              <DialogTitle className="font-display flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{selectedLead.nombre.charAt(0).toUpperCase()}</span>
                </div>
                {selectedLead.nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Email</p>
                  <a href={`mailto:${selectedLead.email}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                    <Mail className="h-3 w-3" />{selectedLead.email}
                  </a>
                </div>
                {selectedLead.servicio && (
                  <div>
                    <p className="text-muted-foreground mb-1">Servicio de interés</p>
                    <p className="font-medium">{selectedLead.servicio}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground mb-1">Recibido</p>
                  <p className="font-medium">{format(new Date(selectedLead.created_at), "MMM d, yyyy · h:mm a")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Estado</p>
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium", STATUS_CONFIG[selectedLead.status].color)}>
                    {STATUS_CONFIG[selectedLead.status].label}
                  </span>
                </div>
              </div>

              {selectedLead.mensaje && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Mensaje</p>
                  <p className="text-sm bg-muted rounded-lg p-3 leading-relaxed">{selectedLead.mensaje}</p>
                </div>
              )}

              {/* Status Actions */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Cambiar estado</p>
                <div className="flex gap-2 flex-wrap">
                  {(["new", "contacted", "converted", "closed"] as const).map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedLead.status === status ? "default" : "outline"}
                      onClick={() => handleStatusChange(selectedLead, status)}
                      disabled={updateLead.isPending}
                    >
                      {STATUS_CONFIG[status].label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Notas internas</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agrega notas sobre este lead..."
                  rows={3}
                  className="text-sm"
                />
                <Button size="sm" className="mt-2" onClick={handleSaveNotes} disabled={updateLead.isPending}>
                  Guardar notas
                </Button>
              </div>

              {/* AI Email */}
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> Redactar email con IA</p>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7" onClick={handleGenerateEmail} disabled={aiEmailLoading}>
                    {aiEmailLoading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando...</> : <><Sparkles className="h-3.5 w-3.5" /> Generar</>}
                  </Button>
                </div>
                {aiEmail && (
                  <div className="space-y-2">
                    <div className="bg-background rounded-lg p-3 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium">ASUNTO</p>
                        <button onClick={() => { navigator.clipboard.writeText(aiEmail.subject); toast.success("Copiado"); }} className="text-xs text-primary hover:underline flex items-center gap-1"><Copy className="h-3 w-3" /> Copiar</button>
                      </div>
                      <p className="text-sm font-medium">{aiEmail.subject}</p>
                    </div>
                    <div className="bg-background rounded-lg p-3 border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium">CUERPO</p>
                        <button onClick={() => { navigator.clipboard.writeText(aiEmail.body); toast.success("Copiado"); }} className="text-xs text-primary hover:underline flex items-center gap-1"><Copy className="h-3 w-3" /> Copiar</button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{aiEmail.body}</p>
                    </div>
                    <Button asChild size="sm" className="w-full gap-1.5" variant="outline">
                      <a href={`mailto:${selectedLead.email}?subject=${encodeURIComponent(aiEmail.subject)}&body=${encodeURIComponent(aiEmail.body)}`}>
                        <Mail className="h-3.5 w-3.5" /> Abrir en email
                      </a>
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="gap-1">
                    <a href={`mailto:${selectedLead.email}`}>
                      <Mail className="h-3 w-3" /> Contactar
                    </a>
                  </Button>
                  {selectedLead.status !== "converted" && (
                    <Button
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700"
                      disabled={convertLead.isPending}
                      onClick={async () => {
                        try {
                          const newClient = await convertLead.mutateAsync(selectedLead);
                          toast.success(`${selectedLead.nombre} convertido a cliente`);
                          setSelectedLead(null);
                          navigate(`/clients/${newClient.id}`);
                        } catch (err: any) {
                          toast.error(err.message);
                        }
                      }}
                    >
                      <Users className="h-3 w-3" /> Convertir a cliente
                    </Button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(selectedLead.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
