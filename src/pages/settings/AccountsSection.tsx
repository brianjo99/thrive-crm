import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Search, MoreVertical, User, Shield, Eye, Ban, RefreshCw, Mail, UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type AccountStatus = "active" | "invited" | "suspended" | "disabled";
type AppRole = "owner" | "editor" | "videographer";

type Account = {
  id: string;
  display_name: string | null;
  email: string | null;
  status: AccountStatus;
  last_seen_at: string | null;
  created_at: string;
  role: AppRole | null;
};

const STATUS_CONFIG: Record<AccountStatus, { label: string; color: string }> = {
  active:    { label: "Activo",     color: "bg-green-500/15 text-green-400" },
  invited:   { label: "Invitado",   color: "bg-blue-500/15 text-blue-400" },
  suspended: { label: "Suspendido", color: "bg-yellow-500/15 text-yellow-400" },
  disabled:  { label: "Desactivado",color: "bg-muted text-muted-foreground" },
};

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  owner:        { label: "Owner",        color: "bg-primary/15 text-primary" },
  editor:       { label: "Editor",       color: "bg-purple-500/15 text-purple-400" },
  videographer: { label: "Videographer", color: "bg-cyan-500/15 text-cyan-400" },
};

const MODULES = [
  "dashboard", "clients", "campaigns", "tasks", "calendar",
  "scripts", "call_sheets", "assets", "approvals", "invoices",
  "leads", "ads", "templates", "settings",
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Today", clients: "Clientes", campaigns: "Campañas",
  tasks: "Tareas", calendar: "Calendario", scripts: "Scripts",
  call_sheets: "Call Sheets", assets: "Archivos", approvals: "Aprobaciones",
  invoices: "Facturas", leads: "Leads", ads: "Media Buying",
  templates: "Plantillas", settings: "Settings",
};

function useAccounts() {
  return useQuery({
    queryKey: ["settings_accounts"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, email, status, last_seen_at, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roles = new Map((rolesRes.data ?? []).map((r: any) => [r.user_id, r.role]));
      return (profilesRes.data ?? []).map((p: any) => ({
        ...p,
        status: p.status ?? "active",
        role: roles.get(p.id) ?? null,
      })) as Account[];
    },
  });
}

function useUpdateAccountRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id" });
      if (error) throw error;
      // Audit log
      await supabase.from("audit_logs").insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: "change_role",
        resource_type: "account",
        resource_id: userId,
        new_value: { role },
      }).then(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings_accounts"] });
      toast.success("Rol actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function useUpdateAccountStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: AccountStatus }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        actor_id: (await supabase.auth.getUser()).data.user?.id,
        action: "change_status",
        resource_type: "account",
        resource_id: userId,
        new_value: { status },
      }).then(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings_accounts"] });
      toast.success("Estado actualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function useRolePermissions(role: string | null) {
  return useQuery({
    queryKey: ["role_permissions", role],
    queryFn: async () => {
      if (!role) return [];
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", role);
      if (error) return [];
      return data ?? [];
    },
    enabled: !!role,
  });
}

function useModuleVisibility(role: string | null) {
  return useQuery({
    queryKey: ["module_visibility_role", role],
    queryFn: async () => {
      if (!role) return [];
      const { data } = await supabase
        .from("module_visibility")
        .select("module, is_visible")
        .eq("role", role);
      return data ?? [];
    },
    enabled: !!role,
  });
}

function EffectiveAccessPanel({ account }: { account: Account }) {
  const { data: perms = [] } = useRolePermissions(account.role);
  const { data: visibility = [] } = useModuleVisibility(account.role);

  const visibleMap = new Map(visibility.map((v: any) => [v.module, v.is_visible]));
  const visibleModules = MODULES.filter(m => visibleMap.get(m) !== false);
  const hiddenModules = MODULES.filter(m => visibleMap.get(m) === false);

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Acceso efectivo</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Rol</p>
            <Badge className={cn("text-xs", account.role ? ROLE_CONFIG[account.role]?.color : "")}>
              {account.role ? ROLE_CONFIG[account.role]?.label : "Sin rol"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Estado</p>
            <Badge className={cn("text-xs", STATUS_CONFIG[account.status]?.color)}>
              {STATUS_CONFIG[account.status]?.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos visibles</p>
        <div className="flex flex-wrap gap-1.5">
          {visibleModules.length > 0
            ? visibleModules.map(m => (
                <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                  {MODULE_LABELS[m] ?? m}
                </span>
              ))
            : <span className="text-xs text-muted-foreground">Ninguno</span>
          }
        </div>
      </div>

      {hiddenModules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Módulos restringidos</p>
          <div className="flex flex-wrap gap-1.5">
            {hiddenModules.map(m => (
              <span key={m} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {MODULE_LABELS[m] ?? m}
              </span>
            ))}
          </div>
        </div>
      )}

      {perms.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Permisos por módulo</p>
          <div className="space-y-1">
            {perms.map((p: any) => {
              const active = [
                p.can_view && "Ver",
                p.can_create && "Crear",
                p.can_edit && "Editar",
                p.can_delete && "Eliminar",
                p.can_approve && "Aprobar",
                p.can_manage && "Administrar",
              ].filter(Boolean);
              if (active.length === 0) return null;
              return (
                <div key={p.module} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-muted-foreground font-medium">{MODULE_LABELS[p.module] ?? p.module}</span>
                  <span className="text-foreground/70">{active.join(", ")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AccountDetailDialog({
  account,
  open,
  onClose,
}: {
  account: Account | null;
  open: boolean;
  onClose: () => void;
}) {
  const updateRole = useUpdateAccountRole();
  const updateStatus = useUpdateAccountStatus();

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display">{account.display_name ?? "Sin nombre"}</DialogTitle>
              {account.email && <p className="text-sm text-muted-foreground">{account.email}</p>}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rol</p>
              <Select
                value={account.role ?? ""}
                onValueChange={(v) => updateRole.mutate({ userId: account.id, role: v as AppRole })}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sin rol" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="videographer">Videographer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</p>
              <Select
                value={account.status}
                onValueChange={(v) => updateStatus.mutate({ userId: account.id, status: v as AccountStatus })}
              >
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="invited">Invitado</SelectItem>
                  <SelectItem value="suspended">Suspendido</SelectItem>
                  <SelectItem value="disabled">Desactivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Creado: {format(new Date(account.created_at), "d MMM yyyy")}</p>
            {account.last_seen_at && (
              <p>Último acceso: {format(new Date(account.last_seen_at), "d MMM yyyy, HH:mm")}</p>
            )}
          </div>

          <EffectiveAccessPanel account={account} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role, display_name }: { email: string; role: AppRole; display_name: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email, role, display_name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al invitar");
      return json;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings_accounts"] });
      toast.success("Invitación enviada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inviteUser = useInviteUser();
  const [form, setForm] = useState({ email: "", role: "editor" as AppRole, display_name: "" });

  const handleInvite = async () => {
    if (!form.email) return toast.error("El email es obligatorio");
    await inviteUser.mutateAsync(form);
    setForm({ email: "", role: "editor", display_name: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="font-display flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Invitar usuario
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="usuario@email.com"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Nombre (opcional)</Label>
            <Input
              placeholder="Nombre del usuario"
              value={form.display_name}
              onChange={(e) => setForm(f => ({ ...f, display_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={form.role} onValueChange={(v) => setForm(f => ({ ...f, role: v as AppRole }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="videographer">Videographer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            El usuario recibirá un email con un enlace para crear su contraseña.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteUser.isPending || !form.email}>
              Enviar invitación
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AccountsSection() {
  const { data: accounts = [], isLoading } = useAccounts();
  const updateRole = useUpdateAccountRole();
  const updateStatus = useUpdateAccountStatus();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Account | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = accounts.filter(a =>
    (a.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (a.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Cuentas</h2>
          <p className="text-sm text-muted-foreground mt-1">Gestiona todos los usuarios del CRM</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Invitar usuario
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando cuentas...</div>
      ) : (
        <Card className="luxury-card overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No se encontraron cuentas
              </div>
            ) : filtered.map(account => (
              <div
                key={account.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{account.display_name ?? "Sin nombre"}</p>
                  {account.email && (
                    <p className="text-xs text-muted-foreground truncate">{account.email}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {account.role && (
                    <Badge className={cn("text-xs", ROLE_CONFIG[account.role]?.color)}>
                      {ROLE_CONFIG[account.role]?.label}
                    </Badge>
                  )}
                  <Badge className={cn("text-xs", STATUS_CONFIG[account.status].color)}>
                    {STATUS_CONFIG[account.status].label}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setSelected(account)}>
                      <Eye className="h-3.5 w-3.5 mr-2" /> Ver detalles
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => updateRole.mutate({ userId: account.id, role: "owner" })}>
                      <Shield className="h-3.5 w-3.5 mr-2" /> Hacer Owner
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateRole.mutate({ userId: account.id, role: "editor" })}>
                      Hacer Editor
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateRole.mutate({ userId: account.id, role: "videographer" })}>
                      Hacer Videographer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {account.status !== "suspended" ? (
                      <DropdownMenuItem
                        className="text-yellow-500"
                        onClick={() => updateStatus.mutate({ userId: account.id, status: "suspended" })}
                      >
                        <Ban className="h-3.5 w-3.5 mr-2" /> Suspender
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => updateStatus.mutate({ userId: account.id, status: "active" })}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-2" /> Reactivar
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => updateStatus.mutate({ userId: account.id, status: "disabled" })}
                    >
                      Desactivar cuenta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AccountDetailDialog
        account={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
