import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useSupabaseData";
import { useRealtime } from "@/hooks/useRealtime";
import { 
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, FolderKanban, FileStack, Scissors, Camera, Crown, Sparkles, FolderOpen, ShieldCheck, Clapperboard, TrendingUp, Megaphone, CalendarDays, Receipt, FileText, ClipboardList } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type ViewRole = "owner" | "editor" | "videographer";

const roleNavItems: Record<ViewRole, { title: string; url: string; icon: typeof LayoutDashboard }[]> = {
  owner: [
    { title: "Today", url: "/dashboard", icon: LayoutDashboard },
    { title: "Clients", url: "/clients", icon: Users },
    { title: "Campaigns", url: "/campaigns", icon: FolderKanban },
    { title: "Tasks", url: "/tasks", icon: ClipboardList },
    { title: "Calendar", url: "/calendar", icon: CalendarDays },
    { title: "Scripts", url: "/scripts", icon: FileText },
    { title: "Call Sheets", url: "/shot-lists", icon: FileStack },
    { title: "Assets", url: "/assets", icon: FolderOpen },
    { title: "Approvals", url: "/approvals", icon: ShieldCheck },
    { title: "Invoices", url: "/invoices", icon: Receipt },
    { title: "Leads", url: "/leads", icon: TrendingUp },
    { title: "Ads", url: "/ads", icon: Megaphone },
    { title: "Templates", url: "/templates", icon: Clapperboard },
  ],
  editor: [
    { title: "My Tasks", url: "/editor", icon: Scissors },
    { title: "Assets", url: "/editor/assets", icon: FolderOpen },
    { title: "Shot Lists", url: "/shot-lists", icon: FileStack },
  ],
  videographer: [
    { title: "My Tasks", url: "/videographer", icon: Camera },
    { title: "Shot Lists", url: "/videographer/shots", icon: FileStack },
  ],
};

const roleConfig: Record<ViewRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-primary" },
  editor: { label: "Editor", icon: Scissors, color: "text-[hsl(280_60%_50%)]" },
  videographer: { label: "Videographer", icon: Camera, color: "text-[hsl(200_70%_50%)]" },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { data: userRole } = useUserRole();
  const { user } = useAuth();

  // Activate real-time subscriptions globally
  useRealtime();

  const currentRole: ViewRole = (userRole === "editor" || userRole === "videographer") ? userRole : "owner";
  const isCollapsed = state === "collapsed";
  const navItems = roleNavItems[currentRole];
  const currentRoleConfig = roleConfig[currentRole];
  const RoleIcon = currentRoleConfig.icon;
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <Sidebar
      className={cn("border-r border-sidebar-border transition-all duration-300", isCollapsed ? "w-16" : "w-64")}
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className={cn("flex items-center gap-3 transition-all", isCollapsed && "justify-center")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-5 w-5 text-sidebar-background" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-display text-lg font-bold text-sidebar-foreground">Thrive</h1>
              <p className="text-xs text-sidebar-foreground/60">Campaign OS</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-2">
              Navigation
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.url ||
                  (item.url !== "/dashboard" && location.pathname.startsWith(item.url + "/"));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                          "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                          isActive && "bg-sidebar-accent text-sidebar-primary font-medium"
                        )}
                      >
                        <item.icon className={cn("h-5 w-5", isActive && "text-sidebar-primary")} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center">
            <RoleIcon className={cn("h-4 w-4", currentRoleConfig.color)} />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-xs text-sidebar-foreground/60">{currentRoleConfig.label}</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
