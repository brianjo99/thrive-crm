import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Save, Globe, Eye, Smartphone, Tablet, Monitor, Plus, Trash2,
  ChevronUp, ChevronDown, Palette, Type, Settings, PlusCircle, CheckCircle2,
  Undo2, FileText, Image as ImageIcon
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Website } from "./WebsitesPage";

type PreviewDevice = "desktop" | "tablet" | "mobile";

const THEME_PALETTES: Record<string, {
  primary: string;
  accent: string;
  bg: string;
  text: string;
  buttonClass: string;
  accentText: string;
}> = {
  emerald: {
    primary: "from-emerald-600 to-teal-500",
    accent: "bg-emerald-500 hover:bg-emerald-600",
    bg: "bg-emerald-50/20",
    text: "text-emerald-900",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white",
    accentText: "text-emerald-500"
  },
  indigo: {
    primary: "from-indigo-600 to-purple-500",
    accent: "bg-indigo-500 hover:bg-indigo-600",
    bg: "bg-indigo-50/20",
    text: "text-indigo-900",
    buttonClass: "bg-indigo-600 hover:bg-indigo-700 text-white",
    accentText: "text-indigo-500"
  },
  midnight: {
    primary: "from-slate-900 to-amber-800",
    accent: "bg-amber-500 hover:bg-amber-600",
    bg: "bg-amber-50/10",
    text: "text-amber-900",
    buttonClass: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold",
    accentText: "text-amber-500"
  },
  crimson: {
    primary: "from-rose-600 to-red-500",
    accent: "bg-rose-500 hover:bg-rose-600",
    bg: "bg-rose-50/20",
    text: "text-rose-900",
    buttonClass: "bg-rose-600 hover:bg-rose-700 text-white",
    accentText: "text-rose-500"
  }
};

const LOCAL_STORAGE_KEY = "thrive_website_builder_sites";

