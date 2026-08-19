import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Globe, AlertCircle, CheckCircle2, ChevronRight, MessageSquare,
  Users, Mail, Phone, Calendar, Star, Check, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Website } from "./WebsitesPage";
import { useAuth } from "@/contexts/AuthContext";

const PREVIEW_THEMES: Record<string, {
  gradient: string;
  primaryBg: string;
  primaryHover: string;
  accentBg: string;
  text: string;
  subtext: string;
  cardBg: string;
  buttonClass: string;
  borderClass: string;
  badgeClass: string;
}> = {
  emerald: {
    gradient: "from-emerald-50 via-emerald-100/10 to-teal-50/20",
    primaryBg: "bg-emerald-600 hover:bg-emerald-700 text-white",
    primaryHover: "hover:bg-emerald-700",
    accentBg: "bg-emerald-500",
    text: "text-emerald-950",
    subtext: "text-emerald-700",
    cardBg: "bg-white/80 border-emerald-100/50 backdrop-blur-sm",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-600/10",
    borderClass: "border-emerald-100",
    badgeClass: "bg-emerald-100 text-emerald-800"
  },
  indigo: {
    gradient: "from-indigo-50 via-indigo-100/10 to-purple-50/20",
    primaryBg: "bg-indigo-600 hover:bg-indigo-700 text-white",
    primaryHover: "hover:bg-indigo-700",
    accentBg: "bg-indigo-500",
    text: "text-indigo-950",
    subtext: "text-indigo-700",
    cardBg: "bg-white/80 border-indigo-100/50 backdrop-blur-sm",
    buttonClass: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/10",
    borderClass: "border-indigo-100",
    badgeClass: "bg-indigo-100 text-indigo-800"
  },
  midnight: {
    gradient: "from-slate-900 via-slate-800/80 to-zinc-950",
    primaryBg: "bg-amber-500 hover:bg-amber-600 text-slate-950",
    primaryHover: "hover:bg-amber-600",
    accentBg: "bg-amber-500",
    text: "text-amber-100",
    subtext: "text-amber-500",
    cardBg: "bg-slate-900/90 border-slate-800/80 backdrop-blur-sm text-white",
    buttonClass: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/10",
    borderClass: "border-slate-800",
    badgeClass: "bg-amber-500/10 text-amber-500 border border-amber-500/20"
  },
  crimson: {
    gradient: "from-rose-50 via-rose-100/10 to-red-50/20",
    primaryBg: "bg-rose-600 hover:bg-rose-700 text-white",
    primaryHover: "hover:bg-rose-700",
    accentBg: "bg-rose-500",
    text: "text-rose-950",
    subtext: "text-rose-700",
    cardBg: "bg-white/80 border-rose-100/50 backdrop-blur-sm",
    buttonClass: "bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md shadow-rose-600/10",
    borderClass: "border-rose-100",
    badgeClass: "bg-rose-100 text-rose-800"
  }
};

