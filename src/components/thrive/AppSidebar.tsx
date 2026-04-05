import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useSupabaseData";
import { useRealtime } from "@/hooks/useRealtime";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarSeparator, useSidebar,
} from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, FolderKanban, FileStack, Scissors, Camera, Crown, Sparkles, FolderOpen, ShieldCheck, Clapperboard, TrendingUp, Megaphone, CalendarDays, Receipt, FileText, ClipboardList, BookOpen, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ViewRole = "owner" | "editor" | "videographer" | "client";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; module?: string };
type NavGroup = { label: string; items: NavItem[] };

const roleNavItems: Record<ViewRole, NavGroup[]> = {
  owner: [
    {
      label: "Producción",
      items: [
        { title: "Today",        url: "/dashboard",  icon: LayoutDashboard, module: "dashboard" },
        { title: "Clientes",     url: "/clients",    icon: Users,           module: "clients" },
        { title: "Campañas",     url: "/campaigns",  icon: FolderKanban,    module: "campaigns" },
        { title: "Tareas",       url: "/tasks",      icon: ClipboardList,   module: "tasks" },
        { title: "Calendario",   url: "/calendar",   icon: CalendarDays,    module: "calendar" },
        { title: "Scripts",      url: "/scripts",    icon: FileText,        module: "scripts" },
        { title: "Call Sheets",  url: "/shot-lists", icon: FileStack,       module: "call_sheets" },
        { title: "Archivos",     url: "/assets",     icon: FolderOpen,      module: "assets" },
        { title: "Aprobaciones", url: "/approvals",  icon: ShieldCheck,     module: "approvals" },
      ],
    },
    {
      label: "Gestión",
      items: [
        { title: "Facturas", url: "/invoices",  icon: Receipt,      module: "invoices" },
        { title: "Leads",    url: "/leads",     icon: TrendingUp,   module: "leads" },
        { title: "Media Buying", url: "/ads",       icon: Megaphone,    module: "ads" },
        { title: "Plantillas",   url: "/templates", icon: Clapperboard, module: "templates" },
      ],
    },
    {
      label: "Sistema",
      items: [
        { title: "Help",     url: "/help",      icon: BookOpen },
        { title: "Settings", url: "/settings",  icon: Settings, module: "settings" },
      ],
    },
  ],
  editor: [
    {
      label: "Producción",
      items: [
        { title: "My Tasks",  url: "/editor",        icon: Scissors },
        { title: "Archivos",  url: "/editor/assets", icon: FolderOpen },
        { title: "Shot Lists",url: "/shot-lists",    icon: FileStack },
      ],
    },
    {
      label: "Ayuda",
      items: [{ title: "Help", url: "/help", icon: BookOpen }],
    },
  ],
  videographer: [
    {
      label: "Producción",
      items: [
        { title: "My Tasks",   url: "/videographer",       icon: Camera },
        { title: "Shot Lists", url: "/videographer/shots", icon: FileStack },
      ],
    },
    {
      label: "Ayuda",
      items: [{ title: "Help", url: "/help", icon: BookOpen }],
    },
  ],
  client: [
    {
      label: "Cliente",
      items: [
        { title: "Today", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
        { title: "Help",  url: "/help",      icon: BookOpen },
      ],
    },
  ],
};

function useModuleVisibility(role: string | null) {
  return useQuery({
    queryKey: ["module_visibility_role", role],
    queryFn: async () => {
      if (!role) return new Map<string, boolean>();
      const { data } = await supabase
        .from("module_visibility")
        .select("module, is_visible")
        .eq("role", role);
      return new Map((data ?? []).map((r: any) => [r.module, r.is_visible]));
    },
    enabled: !!role,
    staleTime: 60_000,
  });
}

const roleConfig: Record<ViewRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Owner", icon: Crown, color: "text-primary" },
  editor: { label: "Editor", icon: Scissors, color: "text-[hsl(280_60%_50%)]" },
  videographer: { label: "Videographer", icon: Camera, color: "text-[hsl(200_70%_50%)]" },
  client: { label: "Client", icon: Users, color: "text-muted-foreground" },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { data: userRole } = useUserRole();
  const { user } = useAuth();

  // Activate real-time subscriptions globally
  useRealtime();

  // Map known roles to their nav. Unknown/null falls to "owner" nav but
  // ProtectedRoute blocks actual route access — this is cosmetic only.
  const currentRole: ViewRole =
    userRole === "editor" || userRole === "videographer" || userRole === "client"
      ? userRole
      : "owner";
  const isCollapsed = state === "collapsed";
  const { data: visibilityMap } = useModuleVisibility(currentRole);

  // Filter nav items based on module_visibility table (if available)
  const allNavGroups = roleNavItems[currentRole];
  const navGroups = visibilityMap && visibilityMap.size > 0
    ? allNavGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item => !item.module || visibilityMap.get(item.module) !== false),
        }))
        .filter(group => group.items.length > 0)
    : allNavGroups;
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
        {navGroups.map((group, groupIndex) => (
          <div key={group.label}>
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-2">
                  {group.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
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
            {groupIndex < navGroups.length - 1 && !isCollapsed && <SidebarSeparator className="my-2 mx-2" />}
          </div>
        ))}
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
