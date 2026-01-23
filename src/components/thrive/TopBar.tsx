import { SidebarTrigger } from "@/components/ui/sidebar";
import { useThriveStore } from "@/stores/thriveStore";
import { Crown, Scissors, Camera, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertBanner } from "@/components/thrive/AlertsPanel";

const roleConfig = {
  owner: { label: "Brian", icon: Crown, color: "text-primary" },
  editor: { label: "Editor", icon: Scissors, color: "text-[hsl(280_60%_50%)]" },
  videographer: { label: "Videographer", icon: Camera, color: "text-[hsl(200_70%_50%)]" },
};

export function TopBar() {
  const { currentRole, unpaidAlerts, dismissAlert } = useThriveStore();
  const config = roleConfig[currentRole];
  const RoleIcon = config.icon;
  const activeAlerts = unpaidAlerts.filter(a => !a.dismissed);

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          <RoleIcon className={cn("h-4 w-4", config.color)} />
          <span className="text-sm font-medium">{config.label} View</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeAlerts.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-warning text-warning-foreground text-xs rounded-full flex items-center justify-center">
                  {activeAlerts.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0">
              <div className="p-4 border-b border-border">
                <h4 className="font-display font-semibold">Alerts</h4>
              </div>
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {activeAlerts.map((alert) => (
                  <AlertBanner
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => dismissAlert(alert.id)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}
