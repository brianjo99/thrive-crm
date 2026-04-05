import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useSupabaseData";

const KNOWN_ROLES = ["owner", "editor", "videographer"] as const;

const Index = () => {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) return null;

  if (role === "editor") return <Navigate to="/editor" replace />;
  if (role === "videographer") return <Navigate to="/videographer" replace />;
  if (role === "owner") return <Navigate to="/dashboard" replace />;

  // No role row or unknown role (e.g. "client") → back to auth
  return <Navigate to="/auth" replace />;
};

export default Index;
