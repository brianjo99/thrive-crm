import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe, Plus, LayoutGrid, Eye, TrendingUp, Users, Trash2, Edit3, ExternalLink,
  Sparkles, CheckCircle2, ChevronRight, FileCode, Check
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { normalizeWebsite, WebsiteSection } from "@/lib/websiteContent";
import type { Website } from "@/lib/websiteContent";

export type { Website } from "@/lib/websiteContent";

// ─── Default template contents ───────────────────────────────────────────────
const TEMPLATE_SCHEMES: Record<string, {
  name: string;
  desc: string;
  theme: string;
  sections: WebsiteSection[];
}> = {
  gym: {
    name: "FitNation Center",
    desc: "Plantilla para Gimnasios y Centros Fitness. Enfoque en conversión y llamadas a la acción enérgicas.",
    theme: "emerald",
    sections: [
      {
        id: "hero",
        type: "hero",
        title: "¡TRANSFORMA TU CUERPO Y TU MENTE HOY!",
        subtitle: "Comienza a entrenar con los mejores entrenadores certificados y la mejor comunidad de la ciudad. Membresías desde $29.99/mes.",
        ctaLabel: "Reclamar 3 Días Gratis",
        image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1000&auto=format&fit=crop"
      },
      {
        id: "services",
        type: "services",
        title: "Nuestros Programas de Entrenamiento",
        subtitle: "Diseñados para llevar tu físico y salud al siguiente nivel.",
        items: [
          { title: "CrossFit & HIIT", desc: "Clases de alta intensidad para quemar grasa rápidamente." },
          { title: "Fuerza & Musculación", desc: "Rutinas guiadas con equipamiento de nivel olímpico." },
          { title: "Yoga & Flexibilidad", desc: "Clases grupales para mejorar tu balance, postura y estrés." }
        ]
      },
      {
        id: "pricing",
        type: "pricing",
        title: "Elige Tu Plan De Membresía",
        subtitle: "Sin contratos a largo plazo, cancélalo en cualquier momento.",
        plans: [
          { name: "Básico", price: "$29.99", features: ["Acceso ilimitado a zona de pesas", "Uso de vestidores", "App de seguimiento"] },
          { name: "Premium (Recomendado)", price: "$49.99", features: ["Todo lo del plan Básico", "Acceso a clases grupales ilimitado", "1 Sesión de Coaching mensual"] }
        ]
      },
      {
        id: "lead_form",
        type: "lead_form",
        title: "¡Reclama tu Pase de 3 Días Gratis!",
        subtitle: "Rellena el formulario de abajo y te enviaremos tu código QR de acceso instantáneo por correo.",
        buttonLabel: "Enviar Código QR"
      },
      {
        id: "footer",
        type: "footer",
        text: "© 2026 FitNation Center. Todos los derechos reservados. Ubicación: Av. Revolución 1024, Ciudad de México."
      }
    ]
  },
  dental: {
    name: "SmileStudio Clinic",
    desc: "Plantilla para Clínicas Dentales. Diseño limpio y profesional para infundir confianza y agendar citas.",
    theme: "indigo",
    sections: [
      {
        id: "hero",
        type: "hero",
        title: "TU SONRISA MÁS SANA Y BRILLANTE EMPIEZA AQUÍ",
        subtitle: "Odontología moderna e indolora para toda la familia. 20% de descuento en tu primer diagnóstico y limpieza dental completa.",
        ctaLabel: "Agendar Primera Consulta",
        image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1000&auto=format&fit=crop"
      },
      {
        id: "services",
        type: "services",
        title: "Nuestros Tratamientos Dentales",
        subtitle: "Cuidado profesional avanzado con tecnología de punta.",
        items: [
          { title: "Ortodoncia Invisible", desc: "Alineadores Invisalign cómodos y estéticos." },
          { title: "Implantes & Coronas", desc: "Restauración de piezas con resinas de alta durabilidad." },
          { title: "Blanqueamiento Dental", desc: "Sonrisa hasta 5 tonos más blanca en una sola sesión." }
        ]
      },
      {
        id: "testimonials",
        type: "testimonials",
        title: "Lo Que Dicen Nuestros Pacientes",
        subtitle: "Cientos de sonrisas felices nos avalan en Google Reviews.",
        reviews: [
          { author: "Sofía R.", rating: 5, text: "Excelente atención y nada de dolor. La ortodoncia invisible cambió mi seguridad por completo." },
          { author: "Carlos M.", rating: 5, text: "El personal es súper amable. Te explican todo a detalle y las instalaciones están impecables." }
        ]
      },
      {
        id: "lead_form",
        type: "lead_form",
        title: "Reserva Tu Cita De Diagnóstico Gratis",
        subtitle: "Introduce tus datos y una de nuestras secretarias te llamará en menos de 10 minutos para coordinar tu horario.",
        buttonLabel: "Solicitar Cita de Diagnóstico"
      },
      {
        id: "footer",
        type: "footer",
        text: "© 2026 SmileStudio Clinic. Dirección: Torre Médica del Valle, Consultorio 504. Teléfono: +52 55 9876 5432."
      }
    ]
  },
  realestate: {
    name: "LuxeHabitat Real Estate",
    desc: "Plantilla para Agencias Inmobiliarias. Destaca propiedades premium y capta clientes interesados en comprar o vender.",
    theme: "midnight",
    sections: [
      {
        id: "hero",
        type: "hero",
        title: "ENCUENTRA EL HOGAR DE TUS SUEÑOS",
        subtitle: "Propiedades exclusivas en las mejores zonas residenciales. Te acompañamos en todo el proceso legal y financiero.",
        ctaLabel: "Ver Catálogo de Propiedades",
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1000&auto=format&fit=crop"
      },
      {
        id: "services",
        type: "services",
        title: "Nuestros Servicios Inmobiliarios",
        subtitle: "Hacemos que comprar, vender o rentar sea una experiencia placentera.",
        items: [
          { title: "Compra & Venta", desc: "Acceso exclusivo a preventas y portafolios off-market." },
          { title: "Valuación Comercial", desc: "Descubre el precio real de tu propiedad en el mercado actual." },
          { title: "Asesoría Hipotecaria", desc: "Te conseguimos la mejor tasa bancaria sin costo adicional." }
        ]
      },
      {
        id: "lead_form",
        type: "lead_form",
        title: "¿Quieres vender o comprar una propiedad?",
        subtitle: "Déjanos tus datos y un asesor inmobiliario certificado se pondrá en contacto contigo para una consulta gratuita.",
        buttonLabel: "Contactar a un Asesor"
      },
      {
        id: "footer",
        type: "footer",
        text: "© 2026 LuxeHabitat Real Estate. Licencia Inmobiliaria Federal A-48201."
      }
    ]
  }
};

