import { cn } from "@/lib/utils";
import { UserRole } from "@/types/thrive";
import { useThriveStore } from "@/stores/thriveStore";
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  FileStack, 
  Settings,
  Scissors,
  Camera,
  Crown,
  ChevronDown,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const mainNavItems = [
  { title: "Today", url: "/", icon: LayoutDashboard },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Campaigns", url: "/campaigns", icon: FolderKanban },
  { title: "Templates", url: "/templates", icon: FileStack },
];

const roleNavItems: Record<UserRole, { title: string; url: string; icon: typeof LayoutDashboard }[]> = {
  owner: [
    { title: "Today", url: "/", icon: LayoutDashboard },
    { title: "Clients", url: "/clients", icon: Users },
    { title: "Campaigns", url: "/campaigns", icon: FolderKanban },
    { title: "Templates", url: "/templates", icon: FileStack },
  ],
  editor: [
    { title: "My Tasks", url: "/editor", icon: Scissors },
    { title: "Assets", url: "/editor/assets", icon: FolderKanban },
  ],
  videographer: [
    { title: "My Tasks", url: "/videographer", icon: Camera },
    { title: "Shot Lists", url: "/videographer/shots", icon: FileStack },
  ],
};

const roleConfig: Record<UserRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: "Brian (Owner)", icon: Crown, color: "text-primary" },
  editor: { label: "Editor View", icon: Scissors, color: "text-[hsl(280_60%_50%)]" },
  videographer: { label: "Videographer View", icon: Camera, color: "text-[hsl(200_70%_50%)]" },
};

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { currentRole, setCurrentRole } = useThriveStore();
  
  const isCollapsed = state === "collapsed";
  const navItems = roleNavItems[currentRole];
  const currentRoleConfig = roleConfig[currentRole];
  const RoleIcon = currentRoleConfig.icon;

  return (
    <Sidebar
      className={cn(
        "border-r border-sidebar-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        <div className={cn(
          "flex items-center gap-3 transition-all",
          isCollapsed && "justify-center"
        )}>
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
                const isActive = location.pathname === item.url;
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                isCollapsed && "justify-center px-2"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                "bg-sidebar-accent"
              )}>
                <RoleIcon className={cn("h-4 w-4", currentRoleConfig.color)} />
              </div>
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left text-sm">{currentRoleConfig.label}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {(Object.keys(roleConfig) as UserRole[]).map((role) => {
              const config = roleConfig[role];
              const Icon = config.icon;
              return (
                <DropdownMenuItem
                  key={role}
                  onClick={() => setCurrentRole(role)}
                  className="flex items-center gap-3"
                >
                  <Icon className={cn("h-4 w-4", config.color)} />
                  <span>{config.label}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
