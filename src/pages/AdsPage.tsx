import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Plus, ExternalLink, CheckCircle, Clock, PauseCircle, XCircle, DollarSign, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AdStatus = "active" | "planned" | "paused" | "inactive";
type AdAccount = {
  id: string;
  platform: string;
  status: AdStatus;
  account_id: string | null;
  account_name: string | null;
  monthly_budget: number | null;
  notes: string | null;
  created_at: string;
};

// ─── All ad platforms catalog ───────────────────────────────────────────────
const AD_PLATFORMS = {
  social: {
    label: "Redes Sociales",
    platforms: [
      { id: "meta_ads", name: "Meta Ads", desc: "Facebook + Instagram", color: "#1877F2", logo: "META", url: "https://business.facebook.com/adsmanager" },
      { id: "tiktok_ads", name: "TikTok Ads", desc: "TikTok for Business", color: "#010101", logo: "TT", url: "https://ads.tiktok.com" },
      { id: "linkedin_ads", name: "LinkedIn Ads", desc: "Campaign Manager", color: "#0A66C2", logo: "IN", url: "https://www.linkedin.com/campaignmanager" },
      { id: "twitter_ads", name: "X / Twitter Ads", desc: "X Ads Manager", color: "#000000", logo: "X", url: "https://ads.twitter.com" },
      { id: "snapchat_ads", name: "Snapchat Ads", desc: "Snapchat Ads Manager", color: "#FFFC00", logo: "SC", url: "https://ads.snapchat.com" },
      { id: "pinterest_ads", name: "Pinterest Ads", desc: "Pinterest Business", color: "#E60023", logo: "P", url: "https://ads.pinterest.com" },
      { id: "reddit_ads", name: "Reddit Ads", desc: "Reddit Ads Manager", color: "#FF4500", logo: "R", url: "https://ads.reddit.com" },
    ],
  },
  search: {
    label: "Búsqueda & Display",
    platforms: [
      { id: "google_ads", name: "Google Ads", desc: "Search, Display, Shopping", color: "#4285F4", logo: "G", url: "https://ads.google.com" },
      { id: "youtube_ads", name: "YouTube Ads", desc: "Video & bumper ads", color: "#FF0000", logo: "YT", url: "https://ads.google.com" },
      { id: "microsoft_ads", name: "Microsoft / Bing Ads", desc: "Bing Search & Display", color: "#00A4EF", logo: "MS", url: "https://ads.microsoft.com" },
      { id: "apple_search", name: "Apple Search Ads", desc: "App Store ads", color: "#555555", logo: "🍎", url: "https://searchads.apple.com" },
    ],
  },
  streaming: {
    label: "Streaming & CTV",
    platforms: [
      { id: "spotify_ads", name: "Spotify Ads", desc: "Audio & video ads", color: "#1DB954", logo: "SP", url: "https://ads.spotify.com" },
      { id: "hulu_ads", name: "Hulu Ads", desc: "Streaming TV ads", color: "#1CE783", logo: "H", url: "https://advertising.hulu.com" },
      { id: "amazon_ads", name: "Amazon Ads", desc: "Streaming TV + display", color: "#FF9900", logo: "A", url: "https://advertising.amazon.com" },
      { id: "disney_ads", name: "Disney+ / Hulu Ads", desc: "Disney Advertising", color: "#113CCF", logo: "D+", url: "https://disneyads.com" },
      { id: "peacock_ads", name: "Peacock Ads", desc: "NBCUniversal streaming", color: "#FBFF00", logo: "P", url: "https://nbcuadvertising.com" },
      { id: "paramount_ads", name: "Paramount+ Ads", desc: "Paramount streaming", color: "#0064FF", logo: "P+", url: "https://paramountadvertising.com" },
      { id: "connected_tv", name: "The Trade Desk", desc: "Programmatic CTV/OTT", color: "#3D6DCC", logo: "TTD", url: "https://thetradedesk.com" },
    ],
  },
  programmatic: {
    label: "Programmatic & Otros",
    platforms: [
      { id: "dv360", name: "DV360", desc: "Google Display & Video 360", color: "#34A853", logo: "DV", url: "https://displayvideo.google.com" },
      { id: "amazon_dsp", name: "Amazon DSP", desc: "Demand-side platform", color: "#FF9900", logo: "ADSP", url: "https://advertising.amazon.com/dsp" },
      { id: "adroll", name: "AdRoll", desc: "Retargeting & prospecting", color: "#FF5500", logo: "AR", url: "https://www.adroll.com" },
      { id: "taboola", name: "Taboola", desc: "Native content ads", color: "#0065FF", logo: "TB", url: "https://www.taboola.com" },
      { id: "outbrain", name: "Outbrain", desc: "Native discovery ads", color: "#FF4A1C", logo: "OB", url: "https://www.outbrain.com" },
      { id: "podcast_ads", name: "Podcast Ads", desc: "Spotify, iHeart, Podbean", color: "#8B5CF6", logo: "🎙", url: "" },
      { id: "influencer", name: "Influencer / UGC", desc: "Paid partnerships", color: "#EC4899", logo: "★", url: "" },
      { id: "email_ads", name: "Email / Newsletter Ads", desc: "Mailchimp, Klaviyo, etc.", color: "#FFE01B", logo: "✉", url: "" },
    ],
  },
};

