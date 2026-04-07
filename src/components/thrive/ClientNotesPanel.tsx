import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Phone, Mail, Users, Send, Trash2, Plus } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NoteType = "note" | "call" | "email" | "meeting" | "whatsapp";

type ClientNote = {
  id: string;
  client_id: string;
  type: NoteType;
  content: string;
  created_by: string | null;
  created_at: string;
};

const TYPE_CONFIG: Record<NoteType, { label: string; icon: typeof MessageSquare; color: string; bg: string }> = {
  note:      { label: "Nota",     icon: MessageSquare, color: "text-muted-foreground", bg: "bg-muted/50" },
  call:      { label: "Llamada",  icon: Phone,         color: "text-blue-400",         bg: "bg-blue-500/10" },
  email:     { label: "Email",    icon: Mail,          color: "text-purple-400",        bg: "bg-purple-500/10" },
  meeting:   { label: "Reunión",  icon: Users,         color: "text-green-400",         bg: "bg-green-500/10" },
  whatsapp:  { label: "WhatsApp", icon: Send,          color: "text-emerald-400",       bg: "bg-emerald-500/10" },
};

function useClientNotes(clientId: string) {
  return useQuery({
    queryKey: ["client_notes", clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ClientNote[];
    },
    enabled: !!clientId,
  });
}

function useAddClientNote(clientId: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ type, content }: { type: NoteType; content: string }) => {
      const { error } = await (supabase as any).from("client_notes").insert({
        client_id: clientId,
        type,
        content,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_notes", clientId] }),
  });
}

function useDeleteClientNote(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await (supabase as any).from("client_notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_notes", clientId] }),
  });
}

export function ClientNotesPanel({ clientId }: { clientId: string }) {
  const { data: notes = [], isLoading } = useClientNotes(clientId);
  const addNote = useAddClientNote(clientId);
  const deleteNote = useDeleteClientNote(clientId);
  const [isAdding, setIsAdding] = useState(false);
  const [type, setType] = useState<NoteType>("note");
  const [content, setContent] = useState("");

  const handleAdd = async () => {
    if (!content.trim()) return;
    try {
      await addNote.mutateAsync({ type, content: content.trim() });
      setContent("");
      setIsAdding(false);
      toast.success("Nota agregada");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="luxury-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold">Comunicaciones</h3>
          {notes.length > 0 && (
            <span className="text-xs text-muted-foreground">({notes.length})</span>
          )}
        </div>
        {!isAdding && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setIsAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Agregar
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-4 space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
          <Select value={type} onValueChange={(v: NoteType) => setType(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_CONFIG) as NoteType[]).map(t => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <cfg.icon className={cn("h-3.5 w-3.5", cfg.color)} />
                      {cfg.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`Registrar ${TYPE_CONFIG[type].label.toLowerCase()}...`}
            rows={3}
            className="text-sm resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setContent(""); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!content.trim() || addNote.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
      ) : notes.length === 0 && !isAdding ? (
        <div className="text-center py-6">
          <MessageSquare className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Sin comunicaciones registradas</p>
          <Button size="sm" variant="ghost" className="mt-2 gap-1" onClick={() => setIsAdding(true)}>
            <Plus className="h-3.5 w-3.5" /> Primera nota
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map(note => {
            const cfg = TYPE_CONFIG[note.type] || TYPE_CONFIG.note;
            const Icon = cfg.icon;
            return (
              <div key={note.id} className="group flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", cfg.bg)}>
                  <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: es })}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm("¿Eliminar esta nota?")) deleteNote.mutate(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
