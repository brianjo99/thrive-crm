import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

const ROLES = [
  { id: "owner",        label: "Owner",        color: "text-primary",    bg: "bg-primary/10" },
  { id: "editor",       label: "Editor",        color: "text-purple-400", bg: "bg-purple-500/10" },
  { id: "videographer", label: "Videographer",  color: "text-cyan-400",   bg: "bg-cyan-500/10" },
  { id: "client",       label: "Cliente",       color: "text-orange-400", bg: "bg-orange-500/10" },
];

const MODULES = [
  { id: "dashboard",   label: "Today",        description: "Dashboard principal" },
  { id: "clients",     label: "Clientes",     description: "Gestión de clientes" },
  { id: "campaigns",   label: "Campañas",     description: "Campañas y producción" },
  { id: "tasks",       label: "Tareas",       description: "Tablero de tareas" },
  { id: "calendar",    label: "Calendario",   description: "Calendario editorial" },
  { id: "scripts",     label: "Scripts",      description: "Guiones y copy" },
  { id: "call_sheets", label: "Call Sheets",  description: "Órdenes de filmación" },
  { id: "assets",      label: "Archivos",     description: "Assets y archivos" },
  { id: "approvals",   label: "Aprobaciones", description: "Revisión de contenido" },
  { id: "invoices",    label: "Facturas",     description: "Facturación" },
  { id: "leads",       label: "Leads",        description: "Pipeline de prospectos" },
  { id: "ads",         label: "Ads",          description: "Plataformas de publicidad" },
  { id: "templates",   label: "Templates",    description: "Plantillas de campaña" },
  { id: "settings",    label: "Settings",     description: "Administración" },
];

function useVisibility(role: string) {
  return useQuery({
    queryKey: ["module_visibility_role", role],
    queryFn: async () => {
      const { data } = await supabase
        .from("module_visibility")
        .select("module, is_visible")
        .eq("role", role);
      return new Map((data ?? []).map((r: any) => [r.module, r.is_visible]));
    },
  });
}

function useToggleVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, module, is_visible }: { role: string; module: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from("module_visibility")
        .upsert({ role, module, is_visible }, { onConflict: "role,module" });
      if (error) throw error;
    },
    onSuccess: (_, { role }) => {
      qc.invalidateQueries({ queryKey: ["module_visibility_role", role] });
      qc.invalidateQueries({ queryKey: ["module_visibility"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function RoleVisibilityMatrix({ role }: { role: string }) {
  const { data: visMap, isLoading } = useVisibility(role);
  const toggle = useToggleVisibility();

  if (isLoading) return <div className="text-sm text-muted-foreground py-4">Cargando...</div>;

  const visibleCount = MODULES.filter(m => visMap?.get(m.id) !== false).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className="bg-green-500/10 text-green-400 text-xs">{visibleCount} visibles</Badge>
        <Badge className="bg-muted text-muted-foreground text-xs">{MODULES.length - visibleCount} ocultos</Badge>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {MODULES.map(mod => {
          const isVisible = visMap?.get(mod.id) !== false;
          const isOwner = role === "owner";
          return (
            <div
              key={mod.id}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-lg border transition-colors",
                isVisible
                  ? "border-border bg-card"
                  : "border-border/40 bg-muted/20"
              )}
            >
              <div className="flex items-center gap-3">
                {isVisible
                  ? <Eye className="h-4 w-4 text-green-400 shrink-0" />
                  : <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
                }
                <div>
                  <p className={cn("text-sm font-medium", !isVisible && "text-muted-foreground")}>
                    {mod.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{mod.description}</p>
                </div>
              </div>
              <Switch
                checked={isVisible}
                disabled={isOwner}
                onCheckedChange={(checked) =>
                  toggle.mutate({ role, module: mod.id, is_visible: checked })
                }
              />
            </div>
          );
        })}
      </div>

      {role === "owner" && (
        <p className="text-xs text-muted-foreground">
          El Owner siempre ve todos los módulos.
        </p>
      )}
    </div>
  );
}

export default function ModuleAccessSection() {
  const [activeRole, setActiveRole] = useState("editor");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Visibilidad de Módulos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Controla qué módulos aparecen en el sidebar para cada rol
        </p>
      </div>

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
            Sidebar — {ROLES.find(r => r.id === activeRole)?.label}
          </p>
          <p className="text-xs text-muted-foreground">Se guardan automáticamente</p>
        </div>
        <RoleVisibilityMatrix role={activeRole} />
      </Card>
    </div>
  );
}