const STATUS_CONFIG: Record<AdStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  active: { label: "Activo", color: "bg-green-500/15 text-green-500", icon: CheckCircle },
  planned: { label: "Planeado", color: "bg-blue-500/15 text-blue-500", icon: Clock },
  paused: { label: "Pausado", color: "bg-yellow-500/15 text-yellow-500", icon: PauseCircle },
  inactive: { label: "Inactivo", color: "bg-muted text-muted-foreground", icon: XCircle },
};

function useAdAccounts() {
  return useQuery({
    queryKey: ["ad_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ad_accounts").select("*").order("created_at");
      if (error) throw error;
      return data as AdAccount[];
    },
  });
}

function useUpsertAdAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<AdAccount> & { platform: string }) => {
      const { data, error } = await supabase
        .from("ad_accounts")
        .upsert(input, { onConflict: "platform" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad_accounts"] }),
  });
}

function useDeleteAdAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ad_accounts"] }),
  });
}

function PlatformCard({
  platform,
  account,
  onConfigure,
}: {
  platform: typeof AD_PLATFORMS.social.platforms[0];
  account?: AdAccount;
  onConfigure: () => void;
}) {
  const status = account?.status;
  const statusCfg = status ? STATUS_CONFIG[status] : null;
  const StatusIcon = statusCfg?.icon || Plus;

  return (
    <Card
      className={cn(
        "luxury-card p-4 cursor-pointer hover:border-primary/30 transition-all group",
        status === "active" && "border-green-500/30",
        status === "planned" && "border-blue-500/20",
      )}
      onClick={onConfigure}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: platform.color }}
        >
          {platform.logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{platform.name}</p>
            {statusCfg && (
              <span className={cn("px-1.5 py-0.5 rounded-full text-xs font-medium", statusCfg.color)}>
                {statusCfg.label}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{platform.desc}</p>
          {account?.monthly_budget && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />${account.monthly_budget.toLocaleString()}/mes
            </p>
          )}
          {account?.account_name && (
            <p className="text-xs text-muted-foreground truncate">{account.account_name}</p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {platform.url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); window.open(platform.url, "_blank"); }}
              title="Open platform"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onConfigure(); }}>
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function AdsPage() {
  const { data: accounts = [] } = useAdAccounts();
  const upsert = useUpsertAdAccount();
  const deleteAccount = useDeleteAdAccount();

  const [configPlatform, setConfigPlatform] = useState<typeof AD_PLATFORMS.social.platforms[0] | null>(null);
  const [form, setForm] = useState({
    status: "planned" as AdStatus,
    account_id: "",
    account_name: "",
    monthly_budget: "",
    notes: "",
  });

  const getAccount = (platformId: string) => accounts.find(a => a.platform === platformId);

  const activeCount = accounts.filter(a => a.status === "active").length;
  const plannedCount = accounts.filter(a => a.status === "planned").length;
  const totalBudget = accounts.filter(a => a.status === "active").reduce((s, a) => s + (a.monthly_budget || 0), 0);

  const openConfig = (platform: typeof AD_PLATFORMS.social.platforms[0]) => {
    const existing = getAccount(platform.id);
    setForm({
      status: existing?.status || "planned",
      account_id: existing?.account_id || "",
      account_name: existing?.account_name || "",
      monthly_budget: existing?.monthly_budget?.toString() || "",
      notes: existing?.notes || "",
    });
    setConfigPlatform(platform);
  };

  const handleSave = async () => {
    if (!configPlatform) return;
    const existing = getAccount(configPlatform.id);
    try {
      await upsert.mutateAsync({
        ...(existing ? { id: existing.id } : {}),
        platform: configPlatform.id,
        status: form.status,
        account_id: form.account_id || null,
        account_name: form.account_name || null,
        monthly_budget: form.monthly_budget ? parseFloat(form.monthly_budget) : null,
        notes: form.notes || null,
      });
      toast.success("Plataforma guardada");
      setConfigPlatform(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemove = async () => {
    if (!configPlatform) return;
    const existing = getAccount(configPlatform.id);
    if (!existing) return;
    await deleteAccount.mutateAsync(existing.id);
    toast.success("Plataforma removida");
    setConfigPlatform(null);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Ads & Canales</h1>
              <p className="text-sm text-muted-foreground">Gestiona todas tus plataformas publicitarias</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="luxury-card p-4">
            <p className="text-2xl font-display font-bold text-green-500">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Plataformas activas</p>
          </Card>
          <Card className="luxury-card p-4">
            <p className="text-2xl font-display font-bold text-blue-500">{plannedCount}</p>
            <p className="text-xs text-muted-foreground">Planeadas</p>
          </Card>
          <Card className="luxury-card p-4">
            <p className="text-2xl font-display font-bold">${totalBudget > 0 ? totalBudget.toLocaleString() : "—"}</p>
            <p className="text-xs text-muted-foreground">Budget mensual total</p>
          </Card>
        </div>

        {/* Platform Grid by category */}
        <Tabs defaultValue="social">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="social">Redes Sociales</TabsTrigger>
            <TabsTrigger value="search">Búsqueda & Display</TabsTrigger>
            <TabsTrigger value="streaming">Streaming & CTV</TabsTrigger>
            <TabsTrigger value="programmatic">Programmatic & Otros</TabsTrigger>
          </TabsList>

          {(Object.entries(AD_PLATFORMS) as [string, typeof AD_PLATFORMS.social][]).map(([key, category]) => (
            <TabsContent key={key} value={key} className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {category.platforms.map((platform, index) => (
                  <motion.div key={platform.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
                    <PlatformCard
                      platform={platform}
                      account={getAccount(platform.id)}
                      onConfigure={() => openConfig(platform)}
                    />
                  </motion.div>
                ))}
              </div>

              <Card className="luxury-card p-4 mt-4 bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  💡 Haz click en cualquier plataforma para configurarla, marcarla como activa/planeada, agregar tu Account ID y presupuesto mensual.
                  Cada plataforma tiene un link directo a su Ads Manager.
                </p>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Config Dialog */}
      {configPlatform && (
        <Dialog open={!!configPlatform} onOpenChange={() => setConfigPlatform(null)}>
          <DialogContent className="sm:max-w-md p-0 flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-0 shrink-0">
              <DialogTitle className="font-display flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: configPlatform.color }}
                >
                  {configPlatform.logo}
                </div>
                {configPlatform.name}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v as AdStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">✅ Activo — lo estoy usando</SelectItem>
                    <SelectItem value="planned">🔵 Planeado — lo voy a usar</SelectItem>
                    <SelectItem value="paused">⏸ Pausado — estaba activo</SelectItem>
                    <SelectItem value="inactive">❌ No aplica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nombre de la cuenta</Label>
                <Input
                  value={form.account_name}
                  onChange={(e) => setForm(p => ({ ...p, account_name: e.target.value }))}
                  placeholder="Ej. Thrive Agency — Main"
                />
              </div>

              <div className="space-y-2">
                <Label>Account ID / Pixel ID</Label>
                <Input
                  value={form.account_id}
                  onChange={(e) => setForm(p => ({ ...p, account_id: e.target.value }))}
                  placeholder="Ej. act_123456789"
                />
              </div>

              <div className="space-y-2">
                <Label>Budget mensual (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number"
                    value={form.monthly_budget}
                    onChange={(e) => setForm(p => ({ ...p, monthly_budget: e.target.value }))}
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Targeting, objetivos, campañas activas..."
                  rows={3}
                />
              </div>

              {configPlatform.url && (
                <a
                  href={configPlatform.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir {configPlatform.name} Ads Manager
                </a>
              )}
            </div>

            <div className="px-6 pb-6 flex items-center gap-2">
              <Button className="flex-1" onClick={handleSave} disabled={upsert.isPending}>
                Guardar
              </Button>
              {getAccount(configPlatform.id) && (
                <Button variant="ghost" className="text-muted-foreground" onClick={handleRemove}>
                  Quitar
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
