import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Megaphone, Plus, ExternalLink, CheckCircle, Clock, PauseCircle,
  XCircle, DollarSign, Settings, Share2, Sparkles, RefreshCw,
  TrendingUp, Users, ArrowUpRight, BarChart3, HelpCircle, Layers,
  Check, Play, Pause, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from "recharts";

type AdStatus = "active" | "planned" | "paused" | "inactive";

interface AdCampaign {
  id: string;
  name: string;
  platform: string;
  status: "active" | "paused";
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  dailyBudget: number;
}

// Simulated data for chart
const PERFORMANCE_DATA = [
  { date: "05-12", Meta: 400, Google: 240, TikTok: 150 },
  { date: "05-18", Meta: 450, Google: 280, TikTok: 180 },
  { date: "05-24", Meta: 520, Google: 310, TikTok: 220 },
  { date: "05-30", Meta: 610, Google: 380, TikTok: 290 },
  { date: "06-05", Meta: 780, Google: 420, TikTok: 350 },
  { date: "06-12", Meta: 950, Google: 540, TikTok: 480 }
];

export default function AdsPage() {
  const queryClient = useQueryClient();

  // Local storage configurations for mock account connections
  const [connectedAccounts, setConnectedAccounts] = useState<Record<string, boolean>>({
    meta_ads: true,
    google_ads: false,
    tiktok_ads: false,
    linkedin_ads: false
  });

  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Active campaigns state
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([
    { id: "c1", name: "Gym Promo - Verano 2026", platform: "meta_ads", status: "active", spend: 320.5, clicks: 420, impressions: 12500, conversions: 24, dailyBudget: 15 },
    { id: "c2", name: "Retargeting - Leads Fieles", platform: "meta_ads", status: "active", spend: 180.2, clicks: 210, impressions: 6800, conversions: 18, dailyBudget: 10 },
    { id: "c3", name: "Búsqueda Local - Implante Dental", platform: "google_ads", status: "active", spend: 450.0, clicks: 380, impressions: 5200, conversions: 35, dailyBudget: 25 },
    { id: "c4", name: "TikTok Trend Challenge - FitNation", platform: "tiktok_ads", status: "paused", spend: 120.0, clicks: 890, impressions: 45000, conversions: 12, dailyBudget: 20 }
  ]);

  // AI Generator state
  const [aiForm, setAiForm] = useState({
    businessName: "",
    businessType: "gym",
    offer: "",
    platform: "meta_ads"
  });
  const [aiGeneratedResult, setAiGeneratedResult] = useState<{
    headlines: string[];
    descriptions: string[];
    primaryText?: string;
  } | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Lead injection state
  const [leadForm, setLeadForm] = useState({
    campaignId: "c1",
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [injectingLead, setInjectingLead] = useState(false);

  // Connect platform mock animation flow
  const handleConnectPlatform = (platformId: string) => {
    if (connectedAccounts[platformId]) {
      setConnectedAccounts(prev => ({ ...prev, [platformId]: false }));
      toast.success("Cuenta desconectada exitosamente");
      return;
    }

    setConnectingPlatform(platformId);
    setTimeout(() => {
      setConnectedAccounts(prev => ({ ...prev, [platformId]: true }));
      setConnectingPlatform(null);
      toast.success(`Cuenta de ${platformId.replace("_", " ").toUpperCase()} conectada con éxito`);
    }, 2000);
  };

  // Toggle campaigns state
  const toggleCampaignStatus = (campaignId: string) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        const nextStatus = c.status === "active" ? "paused" : "active";
        toast.info(`Campaña "${c.name}" ${nextStatus === "active" ? "activada" : "pausada"}`);
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  const updateCampaignBudget = (campaignId: string, budget: number) => {
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaignId) {
        return { ...c, dailyBudget: budget };
      }
      return c;
    }));
  };

  // AI Copywriting simulation
  const handleGenerateAdCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiForm.businessName || !aiForm.offer) {
      toast.warning("Por favor completa el nombre de negocio y la oferta");
      return;
    }

    setGeneratingAi(true);
    setTimeout(() => {
      const name = aiForm.businessName;
      const offer = aiForm.offer;

      if (aiForm.platform === "google_ads") {
        setAiGeneratedResult({
          headlines: [
            `¡Consigue ${offer}! - ${name}`,
            `Oferta Exclusiva en ${name}`,
            `${aiForm.businessType.toUpperCase()} Nº1 en la Ciudad`
          ],
          descriptions: [
            `Aprovecha nuestra promoción única de ${offer}. Calidad garantizada. ¡Reserva tu plaza online hoy mismo!`,
            `En ${name} te ayudamos a conseguir tus objetivos. Equipo profesional, instalaciones premium. Regístrate ahora.`
          ]
        });
      } else {
        setAiGeneratedResult({
          headlines: [`🎯 ¡${offer}! Solo esta semana`],
          descriptions: [`Únete a ${name} y experimenta la diferencia. ¡Haz clic para reclamar esta oferta especial ahora!`],
          primaryText: `🔥 ¡ATENCIÓN! ¿Buscas la mejor oferta para tu bienestar?\n\nEn *${name}* hemos lanzado algo especial: **${offer}**.\n\nTransforma tu día a día con nuestro equipo y comunidad. Esta oferta expira pronto. \n\n👉 ¡Toca el botón de abajo y regístrate en menos de 1 minuto!`
        });
      }
      setGeneratingAi(false);
      toast.success("Copia publicitaria generada con Inteligencia Artificial");
    }, 1500);
  };

  // Inject lead into CRM
  const handleInjectLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.email) {
      toast.warning("Por favor ingresa al menos Nombre y Correo Electrónico");
      return;
    }

    setInjectingLead(true);
    const selectedCampaign = campaigns.find(c => c.id === leadForm.campaignId);
    const platformName = selectedCampaign ? selectedCampaign.platform.replace("_", " ").toUpperCase() : "ADS INTEGRATION";
    
    try {
      const { error } = await supabase.from("leads").insert({
        nombre: leadForm.name,
        email: leadForm.email,
        servicio: selectedCampaign?.name || "Ads Lead Capture",
        mensaje: leadForm.message || `Lead inyectado automáticamente mediante simulación de lead form en ${platformName}.`,
        status: "new",
        notes: `Origen: Ad Form [${selectedCampaign?.name}] - Tel: ${leadForm.phone}`
      });

      if (error) throw error;

      // Increment leads count in state
      setCampaigns(prev => prev.map(c => {
        if (c.id === leadForm.campaignId) {
          return { ...c, conversions: c.conversions + 1 };
        }
        return c;
      }));

      toast.success("¡Lead capturado e inyectado al CRM exitosamente!");
      setLeadForm({
        campaignId: "c1",
        name: "",
        email: "",
        phone: "",
        message: ""
      });
    } catch (err: any) {
      console.error(err);
      // Fallback message if table doesn't exist
      toast.error(`Error de base de datos: ${err.message}. Intentando simulación local...`);
      // Simular incremento de lead de todos modos para que el flujo visual no se rompa
      setCampaigns(prev => prev.map(c => {
        if (c.id === leadForm.campaignId) {
          return { ...c, conversions: c.conversions + 1 };
        }
        return c;
      }));
    } finally {
      setInjectingLead(false);
    }
  };

  // Metrics calculators
  const totalSpend = campaigns.reduce((acc, c) => acc + (c.status === "active" ? c.spend : 0), 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + c.conversions, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
  
  const avgCPL = totalConversions > 0 ? (totalSpend / totalConversions) : 0;
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100) : 0;
  const simulatedROI = avgCPL > 0 ? ((150 - avgCPL) / avgCPL * 100) : 0; // Simulated customer lifetime value of $150

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                Ads Manager
              </h1>
              <p className="text-xs text-muted-foreground">Panel unificado para campañas, copywriting con IA e inyección directa al CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Sincronizado
            </Badge>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Connection Dialog Loading */}
        <Dialog open={connectingPlatform !== null}>
          <DialogContent className="sm:max-w-md flex flex-col items-center py-12 text-center">
            <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
            <DialogTitle className="font-display text-lg mb-1">Vinculando cuenta publicitaria</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Estableciendo túnel seguro e importando píxeles y campañas desde {connectingPlatform?.replace("_", " ").toUpperCase()}...
            </DialogDescription>
          </DialogContent>
        </Dialog>

        {/* 1. Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="luxury-card p-4 relative overflow-hidden group">
            <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Inversión Activa</p>
            <p className="text-3xl font-display font-bold mt-2">${totalSpend.toFixed(2)}</p>
            <span className="text-[10px] text-green-500 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="h-3 w-3" /> +12.4% vs mes anterior
            </span>
          </Card>

          <Card className="luxury-card p-4 relative overflow-hidden group">
            <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Leads Generados</p>
            <p className="text-3xl font-display font-bold mt-2">{totalConversions}</p>
            <span className="text-[10px] text-green-500 flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="h-3 w-3" /> +18.7% vs mes anterior
            </span>
          </Card>

          <Card className="luxury-card p-4 relative overflow-hidden group">
            <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Costo por Lead Promedio</p>
            <p className="text-3xl font-display font-bold mt-2">${avgCPL.toFixed(2)}</p>
            <span className="text-[10px] text-green-500 flex items-center gap-0.5 mt-1">
              -8.2% de optimización
            </span>
          </Card>

          <Card className="luxury-card p-4 relative overflow-hidden group">
            <div className="absolute right-3 top-3 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Retorno ROI Estimado</p>
            <p className="text-3xl font-display font-bold mt-2">{simulatedROI.toFixed(0)}%</p>
            <span className="text-[10px] text-green-500 flex items-center gap-0.5 mt-1">
              Salud de campaña excelente
            </span>
          </Card>
        </div>

        {/* 2. Interactive Charts & Connections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recharts Area Chart */}
          <Card className="luxury-card p-6 lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-display text-lg font-bold">Rendimiento Multicanal</h3>
                <p className="text-xs text-muted-foreground">Leads generados por plataforma publicitaria (últimos 30 días)</p>
              </div>
              <Badge variant="secondary" className="px-2 py-1">Semanal</Badge>
            </div>
            
            <div className="h-[260px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PERFORMANCE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1877F2" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#1877F2" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGoogle" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4285F4" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4285F4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTikTok" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#010101" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#010101" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="Meta" stroke="#1877F2" fillOpacity={1} fill="url(#colorMeta)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Google" stroke="#4285F4" fillOpacity={1} fill="url(#colorGoogle)" strokeWidth={2} />
                  <Area type="monotone" dataKey="TikTok" stroke="#010101" fillOpacity={1} fill="url(#colorTikTok)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Account Connectors */}
          <Card className="luxury-card p-6 space-y-4">
            <div>
              <h3 className="font-display text-lg font-bold">Conectores GoHighLevel</h3>
              <p className="text-xs text-muted-foreground">Vincula tus cuentas publicitarias externas para sincronizar píxeles y campañas.</p>
            </div>
            
            <div className="space-y-3">
              {[
                { id: "meta_ads", name: "Meta Ads", logo: "M", desc: "Facebook & Instagram", color: "bg-[#1877F2]" },
                { id: "google_ads", name: "Google Ads", logo: "G", desc: "Search, Display, YouTube", color: "bg-[#4285F4]" },
                { id: "tiktok_ads", name: "TikTok Ads", logo: "TT", desc: "TikTok for Business", color: "bg-[#010101]" },
                { id: "linkedin_ads", name: "LinkedIn Ads", logo: "IN", desc: "B2B Marketing Campaigns", color: "bg-[#0A66C2]" }
              ].map(platform => {
                const isConnected = connectedAccounts[platform.id];
                return (
                  <div key={platform.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/30">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold", platform.color)}>
                        {platform.logo}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{platform.name}</p>
                        <p className="text-[10px] text-muted-foreground">{platform.desc}</p>
                      </div>
                    </div>
                    <Button
                      variant={isConnected ? "outline" : "default"}
                      size="sm"
                      className="h-8 text-xs px-3"
                      onClick={() => handleConnectPlatform(platform.id)}
                    >
                      {isConnected ? "Desconectar" : "Conectar"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* 3. Main Workspace Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="campaigns" className="gap-1.5"><Layers className="h-4 w-4" /> Campañas Activas</TabsTrigger>
            <TabsTrigger value="ai-generator" className="gap-1.5"><Sparkles className="h-4 w-4" /> Copia Creativa IA</TabsTrigger>
            <TabsTrigger value="lead-simulator" className="gap-1.5"><RefreshCw className="h-4 w-4" /> Simulador de Lead Forms</TabsTrigger>
          </TabsList>

          {/* Tab 1: Campaigns list */}
          <TabsContent value="campaigns" className="space-y-4">
            <Card className="luxury-card p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-display text-lg font-bold">Listado de Campañas Activas</h3>
                  <p className="text-xs text-muted-foreground">Gestiona y actualiza los presupuestos diarios y estados de tus campañas en tiempo real.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                      <th className="py-3 px-2">Campaña</th>
                      <th className="py-3 px-2">Plataforma</th>
                      <th className="py-3 px-2 text-center">Estado</th>
                      <th className="py-3 px-2">Presupuesto Diario</th>
                      <th className="py-3 px-2 text-right">Inversión</th>
                      <th className="py-3 px-2 text-right">Clics / CTR</th>
                      <th className="py-3 px-2 text-right">Leads</th>
                      <th className="py-3 px-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => {
                      const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                      return (
                        <tr key={c.id} className="border-b border-border text-sm hover:bg-card/20 transition-colors">
                          <td className="py-4 px-2 font-medium">{c.name}</td>
                          <td className="py-4 px-2">
                            <Badge variant="outline" className="capitalize text-xs">
                              {c.platform.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <Badge className={cn("text-xs font-semibold", c.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>
                              {c.status === "active" ? "En Marcha" : "Pausada"}
                            </Badge>
                          </td>
                          <td className="py-4 px-2 w-[220px]">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground font-mono">${c.dailyBudget}/día</span>
                              <Slider
                                defaultValue={[c.dailyBudget]}
                                max={100}
                                min={5}
                                step={1}
                                onValueChange={(val) => updateCampaignBudget(c.id, val[0])}
                                className="w-24"
                              />
                            </div>
                          </td>
                          <td className="py-4 px-2 text-right font-mono font-medium">${c.spend.toFixed(2)}</td>
                          <td className="py-4 px-2 text-right font-mono text-xs">
                            {c.clicks} <span className="text-muted-foreground">({ctr.toFixed(1)}%)</span>
                          </td>
                          <td className="py-4 px-2 text-right font-mono font-bold text-primary">{c.conversions}</td>
                          <td className="py-4 px-2 text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleCampaignStatus(c.id)}
                              className="h-8 w-8 hover:bg-primary/10"
                            >
                              {c.status === "active" ? <Pause className="h-4 w-4 text-yellow-500" /> : <Play className="h-4 w-4 text-green-500" />}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 2: AI Copy Generator */}
          <TabsContent value="ai-generator" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="luxury-card p-6 space-y-4">
              <div>
                <h3 className="font-display text-lg font-bold flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  Redacción de Anuncios con IA
                </h3>
                <p className="text-xs text-muted-foreground">Nuestra inteligencia artificial genera copys de alto impacto optimizados para conversiones y CTR.</p>
              </div>

              <form onSubmit={handleGenerateAdCopy} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Nombre de tu Negocio / Empresa</Label>
                  <Input
                    id="business-name"
                    value={aiForm.businessName}
                    onChange={(e) => setAiForm(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Ej. FitNation Center"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="business-type">Giro de Negocio</Label>
                    <Select value={aiForm.businessType} onValueChange={(val) => setAiForm(prev => ({ ...prev, businessType: val }))}>
                      <SelectTrigger id="business-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gym">Gimnasio & Fitness</SelectItem>
                        <SelectItem value="dental">Clínica Dental</SelectItem>
                        <SelectItem value="realestate">Inmobiliaria</SelectItem>
                        <SelectItem value="consulting">Servicios Profesionales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="platform">Plataforma Objetivo</Label>
                    <Select value={aiForm.platform} onValueChange={(val) => setAiForm(prev => ({ ...prev, platform: val }))}>
                      <SelectTrigger id="platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meta_ads">Meta Ads (Facebook/Insta)</SelectItem>
                        <SelectItem value="google_ads">Google Ads (Search)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="offer">Oferta Gancho (Lead Magnet)</Label>
                  <Textarea
                    id="offer"
                    value={aiForm.offer}
                    onChange={(e) => setAiForm(prev => ({ ...prev, offer: e.target.value }))}
                    placeholder="Ej. Plan de 3 días gratis de entrenamiento + Consulta nutricional inicial gratis."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={generatingAi}>
                  {generatingAi ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Generando Creativos...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Generar Variaciones de Ads
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* AI Copy Preview */}
            <Card className="luxury-card p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Resultados Generados</h3>
                  <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">Ad Preview</Badge>
                </div>

                <AnimatePresence mode="wait">
                  {aiGeneratedResult ? (
                    <motion.div
                      key={aiForm.platform}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      {aiForm.platform === "meta_ads" ? (
                        /* Meta Feed Mock Preview */
                        <div className="border border-border rounded-lg bg-card/60 p-4 space-y-3 shadow-md max-w-sm mx-auto">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                              {aiForm.businessName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold leading-tight">{aiForm.businessName}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">Patrocinado · <Share2 className="h-2.5 w-2.5 inline" /></p>
                            </div>
                          </div>
                          <p className="text-xs whitespace-pre-line text-card-foreground/90 leading-relaxed font-sans">
                            {aiGeneratedResult.primaryText}
                          </p>
                          <div className="border border-border/80 rounded overflow-hidden">
                            <div className="h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-center p-6 border-b border-border/80">
                              <div>
                                <p className="font-display font-bold text-lg leading-tight">{aiForm.businessName}</p>
                                <p className="text-xs text-muted-foreground mt-1">¡Reclama tu cupón hoy!</p>
                              </div>
                            </div>
                            <div className="p-3 flex justify-between items-center bg-card/30">
                              <div className="min-w-0">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">OFERTA ESPECIAL</p>
                                <p className="text-xs font-bold truncate">{aiGeneratedResult.headlines[0]}</p>
                              </div>
                              <Button size="sm" className="h-7 text-[10px] px-3 font-semibold bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-none">Regístrate</Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Google Search Mock Preview */
                        <div className="border border-border rounded-lg bg-card/60 p-4 space-y-2 max-w-lg mx-auto shadow-md">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Google Search</span>
                            <span>·</span>
                            <span className="font-semibold text-foreground">Anuncio</span>
                          </div>
                          <p className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer leading-tight">
                            {aiGeneratedResult.headlines.join(" | ")}
                          </p>
                          <p className="text-xs text-[#006621] truncate">https://www.google.com/{aiForm.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {aiGeneratedResult.descriptions.join(" ")}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                      <HelpCircle className="h-10 w-10 stroke-1 mb-2" />
                      <p className="text-sm">Rellena el formulario de la izquierda y haz clic en "Generar" para crear anuncios.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {aiGeneratedResult && (
                <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      const textToCopy = aiForm.platform === "meta_ads"
                        ? `${aiGeneratedResult.primaryText}\n\nHeadline: ${aiGeneratedResult.headlines[0]}`
                        : aiGeneratedResult.headlines.join("\n") + "\n" + aiGeneratedResult.descriptions.join("\n");
                      navigator.clipboard.writeText(textToCopy);
                      toast.success("Copiado al portapapeles");
                    }}
                  >
                    Copiar Todo
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Tab 3: Lead Injection Simulator */}
          <TabsContent value="lead-simulator" className="max-w-2xl mx-auto">
            <Card className="luxury-card p-6 space-y-6">
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  Simulador de Integración de Leads
                </h3>
                <p className="text-xs text-muted-foreground">
                  Simula la entrada de un lead que completa un Lead Capture Form desde un anuncio de Meta o Google Ads. Al inyectarse, verás al lead en tiempo real en la base de datos de Thrive CRM.
                </p>
              </div>

              <form onSubmit={handleInjectLead} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inject-campaign">Campaña Publicitaria de Origen</Label>
                  <Select
                    value={leadForm.campaignId}
                    onValueChange={(val) => setLeadForm(prev => ({ ...prev, campaignId: val }))}
                  >
                    <SelectTrigger id="inject-campaign">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          [{c.platform.replace("_ads", "").toUpperCase()}] - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inject-name">Nombre Completo del Lead</Label>
                    <Input
                      id="inject-name"
                      required
                      value={leadForm.name}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej. Juan Pérez"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inject-email">Correo Electrónico</Label>
                    <Input
                      id="inject-email"
                      type="email"
                      required
                      value={leadForm.email}
                      onChange={(e) => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="juan.perez@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inject-phone">Número de Teléfono (Opcional)</Label>
                  <Input
                    id="inject-phone"
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+52 55 1234 5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inject-message">Mensaje del Formulario / Campos Personalizados</Label>
                  <Textarea
                    id="inject-message"
                    value={leadForm.message}
                    onChange={(e) => setLeadForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Ej. Quisiera informes sobre la promoción de membresía gratis."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={injectingLead}>
                  {injectingLead ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" /> Inyectando Lead al CRM...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Inyectar Lead Form al CRM
                    </>
                  )}
                </Button>
              </form>

              <div className="border border-border/60 bg-muted/20 p-4 rounded-lg flex gap-3 text-xs text-muted-foreground items-start">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-card-foreground">¿Cómo validar este flujo?</p>
                  <p>Al hacer clic en "Inyectar", el lead se agregará de forma directa en Supabase en la tabla `leads`.</p>
                  <p>Posteriormente, navega a la sección de **Leads** del menú lateral para ver cómo figura el lead nuevo con su estado actual y notas de la campaña asociada.</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
