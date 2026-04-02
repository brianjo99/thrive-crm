import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useSupabaseData";

const Index = () => {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) return null;

  if (role === "editor") return <Navigate to="/editor" replace />;
  if (role === "videographer") return <Navigate to="/videographer" replace />;
  return <Navigate to="/dashboard" replace />;
};

export default Index;