export default function WebsiteEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [site, setSite] = useState<Website | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [themeName, setThemeName] = useState<string>("emerald");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Fetch website data
  useEffect(() => {
    const fetchSite = async () => {
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
      } catch (err: any) {
        console.warn("DB Single Fetch failed, loading from LocalStorage:", err.message);
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
          const currentLocal: Website[] = JSON.parse(localData);
          const found = currentLocal.find(site => site.id === id);
          if (found) {
            setSite(found);
            setSections(found.content?.sections || []);
            setThemeName(found.content?.theme || "emerald");
          } else {
            toast.error("Sitio web no encontrado.");
            navigate("/sites");
          }
        } else {
          toast.error("Sitio web no encontrado.");
          navigate("/sites");
        }
      }
    };
    fetchSite();
  }, [id, navigate]);

  // Save changes handler
  const handleSave = async (showToast = true, isPublishAction = false) => {
    if (!site) return false;
    setIsSaving(true);
    const updatedContent = {
      theme: themeName,
      sections: sections
    };

    try {
      const { error } = await supabase
        .from("websites")
        .update({
          content: updatedContent,
          published: isPublishAction ? true : site.published,
          updated_at: new Date().toISOString()
        })
        .eq("id", site.id);

      if (error) throw error;
      
      setSite(prev => prev ? { ...prev, content: updatedContent, published: isPublishAction ? true : prev.published } : null);
      if (showToast) toast.success(isPublishAction ? "¡Sitio publicado con éxito!" : "Progreso guardado correctamente");
      setIsSaving(false);
      return true;
    } catch (err: any) {
      console.warn("DB Update failed, writing locally to LocalStorage:", err.message);
      
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (localData) {
        const currentLocal: Website[] = JSON.parse(localData);
        const updatedLocal = currentLocal.map(s => {
          if (s.id === site.id) {
            return {
              ...s,
              content: updatedContent,
              published: isPublishAction ? true : s.published
            };
          }
          return s;
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocal));
        
        setSite(prev => prev ? { ...prev, content: updatedContent, published: isPublishAction ? true : prev.published } : null);
        if (showToast) toast.success(isPublishAction ? "¡Sitio publicado en local!" : "Borrador guardado localmente");
      }
      setIsSaving(false);
      return true;
    }
  };

  // Publish site handler
  const handlePublish = async () => {
    setIsPublishing(true);
    const success = await handleSave(false, true);
    setIsPublishing(false);
    if (success) {
      toast.success("¡Tu landing page está ahora online!");
    }
  };

  // Reordering sections
  const moveSection = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === sections.length - 1) return;

    const newSections = [...sections];
    const swapTarget = direction === "up" ? index - 1 : index + 1;
    const temp = newSections[index];
    newSections[index] = newSections[swapTarget];
    newSections[swapTarget] = temp;
    setSections(newSections);
    toast.info("Orden de secciones actualizado");
  };

  // Delete section
  const deleteSection = (index: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta sección de la página?")) {
      const newSections = sections.filter((_, idx) => idx !== index);
      setSections(newSections);
      setSelectedSectionId(null);
      toast.success("Sección removida");
    }
  };

  // Add section
  const addSection = (type: string) => {
    const newId = `${type}-${Math.random().toString(36).substring(2, 7)}`;
    let newSec: any = { id: newId, type };

    switch (type) {
      case "hero":
        newSec = {
          ...newSec,
          title: "NUEVO TÍTULO ENERGÉTICO",
          subtitle: "Agrega un subtítulo que explique claramente tu propuesta única de valor.",
          ctaLabel: "Registrarse Ahora",
          image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1000&auto=format&fit=crop"
        };
        break;
      case "services":
        newSec = {
          ...newSec,
          title: "Nuestros Servicios Premium",
          subtitle: "Descubre cómo podemos ayudarte.",
          items: [
            { title: "Servicio 1", desc: "Descripción detallada del servicio o producto estrella." },
            { title: "Servicio 2", desc: "Descripción detallada del servicio o producto estrella." }
          ]
        };
        break;
      case "pricing":
        newSec = {
          ...newSec,
          title: "Nuestros Precios Flexibles",
          subtitle: "Planes para todos los presupuestos.",
          plans: [
            { name: "Plan Standard", price: "$19.99", features: ["Característica A", "Característica B"] }
          ]
        };
        break;
      case "testimonials":
        newSec = {
          ...newSec,
          title: "Nuestros Clientes Satisfechos",
          subtitle: "Opiniones auténticas de nuestro negocio.",
          reviews: [
            { author: "Cliente Felíz", rating: 5, text: "Me encantó la experiencia de compra y el soporte al cliente es increíble." }
          ]
        };
        break;
      case "lead_form":
        newSec = {
          ...newSec,
          title: "Ponte en Contacto",
          subtitle: "Déjanos tus datos de contacto y te enviaremos una propuesta gratis.",
          buttonLabel: "Enviar Información"
        };
        break;
      case "footer":
        newSec = {
          ...newSec,
          text: "© 2026 Tu Empresa. Reservados todos los derechos."
        };
        break;
    }

    setSections([...sections, newSec]);
    setSelectedSectionId(newId);
    toast.success("Sección agregada al final de la página");
  };

  // Section editing fields update
  const updateSectionField = (secId: string, field: string, value: any) => {
    setSections(prev => prev.map(s => {
      if (s.id === secId) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  // Update item array in services, pricing, testimonials
  const updateSectionArrayField = (secId: string, arrayField: string, index: number, key: string, value: any) => {
    setSections(prev => prev.map(s => {
      if (s.id === secId) {
        const arr = [...(s[arrayField] || [])];
        arr[index] = { ...arr[index], [key]: value };
        return { ...s, [arrayField]: arr };
      }
      return s;
    }));
  };

  const addArrayItem = (secId: string, arrayField: string, defaultObj: any) => {
    setSections(prev => prev.map(s => {
      if (s.id === secId) {
        return { ...s, [arrayField]: [...(s[arrayField] || []), defaultObj] };
      }
      return s;
    }));
  };

  const removeArrayItem = (secId: string, arrayField: string, index: number) => {
    setSections(prev => prev.map(s => {
      if (s.id === secId) {
        return { ...s, [arrayField]: (s[arrayField] || []).filter((_: any, i: number) => i !== index) };
      }
      return s;
    }));
  };

  const palette = THEME_PALETTES[themeName] || THEME_PALETTES.emerald;
  const selectedSection = sections.find(s => s.id === selectedSectionId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-border bg-card px-6 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sites")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm">{site?.name || "Editor de Sitio"}</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono">/{site?.slug}</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              Guardado automático local activo
            </p>
          </div>
        </div>

        {/* Device preview selectors */}
        <div className="hidden md:flex items-center bg-muted/60 border border-border p-0.5 rounded-lg">
          <Button variant={device === "desktop" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setDevice("desktop")}>
            <Monitor className="h-4 w-4" />
          </Button>
          <Button variant={device === "tablet" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setDevice("tablet")}>
            <Tablet className="h-4 w-4" />
          </Button>
          <Button variant={device === "mobile" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setDevice("mobile")}>
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor Actions */}
        <div className="flex items-center gap-2">
          {site?.published && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9 gap-1.5"
              onClick={() => window.open(`/sites/preview/${site.id}`, "_blank")}
            >
              <Eye className="h-4 w-4" /> Previsualizar
            </Button>
          )}
          <Button variant="secondary" size="sm" className="text-xs h-9 gap-1.5" onClick={() => handleSave(true)} disabled={isSaving}>
            <Save className="h-4 w-4" /> {isSaving ? "Guardando..." : "Guardar Borrador"}
          </Button>
          <Button size="sm" className="text-xs h-9 gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground" onClick={handlePublish} disabled={isPublishing}>
            <Globe className="h-4 w-4" /> {isPublishing ? "Publicando..." : "Publicar Sitio"}
          </Button>
        </div>
      </nav>

      {/* Editor Body */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Control Panel */}
        <aside className="w-[340px] border-r border-border bg-card flex flex-col z-10 shrink-0">
          <Tabs defaultValue="sections" className="flex-1 flex flex-col min-h-0">
            <TabsList className="bg-muted/40 border-b border-border p-1 w-full rounded-none justify-start shrink-0">
              <TabsTrigger value="sections" className="text-xs">Secciones</TabsTrigger>
              <TabsTrigger value="theme" className="text-xs">Tema / Colores</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Propiedades</TabsTrigger>
            </TabsList>

            {/* TAB: SECTIONS */}
            <TabsContent value="sections" className="flex-1 min-h-0 flex flex-col p-4 m-0 overflow-y-auto space-y-6">
              {/* Add section drawer */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agregar Secciones</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: "hero", label: "Hero Banner" },
                    { type: "services", label: "Servicios" },
                    { type: "pricing", label: "Precios" },
                    { type: "testimonials", label: "Testimonios" },
                    { type: "lead_form", label: "Lead Form" },
                    { type: "footer", label: "Footer" }
                  ].map(sec => (
                    <Button
                      key={sec.type}
                      variant="outline"
                      className="text-xs h-10 px-2 justify-start gap-1.5 bg-card hover:bg-muted"
                      onClick={() => addSection(sec.type)}
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-primary" />
                      <span>{sec.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Edit Selected Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-t border-border pt-4">
                  {selectedSection ? `Editar Sección: ${selectedSection.type.toUpperCase()}` : "Haz clic en una sección para editar"}
                </h4>

                {selectedSection ? (
                  <div className="space-y-4 text-xs">
                    {/* General Titles for Hero, Services, Pricing, Testimonials, Lead Form */}
                    {"title" in selectedSection && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Título Principal</Label>
                        <Input
                          value={selectedSection.title}
                          onChange={(e) => updateSectionField(selectedSection.id, "title", e.target.value)}
                        />
                      </div>
                    )}

                    {"subtitle" in selectedSection && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Subtítulo / Descripción</Label>
                        <Textarea
                          value={selectedSection.subtitle}
                          onChange={(e) => updateSectionField(selectedSection.id, "subtitle", e.target.value)}
                          rows={3}
                        />
                      </div>
                    )}

                    {"ctaLabel" in selectedSection && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase">Etiqueta de Botón CTA</Label>
                        <Input
                          value={selectedSection.ctaLabel}
                          onChange={(e) => updateSectionField(selectedSection.id, "ctaLabel", e.target.value)}
                        />
                      </div>
                    )}

                    {"image" in selectedSection && (
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" /> URL de Imagen
                        </Label>
                        <Input
                          value={selectedSection.image}
                          onChange={(e) => updateSectionField(selectedSection.id, "image", e.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    )}

                    {/* Services Items array editor */}
                    {selectedSection.type === "services" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-muted-foreground text-[10px]">LISTA DE SERVICIOS</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addArrayItem(selectedSection.id, "items", { title: "Nuevo Servicio", desc: "Detalles del servicio." })}>
                            <Plus className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </div>
                        {(selectedSection.items || []).map((item: any, idx: number) => (
                          <div key={idx} className="border border-border/60 p-2.5 rounded bg-muted/20 space-y-2 relative">
                            <Button size="icon" variant="ghost" className="h-5 w-5 absolute right-1.5 top-1.5 text-destructive hover:bg-destructive/10" onClick={() => removeArrayItem(selectedSection.id, "items", idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="space-y-1">
                              <Label className="text-[9px]">Nombre del Servicio</Label>
                              <Input
                                value={item.title}
                                className="h-7 text-xs"
                                onChange={(e) => updateSectionArrayField(selectedSection.id, "items", idx, "title", e.target.value)}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px]">Descripción</Label>
                              <Textarea
                                value={item.desc}
                                className="text-xs"
                                rows={2}
                                onChange={(e) => updateSectionArrayField(selectedSection.id, "items", idx, "desc", e.target.value)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pricing array editor */}
                    {selectedSection.type === "pricing" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-muted-foreground text-[10px]">PLANES DE PRECIOS</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addArrayItem(selectedSection.id, "plans", { name: "Nuevo Plan", price: "$9.99", features: ["Característica"] })}>
                            <Plus className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </div>
                        {(selectedSection.plans || []).map((plan: any, idx: number) => (
                          <div key={idx} className="border border-border/60 p-2.5 rounded bg-muted/20 space-y-2 relative">
                            <Button size="icon" variant="ghost" className="h-5 w-5 absolute right-1.5 top-1.5 text-destructive hover:bg-destructive/10" onClick={() => removeArrayItem(selectedSection.id, "plans", idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[9px]">Plan</Label>
                                <Input value={plan.name} className="h-7 text-xs" onChange={(e) => updateSectionArrayField(selectedSection.id, "plans", idx, "name", e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px]">Costo</Label>
                                <Input value={plan.price} className="h-7 text-xs" onChange={(e) => updateSectionArrayField(selectedSection.id, "plans", idx, "price", e.target.value)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Testimonials array editor */}
                    {selectedSection.type === "testimonials" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-muted-foreground text-[10px]">TESTIMONIOS DE CLIENTES</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addArrayItem(selectedSection.id, "reviews", { author: "Nombre", rating: 5, text: "Excelente reseña." })}>
                            <Plus className="h-3.5 w-3.5 text-primary" />
                          </Button>
                        </div>
                        {(selectedSection.reviews || []).map((rev: any, idx: number) => (
                          <div key={idx} className="border border-border/60 p-2.5 rounded bg-muted/20 space-y-2 relative">
                            <Button size="icon" variant="ghost" className="h-5 w-5 absolute right-1.5 top-1.5 text-destructive hover:bg-destructive/10" onClick={() => removeArrayItem(selectedSection.id, "reviews", idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                            <div className="space-y-1">
                              <Label className="text-[9px]">Cliente</Label>
                              <Input value={rev.author} className="h-7 text-xs" onChange={(e) => updateSectionArrayField(selectedSection.id, "reviews", idx, "author", e.target.value)} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[9px]">Reseña</Label>
                              <Textarea value={rev.text} className="text-xs" rows={2} onChange={(e) => updateSectionArrayField(selectedSection.id, "reviews", idx, "text", e.target.value)} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lead Form customization */}
                    {selectedSection.type === "lead_form" && (
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground uppercase">Texto del Botón de Envío</Label>
                        <Input
                          value={selectedSection.buttonLabel}
                          onChange={(e) => updateSectionField(selectedSection.id, "buttonLabel", e.target.value)}
                        />
                      </div>
                    )}

                    {/* Footer text customization */}
                    {selectedSection.type === "footer" && (
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground uppercase">Derechos Reservados / Datos</Label>
                        <Textarea
                          value={selectedSection.text}
                          onChange={(e) => updateSectionField(selectedSection.id, "text", e.target.value)}
                          rows={3}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground text-xs">
                    Ninguna sección seleccionada para edición. Haz clic en una sección del lienzo a la derecha.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: THEME */}
            <TabsContent value="theme" className="p-4 m-0 space-y-4 shrink-0">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paleta de Colores</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "emerald", label: "Bosque Emerald", color: "bg-emerald-500" },
                  { id: "indigo", label: "Océano Indigo", color: "bg-indigo-500" },
                  { id: "midnight", label: "Midnight Gold", color: "bg-slate-900 border-amber-500 border" },
                  { id: "crimson", label: "Crimson Red", color: "bg-rose-500" }
                ].map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setThemeName(theme.id);
                      toast.success(`Paleta cambiada a ${theme.label}`);
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card/60 hover:bg-muted text-xs text-left",
                      themeName === theme.id && "border-primary bg-primary/5 shadow-sm"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded-full flex-shrink-0", theme.color)} />
                    <span className="font-medium truncate">{theme.label}</span>
                  </button>
                ))}
              </div>
            </TabsContent>

            {/* TAB: SETTINGS */}
            <TabsContent value="settings" className="p-4 m-0 space-y-4 shrink-0">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuraciones Generales</h4>
              {site && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Nombre del Sitio Web</Label>
                    <Input
                      value={site.name}
                      onChange={(e) => setSite(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Ruta / Slug</Label>
                    <Input
                      value={site.slug}
                      onChange={(e) => setSite(prev => prev ? { ...prev, slug: e.target.value } : null)}
                    />
                  </div>
                  <div className="p-3 border border-border rounded-lg bg-muted/20 space-y-2">
                    <p className="font-semibold text-card-foreground text-[10px]">Estado de Publicación</p>
                    <div className="flex items-center gap-2">
                      <Badge className={site.published ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"}>
                        {site.published ? "Publicado" : "Borrador"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </aside>

        {/* Right Canvas Area */}
        <main className="flex-1 bg-muted/30 overflow-y-auto p-8 flex justify-center items-start">
          <div
            className={cn(
              "bg-background shadow-2xl border border-border/80 transition-all duration-300 rounded-lg overflow-hidden flex flex-col",
              device === "desktop" && "w-full max-w-5xl",
              device === "tablet" && "w-[768px]",
              device === "mobile" && "w-[380px]"
            )}
            style={{ minHeight: "80vh" }}
          >
            {/* Live Render Canvas */}
            {sections.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-24 text-center text-muted-foreground px-6">
                <Globe className="h-12 w-12 text-muted-foreground stroke-1 mb-2 animate-pulse" />
                <h4 className="font-display font-bold text-base text-foreground">Tu Lienzo Está Vacío</h4>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">Añade secciones desde la barra lateral izquierda (Hero, Servicios, Precios, etc.) para comenzar a diseñar tu landing page.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col divide-y divide-border/30">
                {sections.map((sec, idx) => {
                  const isSelected = selectedSectionId === sec.id;
                  return (
                    <div
                      key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id)}
                      className={cn(
                        "relative group cursor-pointer hover:outline hover:outline-2 hover:outline-primary/50 transition-all",
                        isSelected && "outline outline-2 outline-primary bg-primary/5"
                      )}
                    >
                      {/* Control overlays (move, delete) */}
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center bg-card border border-border rounded-lg p-0.5 shadow-md z-20 gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveSection(idx, "up"); }} disabled={idx === 0}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveSection(idx, "down"); }} disabled={idx === sections.length - 1}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteSection(idx); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Section Renderer */}
                      <div className="p-10 select-none">
                        {sec.type === "hero" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6">
                            <div className="space-y-4">
                              <h2 className={cn("font-display font-black text-3xl leading-tight bg-clip-text text-transparent bg-gradient-to-r", palette.primary)}>
                                {sec.title || "TÍTULO DEL HERO"}
                              </h2>
                              <p className="text-sm text-muted-foreground leading-relaxed">{sec.subtitle || "Subtítulo explicativo."}</p>
                              <Button className={cn("font-semibold rounded-lg px-6 py-2.5", palette.accent)}>
                                {sec.ctaLabel || "Acción"}
                              </Button>
                            </div>
                            {sec.image && (
                              <div className="aspect-video rounded-xl overflow-hidden border border-border shadow-md">
                                <img src={sec.image} alt="Hero banner graphic" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        )}

                        {sec.type === "services" && (
                          <div className="py-6 space-y-6 text-center">
                            <div className="max-w-xl mx-auto space-y-2">
                              <h3 className={cn("font-display font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r", palette.primary)}>
                                {sec.title || "Nuestros Servicios"}
                              </h3>
                              <p className="text-xs text-muted-foreground">{sec.subtitle || "Descripción general."}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                              {(sec.items || []).map((item: any, i: number) => (
                                <Card key={i} className="p-4 bg-card hover:shadow-md transition-shadow border border-border/60">
                                  <h4 className="font-display font-bold text-sm text-foreground">{item.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.desc}</p>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {sec.type === "pricing" && (
                          <div className="py-6 space-y-6 text-center">
                            <div className="max-w-xl mx-auto space-y-2">
                              <h3 className={cn("font-display font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r", palette.primary)}>
                                {sec.title || "Precios"}
                              </h3>
                              <p className="text-xs text-muted-foreground">{sec.subtitle || "Elige tu plan ideal."}</p>
                            </div>
                            <div className="flex flex-col md:flex-row justify-center items-stretch gap-6">
                              {(sec.plans || []).map((plan: any, i: number) => (
                                <Card key={i} className={cn("p-6 max-w-xs w-full text-center flex flex-col justify-between border", i === 1 ? "border-primary bg-primary/5 shadow-md" : "border-border")}>
                                  <div className="space-y-4">
                                    <h4 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground">{plan.name}</h4>
                                    <p className={cn("text-4xl font-display font-black", palette.accentText)}>{plan.price}</p>
                                    <div className="border-t border-border my-2" />
                                    <ul className="text-xs space-y-2 text-muted-foreground">
                                      {(plan.features || []).map((feat: string, idx: number) => (
                                        <li key={idx} className="flex items-center gap-1.5 justify-center">
                                          <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                          <span className="truncate">{feat}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  <Button className={cn("w-full mt-6 text-xs h-9", palette.accent)}>Empezar</Button>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {sec.type === "testimonials" && (
                          <div className="py-6 space-y-6 text-center">
                            <div className="max-w-xl mx-auto space-y-2">
                              <h3 className={cn("font-display font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r", palette.primary)}>
                                {sec.title || "Opiniones"}
                              </h3>
                              <p className="text-xs text-muted-foreground">{sec.subtitle || "Nuestros clientes avalan la calidad."}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
                              {(sec.reviews || []).map((rev: any, i: number) => (
                                <Card key={i} className="p-5 border border-border bg-card/65 flex flex-col justify-between">
                                  <p className="text-xs italic text-muted-foreground leading-relaxed">"{rev.text}"</p>
                                  <div className="mt-4 flex justify-between items-center">
                                    <span className="font-bold text-xs">{rev.author}</span>
                                    <div className="flex items-center gap-0.5 text-yellow-500">
                                      {Array.from({ length: rev.rating || 5 }).map((_, rIdx) => (
                                        <span key={rIdx}>★</span>
                                      ))}
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}

                        {sec.type === "lead_form" && (
                          <div className="py-6 max-w-md mx-auto space-y-4 text-center">
                            <div className="space-y-1">
                              <h3 className={cn("font-display font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r", palette.primary)}>
                                {sec.title || "Contacto / Registro"}
                              </h3>
                              <p className="text-xs text-muted-foreground">{sec.subtitle || "Rellena el formulario de contacto."}</p>
                            </div>
                            <Card className="p-6 text-left border border-border/80 shadow-md space-y-3">
                              <div className="space-y-1">
                                <Label className="text-[10px]">Nombre Completo</Label>
                                <Input disabled className="h-8 bg-muted/40 cursor-not-allowed" placeholder="Ej. Juan Pérez" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px]">Correo Electrónico</Label>
                                <Input disabled className="h-8 bg-muted/40 cursor-not-allowed" placeholder="juan.perez@example.com" />
                              </div>
                              <Button disabled className={cn("w-full h-9 mt-2 text-xs font-semibold cursor-not-allowed", palette.accent)}>
                                {sec.buttonLabel || "Enviar"}
                              </Button>
                            </Card>
                          </div>
                        )}

                        {sec.type === "footer" && (
                          <div className="py-4 text-center text-xs text-muted-foreground border-t border-border/40 mt-4">
                            <p>{sec.text || "Derechos reservados."}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
