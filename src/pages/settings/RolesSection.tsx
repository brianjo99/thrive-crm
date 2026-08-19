import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Crown, Scissors, UserRound } from "lucide-react";

const ROLES = [
  {
    id: "owner",
    label: "Owner",
    icon: Crown,
    badge: "Acceso total",
    color: "text-primary",
    description: "Administra clientes, campañas, finanzas, usuarios, configuración y todos los flujos de producción.",
    capabilities: ["Administración del CRM", "Operaciones y finanzas", "Usuarios y seguridad", "Configuración de módulos"],
  },
  {
    id: "editor",
    label: "Editor",
    icon: Scissors,
    badge: "Producción",
    color: "text-purple-400",
    description: "Trabaja con tareas y archivos de edición sin acceso a administración, finanzas ni configuración.",
    capabilities: ["Tareas asignadas", "Carga y actualización de archivos", "Consulta de call sheets"],
  },
  {
    id: "videographer",
    label: "Videographer",
    icon: Camera,
    badge: "Filmación",
    color: "text-cyan-400",
    description: "Accede a su operación de rodaje y a las tareas necesarias para ejecutar una filmación.",
    capabilities: ["Tareas asignadas", "Shot lists", "Call sheets y agenda de rodaje"],
  },
  {
    id: "client",
    label: "Cliente",
    icon: UserRound,
    badge: "Portal externo",
    color: "text-orange-400",
    description: "No entra al panel interno. Consulta entregables y aprobaciones mediante un enlace seguro del portal.",
    capabilities: ["Portal de campaña", "Revisión de entregables", "Aprobación o solicitud de cambios"],
  },
] as const;

export default function RolesSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Roles del sistema</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Capacidades protegidas por las políticas de la base de datos
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES.map(role => {
          const Icon = role.icon;
          return (
            <Card key={role.id} className="luxury-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                    <Icon className={`h-5 w-5 ${role.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{role.label}</h3>
                    <Badge variant="secondary" className="mt-1 text-[11px]">{role.badge}</Badge>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{role.description}</p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {role.capabilities.map(capability => (
                  <li key={capability} className="flex gap-2 text-foreground/80">
                    <span aria-hidden="true" className="text-primary">•</span>
                    {capability}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        La visibilidad del menú se configura en <strong className="text-foreground">Visibilidad de módulos</strong>.
        Las operaciones sensibles permanecen protegidas por rol en Supabase y no pueden ampliarse desde el navegador.
      </Card>
    </div>
  );
}
