import { useSearchParams } from "react-router-dom";
import { Settings, Users, Shield, UserSquare2, Eye, ClipboardList, Lock, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const active = params.get("tab") ?? "general";
  const setTab = (id: string) => setParams({ tab: id });

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Settings</h1>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)]">
        {/* Left nav */}
        <aside className="w-56 shrink-0 border-r border-border p-4 space-y-1">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setTab(s.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
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
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 max-w-4xl">
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
