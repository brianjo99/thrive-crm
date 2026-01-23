import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/thrive/AppSidebar";
import { TopBar } from "@/components/thrive/TopBar";
import BrianDashboard from "./pages/BrianDashboard";
import ClientsPage from "./pages/ClientsPage";
import CampaignsPage from "./pages/CampaignsPage";
import TemplatesPage from "./pages/TemplatesPage";
import EditorDashboard from "./pages/EditorDashboard";
import EditorAssetsPage from "./pages/EditorAssetsPage";
import VideographerDashboard from "./pages/VideographerDashboard";
import VideographerShotsPage from "./pages/VideographerShotsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <main className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/" element={<BrianDashboard />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/templates" element={<TemplatesPage />} />
                  <Route path="/editor" element={<EditorDashboard />} />
                  <Route path="/editor/assets" element={<EditorAssetsPage />} />
                  <Route path="/videographer" element={<VideographerDashboard />} />
                  <Route path="/videographer/shots" element={<VideographerShotsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
