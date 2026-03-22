import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUnpaidAlerts, useDismissAlert, useUserRole } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, Scissors, Camera, Bell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertBanner } from "@/components/thrive/AlertsPanel";
import { toast } from "sonner";

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-primary" },
  editor: { label: "Editor", icon: Scissors, color: "text-[hsl(280_60%_50%)]" },
  videographer: { label: "Videographer", icon: Camera, color: "text-[hsl(200_70%_50%)]" },
  client: { label: "Client", icon: Crown, color: "text-muted-foreground" },
};

export function TopBar() {
  const { data: userRole } = useUserRole();
  const { data: alerts = [] } = useUnpaidAlerts();
  const dismissAlert = useDismissAlert();
  const { signOut, user } = useAuth();

  const role = userRole || "owner";
  const config = roleConfig[role] || roleConfig.owner;
  const RoleIcon = config.icon;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

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
        {alerts.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-warning text-warning-foreground text-xs rounded-full flex items-center justify-center">
                  {alerts.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0">
              <div className="p-4 border-b border-border">
                <h4 className="font-display font-semibold">Alerts</h4>
              </div>
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {alerts.map((alert) => (
                  <AlertBanner
                    key={alert.id}
                    alert={{
                      id: alert.id,
                      clientId: alert.client_id,
                      clientName: (alert as any).clients?.name || "Client",
                      servicePerformed: alert.service_performed,
                      message: alert.message,
                      createdAt: new Date(alert.created_at),
                      dismissed: alert.dismissed,
                    }}
                    onDismiss={() => dismissAlert.mutate(alert.id)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
