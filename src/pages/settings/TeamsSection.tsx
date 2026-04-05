import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Users, MoreVertical, Trash2, UserPlus, X } from "lucide-react";
import { format } from "date-fns";

type Team = { id: string; name: string; description: string | null; created_at: string };
type TeamMember = { id: string; team_id: string; user_id: string; role_in_team: string; created_at: string };
type Profile = { id: string; display_name: string | null; email: string | null };

function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as Team[];
    },
  });
}

function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ["team_members", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", teamId);
      return (data ?? []) as TeamMember[];
    },
    enabled: !!teamId,
  });
}

function useProfiles() {
  return useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, email");
      return (data ?? []) as Profile[];
    },
  });
}

function TeamDialog({
  open,
  onClose,
  team,
}: {
  open: boolean;
  onClose: () => void;
  team?: Team;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(team?.name ?? "");
  const [desc, setDesc] = useState(team?.description ?? "");
  const { data: members = [] } = useTeamMembers(team?.id ?? null);
  const { data: profiles = [] } = useProfiles();
  const [addUserId, setAddUserId] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      if (team) {
        const { error } = await supabase.from("teams").update({ name, description: desc }).eq("id", team.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teams").insert({ name, description: desc });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success(team ? "Equipo actualizado" : "Equipo creado");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("team_members")
        .insert({ team_id: team!.id, user_id: userId, role_in_team: "member" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_members", team?.id] });
      setAddUserId("");
      toast.success("Miembro agregado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("team_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team_members", team?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  const memberIds = new Set(members.map(m => m.user_id));
  const available = profiles.filter(p => !memberIds.has(p.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="font-display">{team ? "Editar equipo" : "Nuevo equipo"}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-2">
            <Label>Nombre del equipo</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Equipo Producción" />
          </div>
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Para qué sirve este equipo" />
          </div>

          {team && (
            <div className="space-y-3 pt-2 border-t border-border">
              <p className="text-sm font-medium">Miembros ({members.length})</p>
              {members.length > 0 && (
                <div className="space-y-1.5">
                  {members.map(m => {
                    const profile = profiles.find(p => p.id === m.user_id);
                    return (
                      <div key={m.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-sm">{profile?.display_name ?? "Sin nombre"}</p>
                          {profile?.email && <p className="text-xs text-muted-foreground">{profile.email}</p>}
                        </div>
                        <button
                          onClick={() => removeMember.mutate(m.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {available.length > 0 && (
                <div className="flex gap-2">
                  <Select value={addUserId} onValueChange={setAddUserId}>
                    <SelectTrigger className="flex-1 text-sm">
                      <SelectValue placeholder="Agregar miembro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {available.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.display_name ?? p.email ?? p.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    disabled={!addUserId}
                    onClick={() => addMember.mutate(addUserId)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 border-t border-border p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending ? "Guardando..." : team ? "Guardar cambios" : "Crear equipo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamsSection() {
  const qc = useQueryClient();
  const { data: teams = [], isLoading } = useTeams();
  const { data: allMembers } = useQuery({
    queryKey: ["all_team_members"],
    queryFn: async () => {
      const { data } = await supabase.from("team_members").select("team_id, user_id");
      return data ?? [];
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  const memberCount = (teamId: string) =>
    (allMembers ?? []).filter((m: any) => m.team_id === teamId).length;

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Equipo eliminado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Equipos</h2>
          <p className="text-sm text-muted-foreground mt-1">Agrupa usuarios por unidad operativa</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo equipo
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando equipos...</div>
      ) : teams.length === 0 ? (
        <Card className="luxury-card p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-2">Sin equipos todavía</p>
          <p className="text-muted-foreground text-sm mb-4">
            Crea equipos para organizar tu agencia — Producción, Ventas, Finanzas, etc.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Crear primer equipo
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map(team => (
            <Card key={team.id} className="luxury-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    {team.description && (
                      <p className="text-sm text-muted-foreground">{team.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {memberCount(team.id)} miembro(s) · Creado {format(new Date(team.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditTeam(team)}>
                      <UserPlus className="h-3.5 w-3.5 mr-2" /> Editar / Miembros
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`¿Eliminar equipo "${team.name}"?`)) deleteTeam.mutate(team.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      <TeamDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <TeamDialog open={!!editTeam} onClose={() => setEditTeam(null)} team={editTeam ?? undefined} />
    </div>
  );
}