export default function WebsitePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [site, setSite] = useState<Website | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [themeName, setThemeName] = useState<string>("emerald");
  const [loading, setLoading] = useState(true);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    const fetchPublishedSite = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("websites")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setSite(data as Website);
        const siteContent = data.content as any;
        setSections(siteContent?.sections || []);
        setThemeName(siteContent?.theme || "emerald");

        const { error: viewError } = await supabase.rpc("increment_website_views", {
          website_id: data.id,
        });
        if (viewError) console.warn("No se pudo registrar la visita:", viewError.message);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        console.error("No se pudo cargar el sitio publicado:", message);
        toast.error("Sitio web no encontrado o no publicado.");
      } finally {
        setLoading(false);
      }
    };
    fetchPublishedSite();
  }, [id]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      toast.warning("Por favor rellena Nombre y Correo");
      return;
    }

    setIsSubmitting(true);
    const siteName = site?.name || "Website Builder Site";

    try {
      // 1. Insert lead into leads table
      const { error: leadErr } = await supabase.from("leads").insert({
        nombre: formName,
        email: formEmail,
        servicio: siteName,
        mensaje: formMsg || `Lead capturado automáticamente desde el Website Builder de Thrive CRM.`,
        status: "new",
        notes: `Origen: Landing Page [${siteName}] - Tel: ${formPhone}`
      });

      if (leadErr) throw leadErr;

      // 2. Increment leads count on website table
      if (site) {
        const { error: countError } = await supabase.rpc("increment_website_leads", {
          website_id: site.id,
        });
        if (countError) console.warn("No se pudo actualizar el contador de leads:", countError.message);
      }

      setSubmittedSuccess(true);
      toast.success("¡Datos enviados con éxito!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("No se pudo registrar el lead:", message);
      toast.error("No pudimos enviar tus datos. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Globe className="h-10 w-10 text-primary animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Cargando landing page...</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md p-6 text-center space-y-4 border-destructive/20 bg-destructive/5">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="font-display font-bold text-lg">Error de Carga</h2>
          <p className="text-xs text-muted-foreground">El sitio web que estás buscando no existe, no está publicado o no se encuentra disponible.</p>
          <Button onClick={() => navigate("/sites")}>Regresar al Dashboard</Button>
        </Card>
      </div>
    );
  }

  const t = PREVIEW_THEMES[themeName] || PREVIEW_THEMES.emerald;

  return (
    <div className={cn("min-h-screen font-sans bg-gradient-to-br", t.gradient, themeName === "midnight" ? "text-slate-100" : "text-slate-900")}>
      
      {/* Visual Floating Banner for owner mode preview */}
      {user && (
        <div className="bg-primary/10 border-b border-primary/20 px-6 py-2 flex items-center justify-between text-xs font-semibold backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-1.5 text-primary">
            <Globe className="h-3.5 w-3.5" />
            <span>Vista previa: {site.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] uppercase font-mono">Vista previa</Badge>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => navigate(`/sites/editor/${site.id}`)}>
              Volver al editor
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-16">
        {sections.map((sec) => {
          return (
            <motion.section
              key={sec.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.4 }}
              className="py-4"
            >
              {/* HERO SECTION */}
              {sec.type === "hero" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-6">
                  <div className="space-y-6">
                    <h1 className={cn("font-display font-black text-4xl sm:text-5xl leading-tight bg-clip-text text-transparent bg-gradient-to-r", t.gradient === PREVIEW_THEMES.midnight.gradient ? "from-amber-400 to-amber-600" : t.text)}>
                      {sec.title}
                    </h1>
                    <p className="text-base text-muted-foreground leading-relaxed max-w-xl">{sec.subtitle}</p>
                    <Button
                      className={cn("rounded-xl px-8 py-4 text-sm font-bold shadow-lg transition-transform hover:scale-[1.02]", t.buttonClass)}
                      onClick={() => {
                        const formSec = document.getElementById("lead_form");
                        if (formSec) formSec.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      {sec.ctaLabel} <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  {sec.image && (
                    <div className="relative aspect-video lg:aspect-square max-h-[440px] rounded-2xl overflow-hidden border border-border shadow-2xl">
                      <img src={sec.image} alt={site.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 to-transparent" />
                    </div>
                  )}
                </div>
              )}

              {/* SERVICES SECTION */}
              {sec.type === "services" && (
                <div className="py-6 space-y-8 text-center">
                  <div className="max-w-xl mx-auto space-y-3">
                    <h2 className="font-display font-bold text-3xl">{sec.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">{sec.subtitle}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(sec.items || []).map((item: any, i: number) => (
                      <Card key={i} className={cn("p-6 text-left border hover:shadow-xl transition-all duration-300", t.cardBg)}>
                        <h4 className="font-display font-bold text-base">{item.title}</h4>
                        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{item.desc}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* PRICING SECTION */}
              {sec.type === "pricing" && (
                <div className="py-6 space-y-8 text-center">
                  <div className="max-w-xl mx-auto space-y-3">
                    <h2 className="font-display font-bold text-3xl">{sec.title}</h2>
                    <p className="text-sm text-muted-foreground">{sec.subtitle}</p>
                  </div>
                  <div className="flex flex-col md:flex-row justify-center items-stretch gap-6">
                    {(sec.plans || []).map((plan: any, i: number) => (
                      <Card key={i} className={cn("p-8 max-w-sm w-full text-center flex flex-col justify-between border hover:shadow-2xl transition-all duration-300", t.cardBg, i === 1 && "border-2 border-primary/60 scale-[1.02]")}>
                        <div className="space-y-4">
                          <h4 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground">{plan.name}</h4>
                          <p className={cn("text-5xl font-display font-black", themeName === "midnight" ? "text-amber-400" : t.subtext)}>{plan.price}</p>
                          <div className="border-t border-border/60 my-4" />
                          <ul className="text-xs space-y-3 text-muted-foreground">
                            {(plan.features || []).map((feat: string, idx: number) => (
                              <li key={idx} className="flex items-center gap-2 justify-center">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                <span className="truncate">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          className={cn("w-full mt-8 text-xs py-3", i === 1 ? t.buttonClass : "variant-outline border border-border")}
                          onClick={() => {
                            const formSec = document.getElementById("lead_form");
                            if (formSec) formSec.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          Elegir Plan
                        </Button>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* TESTIMONIALS SECTION */}
              {sec.type === "testimonials" && (
                <div className="py-6 space-y-8 text-center">
                  <div className="max-w-xl mx-auto space-y-3">
                    <h2 className="font-display font-bold text-3xl">{sec.title}</h2>
                    <p className="text-sm text-muted-foreground">{sec.subtitle}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left">
                    {(sec.reviews || []).map((rev: any, i: number) => (
                      <Card key={i} className={cn("p-6 border flex flex-col justify-between hover:shadow-lg transition-shadow duration-300", t.cardBg)}>
                        <p className="text-sm italic text-muted-foreground leading-relaxed">"{rev.text}"</p>
                        <div className="mt-4 flex justify-between items-center">
                          <span className="font-bold text-xs">{rev.author}</span>
                          <div className="flex items-center gap-0.5 text-yellow-500">
                            {Array.from({ length: rev.rating || 5 }).map((_, rIdx) => (
                              <Star key={rIdx} className="h-3.5 w-3.5 fill-current" />
                            ))}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* LEAD FORM SECTION (FUNCTIONAL CRM INTEGRATION) */}
              {sec.type === "lead_form" && (
                <div id="lead_form" className="py-6 max-w-xl mx-auto space-y-6 text-center scroll-mt-24">
                  <div className="space-y-2">
                    <h2 className="font-display font-bold text-3xl">{sec.title}</h2>
                    <p className="text-sm text-muted-foreground">{sec.subtitle}</p>
                  </div>

                  <AnimatePresence mode="wait">
                    {submittedSuccess ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 border border-green-500/20 bg-green-500/5 rounded-2xl flex flex-col items-center gap-3 text-center"
                      >
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <h4 className="font-display font-bold text-lg text-green-500">¡Registro Exitoso!</h4>
                        <p className="text-xs text-muted-foreground max-w-sm">Tus datos han sido registrados en nuestro sistema. Nos pondremos en contacto contigo en breve para darte seguimiento.</p>
                      </motion.div>
                    ) : (
                      <motion.form
                        onSubmit={handleFormSubmit}
                        className={cn("p-8 border rounded-2xl text-left shadow-xl space-y-4", t.cardBg)}
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="form-name" className="text-xs font-semibold">Nombre Completo</Label>
                          <Input
                            id="form-name"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                            className="bg-background"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="form-email" className="text-xs font-semibold">Correo Electrónico</Label>
                            <Input
                              id="form-email"
                              type="email"
                              required
                              value={formEmail}
                              onChange={(e) => setFormEmail(e.target.value)}
                              placeholder="juan.perez@example.com"
                              className="bg-background"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="form-phone" className="text-xs font-semibold">Número Telefónico</Label>
                            <Input
                              id="form-phone"
                              value={formPhone}
                              onChange={(e) => setFormPhone(e.target.value)}
                              placeholder="+52 55 1234 5678"
                              className="bg-background"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="form-msg" className="text-xs font-semibold">Mensaje o Comentarios (Opcional)</Label>
                          <Textarea
                            id="form-msg"
                            value={formMsg}
                            onChange={(e) => setFormMsg(e.target.value)}
                            placeholder="Cuéntanos un poco sobre tus necesidades..."
                            rows={3}
                            className="bg-background"
                          />
                        </div>

                        <Button type="submit" className={cn("w-full py-3 text-sm font-bold mt-2", t.buttonClass)} disabled={isSubmitting}>
                          {isSubmitting ? "Enviando..." : (sec.buttonLabel || "Enviar")}
                        </Button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* FOOTER SECTION */}
              {sec.type === "footer" && (
                <div className="py-6 text-center text-xs text-muted-foreground border-t border-border/40 mt-8">
                  <p className="leading-relaxed">{sec.text}</p>
                </div>
              )}
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