export default function WebsitesPage() {
  const navigate = useNavigate();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Creation dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("gym");

  // Supabase is the source of truth. Never present device-local data as published.
  const fetchWebsites = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("websites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWebsites((data ?? []).map(normalizeWebsite));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("No se pudieron cargar los sitios:", message);
      setWebsites([]);
      setLoadError("No se pudo conectar con la tabla de sitios en Supabase.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWebsites();
  }, []);

  // Create site handler
  const handleCreateWebsite = async () => {
    if (!newSiteName.trim()) {
      toast.warning("Por favor ingresa un nombre para el sitio");
      return;
    }

    const slug = newSiteName
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9]/g, "-") // replace symbols with -
      .replace(/-+/g, "-") // reduce double -
      .replace(/^-|-$/g, ""); // trim hyphens

    const template = TEMPLATE_SCHEMES[selectedTemplate];
    const newSiteContent = {
      theme: template.theme,
      sections: template.sections
    };

    try {
      const { data, error } = await supabase
        .from("websites")
        .insert({
          name: newSiteName,
          slug: slug,
          template_type: selectedTemplate,
          content: newSiteContent,
          published: false,
          views: 0,
          leads_count: 0
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Sitio web creado correctamente!");
      setIsCreateOpen(false);
      navigate(`/sites/editor/${data.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("No se pudo crear el sitio:", message);
      toast.error("No se pudo crear el sitio en Supabase.");
    }
  };

  // Delete site handler
  const handleDeleteWebsite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que quieres eliminar este sitio web?")) return;

    try {
      const { error } = await supabase.from("websites").delete().eq("id", id);
      if (error) throw error;
      toast.success("Sitio web eliminado con éxito");
      fetchWebsites();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("No se pudo eliminar el sitio:", message);
      toast.error("No se pudo eliminar el sitio en Supabase.");
    }
  };

  // Summary Metrics
  const totalViews = websites.reduce((acc, w) => acc + (w.views || 0), 0);
  const totalLeads = websites.reduce((acc, w) => acc + (w.leads_count || 0), 0);
  const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100) : 0;

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                Sitios & Funnels
              </h1>
              <p className="text-xs text-muted-foreground">Crea landing pages de conversión integradas al CRM en minutos</p>
            </div>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 self-start sm:self-center">
            <Plus className="h-4 w-4" /> Crear Nuevo Sitio
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* 1. Global statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="luxury-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{totalViews}</p>
              <p className="text-xs text-muted-foreground">Visitas Totales</p>
            </div>
          </Card>

          <Card className="luxury-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{totalLeads}</p>
              <p className="text-xs text-muted-foreground">Leads Capturados</p>
            </div>
          </Card>

          <Card className="luxury-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{conversionRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Tasa de Conversión Promedio</p>
            </div>
          </Card>
        </div>

        {/* 2. Websites grid */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Plus className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Cargando tus sitios web...</p>
          </div>
        ) : loadError ? (
          <Card className="mx-auto max-w-xl border-destructive/20 bg-destructive/5 p-8 text-center space-y-4">
            <Globe className="h-10 w-10 text-destructive mx-auto" />
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg">Sitios no disponibles</h3>
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
            <Button variant="outline" onClick={fetchWebsites}>Reintentar</Button>
          </Card>
        ) : websites.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-16 text-center max-w-xl mx-auto space-y-4">
            <Globe className="h-12 w-12 text-muted-foreground stroke-1 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg">No tienes ningún sitio web todavía</h3>
              <p className="text-sm text-muted-foreground">¡Crea tu primera landing page con nuestro editor visual en segundos usando nuestras plantillas listas para negocios!</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Lanzar Primer Sitio
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {websites.map(site => (
              <motion.div
                key={site.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="luxury-card h-full flex flex-col justify-between overflow-hidden relative group">
                  <div className="p-5 space-y-4">
                    {/* Header line */}
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-base group-hover:text-primary transition-colors">{site.name}</h4>
                        <p className="text-[11px] text-muted-foreground font-mono">/{site.slug}</p>
                      </div>
                      <Badge className={cn("text-[10px] font-medium px-2 py-0.5", site.published ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20")}>
                        {site.published ? "Publicado" : "Borrador"}
                      </Badge>
                    </div>

                    {/* Template spec */}
                    <div className="flex items-center gap-2 text-xs border border-border/40 rounded-lg p-2.5 bg-muted/20">
                      <FileCode className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate capitalize">{site.template_type} Niche</p>
                        <p className="text-[9px] text-muted-foreground truncate">Contiene {site.content?.sections?.length || 0} secciones</p>
                      </div>
                    </div>

                    {/* Stats display */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Eye className="h-3.5 w-3.5" />
                        <span>{site.views} vistas</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                        <Users className="h-3.5 w-3.5 text-green-500" />
                        <span>{site.leads_count} leads</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="border-t border-border bg-card/60 px-5 py-3 flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Eliminar ${site.name}`}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDeleteWebsite(site.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1.5">
                      {site.published && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sites/preview/${site.id}`);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" /> Ver Online
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => navigate(`/sites/editor/${site.id}`)}
                      >
                        <Edit3 className="h-3 w-3" /> Diseñar
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* 3. Dialog Template Catalog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-0">
              <DialogTitle className="font-display text-xl">Crear Nuevo Sitio Web / Embudo</DialogTitle>
              <DialogDescription>Selecciona un nombre para tu sitio web y elige la plantilla base adaptada a tu negocio.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="site-name">Nombre del Sitio</Label>
                <Input
                  id="site-name"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="Ej. Membresía Gym Polanco"
                />
              </div>

              <div className="space-y-3">
                <Label>Selecciona tu Plantilla de Nicho</Label>
                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(TEMPLATE_SCHEMES).map(([key, template]) => {
                    const isSelected = selectedTemplate === key;
                    return (
                      <div
                        key={key}
                        onClick={() => setSelectedTemplate(key)}
                        className={cn(
                          "border rounded-xl p-4 cursor-pointer hover:border-primary/60 transition-all flex justify-between items-start gap-4",
                          isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
                        )}
                      >
                        <div className="space-y-1">
                          <p className="font-display font-bold text-sm flex items-center gap-1.5">
                            {template.name}
                            {isSelected && <Badge className="bg-primary hover:bg-primary text-[9px] font-normal px-1.5 h-4">Elegido</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{template.desc}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5",
                          isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-muted/20 border-t border-border">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateWebsite} className="gap-2">
                <Sparkles className="h-4 w-4" /> Crear y Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
