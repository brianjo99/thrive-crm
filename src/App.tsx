import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/thrive/AppSidebar";
import { TopBar } from "@/components/thrive/TopBar";
import Index from "./pages/Index";
import BrianDashboard from "./pages/BrianDashboard";
import ClientsPage from "./pages/ClientsPage";
import CampaignsPage from "./pages/CampaignsPage";
import TemplatesPage from "./pages/TemplatesPage";
import EditorDashboard from "./pages/EditorDashboard";
import EditorAssetsPage from "./pages/EditorAssetsPage";
import VideographerDashboard from "./pages/VideographerDashboard";
import VideographerShotsPage from "./pages/VideographerShotsPage";
import AssetsPage from "./pages/AssetsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import CampaignDetailPage from "./pages/CampaignDetailPage";
import ShotListsPage from "./pages/ShotListsPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-primary-foreground font-display font-bold text-lg">T</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<BrianDashboard />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/editor" element={<EditorDashboard />} />
              <Route path="/editor/assets" element={<EditorAssetsPage />} />
              <Route path="/videographer" element={<VideographerDashboard />} />
              <Route path="/videographer/shots" element={<VideographerShotsPage />} />
              <Route path="/shot-lists" element={<ShotListsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
