import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Permission = {
  id: string;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_manage: boolean;
};

const ROLES = [
  { id: "owner",        label: "Owner",        color: "text-primary",      bg: "bg-primary/10" },
  { id: "editor",       label: "Editor",        color: "text-purple-400",   bg: "bg-purple-500/10" },
  { id: "videographer", label: "Videographer",  color: "text-cyan-400",     bg: "bg-cyan-500/10" },
  { id: "client",       label: "Cliente",       color: "text-orange-400",   bg: "bg-orange-500/10" },
];

const MODULES = [
  { id: "dashboard",   label: "Today / Dashboard" },
  { id: "clients",     label: "Clientes" },
  { id: "campaigns",   label: "Campañas" },
  { id: "tasks",       label: "Tareas" },
  { id: "calendar",    label: "Calendario" },
  { id: "scripts",     label: "Scripts" },
  { id: "call_sheets", label: "Call Sheets" },
  { id: "assets",      label: "Archivos" },
  { id: "approvals",   label: "Aprobaciones" },
  { id: "invoices",    label: "Facturas" },
  { id: "leads",       label: "Leads" },
  { id: "ads",         label: "Ads" },
  { id: "templates",   label: "Templates" },
  { id: "settings",    label: "Settings" },
];

const PERM_KEYS: { key: keyof Permission; label: string }[] = [
  { key: "can_view",    label: "Ver" },
  { key: "can_create",  label: "Crear" },
  { key: "can_edit",    label: "Editar" },
  { key: "can_delete",  label: "Eliminar" },
  { key: "can_approve", label: "Aprobar" },
  { key: "can_manage",  label: "Administrar" },
];

function useRolePerms(role: string) {
  return useQuery({
    queryKey: ["role_permissions", role],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .eq("role", role);
      if (error) return [] as Permission[];
      return (data ?? []) as Permission[];
    },
  });
}

function useUpsertPerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (perm: Omit<Permission, "id">) => {
      const { error } = await supabase
        .from("role_permissions")
        .upsert(perm, { onConflict: "role,module" });
      if (error) throw error;
    },
    onSuccess: (_, perm) => {
      qc.invalidateQueries({ queryKey: ["role_permissions", perm.role] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function RolePermMatrix({ role }: { role: string }) {
  const { data: perms = [], isLoading } = useRolePerms(role);
  const upsert = useUpsertPerm();

  const permMap = new Map(perms.map(p => [p.module, p]));

  const getDefault = (module: string): Omit<Permission, "id"> => ({
    role,
    module,
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
    can_approve: false,
    can_manage: false,
  });

  const toggle = (module: string, key: keyof Permission) => {
    const current = permMap.get(module) ?? getDefault(module);
    const updated = { ...getDefault(module), ...current, [key]: !current[key] };
    // If turning off view, turn off everything
    if (key === "can_view" && current.can_view) {
      Object.assign(updated, {
        can_create: false, can_edit: false, can_delete: false,
        can_approve: false, can_manage: false,
      });
    }
    // If turning on anything other than view, also turn on view
    if (key !== "can_view" && !current.can_view && updated[key]) {
      updated.can_view = true;
    }
    upsert.mutate(updated);
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">Cargando...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-border">
            <th className="py-2 pr-4 font-medium text-muted-foreground w-40">Módulo</th>
            {PERM_KEYS.map(p => (
              <th key={p.key} className="py-2 px-3 font-medium text-muted-foreground text-center whitespace-nowrap">
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {MODULES.map(mod => {
            const perm = permMap.get(mod.id) ?? getDefault(mod.id);
            return (
              <tr key={mod.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 pr-4 font-medium text-sm">{mod.label}</td>
                {PERM_KEYS.map(p => (
                  <td key={p.key} className="py-2.5 px-3 text-center">
                    <Switch
                      checked={!!perm[p.key]}
                      onCheckedChange={() => toggle(mod.id, p.key)}
                      className="scale-75"
                      disabled={role === "owner"} // owner always has full access
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {role === "owner" && (
        <p className="text-xs text-muted-foreground mt-3">
          El rol Owner siempre tiene acceso completo y no puede modificarse.
        </p>
      )}
    </div>
  );
}

export default function RolesSection() {
  const [activeRole, setActiveRole] = useState("owner");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Roles y Permisos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configura qué puede hacer cada rol en cada módulo del CRM
        </p>
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 flex-wrap">
        {ROLES.map(r => (
          <button
            key={r.id}
            onClick={() => setActiveRole(r.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeRole === r.id
                ? cn(r.bg, r.color, "ring-1 ring-current/30")
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <Card className="luxury-card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Permisos — {ROLES.find(r => r.id === activeRole)?.label}
          </p>
          <p className="text-xs text-muted-foreground">
            Los cambios se guardan automáticamente
          </p>
        </div>
        <RolePermMatrix role={activeRole} />
      </Card>
    </div>
  );
}
