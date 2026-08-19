import { Navigate, useSearchParams } from "react-router-dom";
import { Settings, Users, Shield, UserSquare2, Eye, ClipboardList, Lock, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useSupabaseData";
import GeneralSection from "./settings/GeneralSection";
import AccountsSection from "./settings/AccountsSection";
import RolesSection from "./settings/RolesSection";
import TeamsSection from "./settings/TeamsSection";
import ModuleAccessSection from "./settings/ModuleAccessSection";
import AuditSection from "./settings/AuditSection";
import SecuritySection from "./settings/SecuritySection";

const SECTIONS = [
  { id: "general",  label: "General",            icon: SlidersHorizontal },
  { id: "accounts", label: "Cuentas",             icon: Users },
  { id: "roles",    label: "Roles y Permisos",    icon: Shield },
  { id: "modules",  label: "Visibilidad Módulos", icon: Eye },
  { id: "teams",    label: "Equipos",             icon: UserSquare2 },
  { id: "audit",    label: "Audit Log",           icon: ClipboardList },
  { id: "security", label: "Seguridad",           icon: Lock },
];

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const { data: role, isLoading } = useUserRole();
  const active = params.get("tab") ?? "general";
  const setTab = (id: string) => setParams({ tab: id });

  if (isLoading) return null;
  if (role !== "owner") return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Configuración</h1>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)] flex-col md:flex-row">
        {/* Left nav */}
        <aside className="w-full shrink-0 border-b border-border p-3 md:w-56 md:border-b-0 md:border-r md:p-4">
          <div className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setTab(s.id)}
                  aria-current={active === s.id ? "page" : undefined}
                  className={cn(
                    "flex w-auto shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition-colors md:w-full",
                    active === s.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 w-full flex-1 p-4 sm:p-6 max-w-4xl">
          {active === "general"  && <GeneralSection />}
          {active === "accounts" && <AccountsSection />}
          {active === "roles"    && <RolesSection />}
          {active === "modules"  && <ModuleAccessSection />}
          {active === "teams"    && <TeamsSection />}
          {active === "audit"    && <AuditSection />}
          {active === "security" && <SecuritySection />}
        </main>
      </div>
    </div>
  );
}
