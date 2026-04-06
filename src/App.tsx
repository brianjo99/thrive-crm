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
import ClientDetailPage from "./pages/ClientDetailPage";
import ClientPortalPage from "./pages/ClientPortalPage";
import ShotListsPage from "./pages/ShotListsPage";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LeadsPage from "./pages/LeadsPage";
import AdsPage from "./pages/AdsPage";
import CalendarPage from "./pages/CalendarPage";
import InvoicesPage from "./pages/InvoicesPage";
import ScriptsPage from "./pages/ScriptsPage";
import CallSheetsPage from "./pages/CallSheetsPage";
import TasksPage from "./pages/TasksPage";
import HelpPage from "./pages/HelpPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import { ProtectedRoute, RoleRoute } from "@/components/thrive/ProtectedRoute";

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
              <Route path="/dashboard" element={<ProtectedRoute module="dashboard"><BrianDashboard /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute module="clients"><ClientsPage /></ProtectedRoute>} />
              <Route path="/clients/:id" element={<ProtectedRoute module="clients"><ClientDetailPage /></ProtectedRoute>} />
              <Route path="/campaigns" element={<ProtectedRoute module="campaigns"><CampaignsPage /></ProtectedRoute>} />
              <Route path="/campaigns/:id" element={<ProtectedRoute module="campaigns"><CampaignDetailPage /></ProtectedRoute>} />
              <Route path="/templates" element={<ProtectedRoute module="templates"><TemplatesPage /></ProtectedRoute>} />
              <Route path="/assets" element={<ProtectedRoute module="assets"><AssetsPage /></ProtectedRoute>} />
              <Route path="/approvals" element={<ProtectedRoute module="approvals"><ApprovalsPage /></ProtectedRoute>} />
              <Route path="/portal" element={<RoleRoute roles={["client"]}><ClientPortalPage /></RoleRoute>} />
              <Route path="/editor" element={<RoleRoute roles={["editor", "owner"]}><EditorDashboard /></RoleRoute>} />
              <Route path="/editor/assets" element={<RoleRoute roles={["editor", "owner"]}><EditorAssetsPage /></RoleRoute>} />
              <Route path="/videographer" element={<RoleRoute roles={["videographer", "owner"]}><VideographerDashboard /></RoleRoute>} />
              <Route path="/videographer/shots" element={<RoleRoute roles={["videographer", "owner"]}><VideographerShotsPage /></RoleRoute>} />
              <Route path="/shot-lists" element={<ProtectedRoute module="call_sheets"><ShotListsPage /></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute module="leads"><LeadsPage /></ProtectedRoute>} />
              <Route path="/ads" element={<ProtectedRoute module="ads"><AdsPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute module="calendar"><CalendarPage /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute module="invoices"><InvoicesPage /></ProtectedRoute>} />
              <Route path="/scripts" element={<ProtectedRoute module="scripts"><ScriptsPage /></ProtectedRoute>} />
              <Route path="/call-sheets" element={<ProtectedRoute module="call_sheets"><CallSheetsPage /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute module="tasks"><TasksPage /></ProtectedRoute>} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/manual" element={<Navigate to="/help" replace />} />
              <Route path="/settings" element={<ProtectedRoute module="settings"><SettingsPage /></ProtectedRoute>} />
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
