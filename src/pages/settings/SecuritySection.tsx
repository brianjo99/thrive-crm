import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

function useSuspendedAccounts() {
  return useQuery({
    queryKey: ["suspended_accounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, email, status, last_seen_at")
        .in("status", ["suspended", "disabled"]);
      return data ?? [];
    },
  });
}

export default function SecuritySection() {
  const { data: suspendedAccounts = [] } = useSuspendedAccounts();

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success(`Email de reset enviado a ${email}`);
  };

  const reactivate = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active" })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else toast.success("Cuenta reactivada");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Seguridad</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Control de acceso y administración de cuentas suspendidas
        </p>
      </div>

      {/* Suspended accounts */}
      <Card className="luxury-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          <h3 className="font-semibold">Cuentas suspendidas o desactivadas</h3>
          {suspendedAccounts.length > 0 && (
            <Badge className="bg-yellow-500/15 text-yellow-400 text-xs">{suspendedAccounts.length}</Badge>
          )}
        </div>

        {suspendedAccounts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <CheckCircle className="h-4 w-4 text-green-400" />
            Todas las cuentas están activas
          </div>
        ) : (
          <div className="space-y-3">
            {suspendedAccounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{acc.display_name ?? "Sin nombre"}</p>
                  {acc.email && <p className="text-xs text-muted-foreground">{acc.email}</p>}
                  {acc.last_seen_at && (
                    <p className="text-xs text-muted-foreground">
                      Último acceso: {format(new Date(acc.last_seen_at), "d MMM yyyy")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-500/15 text-yellow-400 text-xs capitalize">{acc.status}</Badge>
                  <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => reactivate(acc.id)}>
                    <RefreshCw className="h-3 w-3" /> Reactivar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Password reset */}
      <Card className="luxury-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Reset de contraseña</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Para forzar un reset de contraseña, ve a <strong>Cuentas</strong>, abre el perfil del usuario
          y usa la opción de reset desde el menú de acciones. El usuario recibirá un email con el enlace.
        </p>
        <p className="text-xs text-muted-foreground">
          También puedes enviar el reset desde aquí si tienes el email del usuario.
        </p>
      </Card>

      {/* Future features notice */}
      <Card className="luxury-card p-5 border-border/40 bg-muted/10">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Próximamente
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Autenticación de dos factores (2FA)</p>
          <p>• Allowlist de dominios de email</p>
          <p>• Invitaciones por email (invite-only)</p>
          <p>• Políticas de contraseñas</p>
          <p>• Sesiones activas por usuario</p>
        </div>
      </Card>
    </div>
  );
}
