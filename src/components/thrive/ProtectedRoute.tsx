import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useSupabaseData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function roleHome(role: string | null | undefined): string {
  if (role === "editor") return "/editor";
  if (role === "videographer") return "/videographer";
  if (role === "client") return "/portal";
  return "/dashboard";
}

function useModuleAccess(module: string) {
  const { data: role } = useUserRole();

  return useQuery({
    queryKey: ["module_access", role, module],
    queryFn: async () => {
      if (!role) return false;
      // Owner always has access
      if (role === "owner") return true;
      const { data } = await supabase
        .from("module_visibility")
        .select("is_visible")
        .eq("role", role)
        .eq("module", module)
        .maybeSingle();
      // No row found → deny by default for non-owner roles
      if (!data) return false;
      return data.is_visible;
    },
    enabled: !!role,
    staleTime: 60_000,
  });
}

/**
 * Module-based guard. Checks module_visibility for the current role.
 * Redirects to the user's role home if access is denied.
 */
export function ProtectedRoute({
  module,
  children,
}: {
  module: string;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: canAccess, isLoading: accessLoading } = useModuleAccess(module);

  if (!user) return <Navigate to="/auth" replace />;
  if (roleLoading || accessLoading) return null;

  // No role row or unknown role → deny
  if (!role) return <Navigate to="/auth" replace />;

  // Access denied → send to role's own home (prevents dashboard loop)
  if (canAccess === false) return <Navigate to={roleHome(role)} replace />;

  return <>{children}</>;
}

/**
 * Role-based guard. Only allows users whose role is in the `roles` array.
 * Use for pages that belong to a specific role (editor/videographer dashboards).
 */
export function RoleRoute({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { data: role, isLoading } = useUserRole();

  if (!user) return <Navigate to="/auth" replace />;
  if (isLoading) return null;

  // Unknown/missing role → deny
  if (!role || !roles.includes(role)) {
    return <Navigate to={roleHome(role)} replace />;
  }

  return <>{children}</>;
}
