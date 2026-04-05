import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ClipboardList, User } from "lucide-react";

type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_name: string | null;
  old_value: any;
  new_value: any;
  created_at: string;
};

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  change_role:    { label: "Cambio de rol",    color: "bg-blue-500/15 text-blue-400" },
  change_status:  { label: "Cambio de estado", color: "bg-yellow-500/15 text-yellow-400" },
  create_team:    { label: "Equipo creado",    color: "bg-green-500/15 text-green-400" },
  delete_team:    { label: "Equipo eliminado", color: "bg-red-500/15 text-red-400" },
  change_perm:    { label: "Permisos",         color: "bg-purple-500/15 text-purple-400" },
  change_setting: { label: "Configuración",    color: "bg-orange-500/15 text-orange-400" },
};

function useAuditLogs() {
  return useQuery({
    queryKey: ["audit_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return [] as AuditLog[];
      return (data ?? []) as AuditLog[];
    },
  });
}

function formatAction(log: AuditLog): string {
  switch (log.action) {
    case "change_role":
      return `Rol cambiado a "${log.new_value?.role ?? "—"}"`;
    case "change_status":
      return `Estado cambiado a "${log.new_value?.status ?? "—"}"`;
    default:
      return log.action.replace(/_/g, " ");
  }
}

export default function AuditSection() {
  const { data: logs = [], isLoading } = useAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Registro de todos los cambios administrativos del CRM
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Cargando registros...</div>
      ) : logs.length === 0 ? (
        <Card className="luxury-card p-12 text-center">
          <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold mb-2">Sin registros todavía</p>
          <p className="text-muted-foreground text-sm">
            Los cambios administrativos aparecerán aquí automáticamente.
          </p>
        </Card>
      ) : (
        <Card className="luxury-card overflow-hidden">
          <div className="divide-y divide-border">
            {logs.map(log => {
              const actionCfg = ACTION_CONFIG[log.action] ?? {
                label: log.action,
                color: "bg-muted text-muted-foreground",
              };
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {log.actor_name ?? "Sistema"}
                      </span>
                      <Badge className={`text-xs ${actionCfg.color}`}>
                        {actionCfg.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatAction(log)}
                      {log.resource_name && ` → ${log.resource_name}`}
                      {log.resource_id && !log.resource_name && ` → ${log.resource_id.slice(0, 8)}...`}
                    </p>
                    {log.old_value && log.new_value && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Antes: {JSON.stringify(log.old_value)} → Ahora: {JSON.stringify(log.new_value)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                    {format(new Date(log.created_at), "d MMM, HH:mm")}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
