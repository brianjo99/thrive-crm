import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUnpaidAlerts, useDismissAlert, useUserRole, useNotifications, useMarkNotificationRead, useDeleteNotification } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, Scissors, Camera, Bell, LogOut, Check, Trash2, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertBanner } from "@/components/thrive/AlertsPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-primary" },
  editor: { label: "Editor", icon: Scissors, color: "text-[hsl(280_60%_50%)]" },
  videographer: { label: "Videographer", icon: Camera, color: "text-[hsl(200_70%_50%)]" },
  client: { label: "Client", icon: Crown, color: "text-muted-foreground" },
};

const notificationTypeIcon: Record<string, string> = {
  approval: "✅",
  task: "📋",
  campaign: "📁",
  asset: "📎",
  message: "💬",
};

export function TopBar() {
  const { data: userRole } = useUserRole();
  const { data: alerts = [] } = useUnpaidAlerts();
  const { data: notifications = [] } = useNotifications();
  const dismissAlert = useDismissAlert();
  const markRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();
  const { signOut } = useAuth();

  const role = userRole || "owner";
  const config = roleConfig[role] || roleConfig.owner;
  const RoleIcon = config.icon;

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalBadge = alerts.length + unreadCount;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markRead.mutateAsync(n.id)));
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
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {totalBadge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-warning text-warning-foreground text-xs rounded-full flex items-center justify-center font-medium">
                  {totalBadge > 9 ? "9+" : totalBadge}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0 shadow-xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h4 className="font-display font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleMarkAllRead}>
                  <CheckCheck className="h-3 w-3" /> Mark all read
                </Button>
              )}
            </div>

            <ScrollArea className="max-h-96">
              {alerts.length === 0 && notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-3">
                      <AlertBanner
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
                    </div>
                  ))}

                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <span className="text-lg mt-0.5 flex-shrink-0">
                        {notificationTypeIcon[n.type] || "🔔"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!n.read && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markRead.mutate(n.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteNotification.mutate(n.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
