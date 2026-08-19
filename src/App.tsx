import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/thrive/AppSidebar";
import { TopBar } from "@/components/thrive/TopBar";
import { ProtectedRoute, RoleRoute } from "@/components/thrive/ProtectedRoute";

const queryClient = new QueryClient();

const Index = lazy(() => import("./pages/Index"));
const BrianDashboard = lazy(() => import("./pages/BrianDashboard"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage"));
const EditorDashboard = lazy(() => import("./pages/EditorDashboard"));
const EditorAssetsPage = lazy(() => import("./pages/EditorAssetsPage"));
const VideographerDashboard = lazy(() => import("./pages/VideographerDashboard"));
const VideographerShotsPage = lazy(() => import("./pages/VideographerShotsPage"));
const AssetsPage = lazy(() => import("./pages/AssetsPage"));
const ApprovalsPage = lazy(() => import("./pages/ApprovalsPage"));
const CampaignDetailPage = lazy(() => import("./pages/CampaignDetailPage"));
const ClientDetailPage = lazy(() => import("./pages/ClientDetailPage"));
const ShotListsPage = lazy(() => import("./pages/ShotListsPage"));
const FilmacionPage = lazy(() => import("./pages/FilmacionPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const LeadsPage = lazy(() => import("./pages/LeadsPage"));
const AdsPage = lazy(() => import("./pages/AdsPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const ScriptsPage = lazy(() => import("./pages/ScriptsPage"));
const CallSheetsPage = lazy(() => import("./pages/CallSheetsPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const ReportingPage = lazy(() => import("./pages/ReportingPage"));
const QuotesPage = lazy(() => import("./pages/QuotesPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WebsitesPage = lazy(() => import("./pages/WebsitesPage"));
const WebsiteEditorPage = lazy(() => import("./pages/WebsiteEditorPage"));
const WebsitePreviewPage = lazy(() => import("./pages/WebsitePreviewPage"));
const ClientPortalPage = lazy(() => import("./pages/ClientPortalPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-primary-foreground font-display font-bold text-lg">T</span>
        </div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

function AccessNotice({
  title,
  description,
  retry,
  signOut,
}: {
  title: string;
  description: string;
  retry?: () => void;
  signOut: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 font-display font-bold">T</div>
        <h1 className="font-display text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-center gap-2">
          {retry && <Button onClick={retry}>Reintentar</Button>}
          <Button variant={retry ? "outline" : "default"} onClick={signOut}>Cerrar sesión</Button>
        </div>
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { user, loading, accessLoading, accountStatus, role, signOut, refreshAccess } = useAuth();

  if (loading || accessLoading) return <FullPageLoader />;

  if (!user) return <Navigate to="/auth" replace />;

  if (accountStatus === "suspended" || accountStatus === "disabled") {
    return (
      <AccessNotice
        title="Cuenta sin acceso"
        description="Esta cuenta está suspendida o desactivada. Contacta al Owner del CRM para recuperar el acceso."
        signOut={() => void signOut()}
      />
    );
  }

  if (accountStatus === "error") {
    return (
      <AccessNotice
        title="No pudimos verificar tu acceso"
        description="La sesión está activa, pero no fue posible confirmar los permisos de la cuenta."
        retry={() => void refreshAccess()}
        signOut={() => void signOut()}
      />
    );
  }

  if (accountStatus === "active" && role === "client") {
    return <Navigate to="/portal" replace />;
  }

  if (accountStatus !== "active" || !role) {
    return (
      <AccessNotice
        title="Acceso pendiente"
        description="Tu cuenta existe, pero todavía no tiene un rol interno habilitado. Solicita al Owner que complete la asignación."
        signOut={() => void signOut()}
      />
    );
  }

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
              <Route path="/editor" element={<RoleRoute roles={["editor", "owner"]}><EditorDashboard /></RoleRoute>} />
              <Route path="/editor/assets" element={<RoleRoute roles={["editor", "owner"]}><EditorAssetsPage /></RoleRoute>} />
              <Route path="/videographer" element={<RoleRoute roles={["videographer", "owner"]}><VideographerDashboard /></RoleRoute>} />
              <Route path="/videographer/shots" element={<RoleRoute roles={["videographer", "owner"]}><VideographerShotsPage /></RoleRoute>} />
              <Route path="/shot-lists" element={<ProtectedRoute module="call_sheets"><ShotListsPage /></ProtectedRoute>} />
              <Route path="/filmacion" element={<ProtectedRoute module="call_sheets"><FilmacionPage /></ProtectedRoute>} />
              <Route path="/leads" element={<ProtectedRoute module="leads"><LeadsPage /></ProtectedRoute>} />
              <Route path="/ads" element={<ProtectedRoute module="ads"><AdsPage /></ProtectedRoute>} />
              <Route path="/sites" element={<ProtectedRoute module="leads"><WebsitesPage /></ProtectedRoute>} />
              <Route path="/sites/editor/:id" element={<ProtectedRoute module="leads"><WebsiteEditorPage /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute module="calendar"><CalendarPage /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute module="invoices"><InvoicesPage /></ProtectedRoute>} />
              <Route path="/quotes" element={<ProtectedRoute module="invoices"><QuotesPage /></ProtectedRoute>} />
              <Route path="/scripts" element={<ProtectedRoute module="scripts"><ScriptsPage /></ProtectedRoute>} />
              <Route path="/call-sheets" element={<ProtectedRoute module="call_sheets"><CallSheetsPage /></ProtectedRoute>} />
              <Route path="/tasks" element={<ProtectedRoute module="tasks"><TasksPage /></ProtectedRoute>} />
              <Route path="/reporting" element={<ProtectedRoute module="dashboard"><ReportingPage /></ProtectedRoute>} />
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

function ClientPortalRoute() {
  const { user, loading, accessLoading, accountStatus, role, signOut, refreshAccess } = useAuth();

  if (loading || accessLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/auth" replace />;

  if (accountStatus === "suspended" || accountStatus === "disabled") {
    return (
      <AccessNotice
        title="Cuenta sin acceso"
        description="Esta cuenta está suspendida o desactivada. Contacta a tu equipo de Thrive para recuperar el acceso."
        signOut={() => void signOut()}
      />
    );
  }

  if (accountStatus === "error") {
    return (
      <AccessNotice
        title="No pudimos verificar tu acceso"
        description="La sesión está activa, pero no fue posible confirmar los permisos del portal."
        retry={() => void refreshAccess()}
        signOut={() => void signOut()}
      />
    );
  }

  if (accountStatus === "active" && role === "client") return <ClientPortalPage />;
  if (accountStatus === "active" && role) return <Navigate to="/" replace />;

  return (
    <AccessNotice
      title="Portal pendiente"
      description="Tu cuenta todavía no tiene un cliente vinculado. Contacta a tu equipo de Thrive para completar el acceso."
      signOut={() => void signOut()}
    />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<FullPageLoader />}>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/sites/preview/:id" element={<WebsitePreviewPage />} />
              <Route path="/portal" element={<ClientPortalRoute />} />
              <Route path="/*" element={<ProtectedLayout />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
