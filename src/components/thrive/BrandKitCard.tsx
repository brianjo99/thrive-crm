import { useState, KeyboardEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Palette, Pencil, Check, X, Plus, Mic2,
  LayoutGrid, MousePointerClick, AlertTriangle,
  Instagram, Youtube, Facebook, Linkedin, Twitter,
  NotebookPen, Eye, Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SocialHandles = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  linkedin?: string;
  twitter?: string;
};

type BrandKit = {
  id?: string;
  client_id: string;
  tone_of_voice: string | null;
  content_pillars: string[];
  preferred_ctas: string[];
  brand_colors: string[];
  visual_references: string | null;
  no_gos: string | null;
  social_handles: SocialHandles;
  strategic_notes: string | null;
};

type EditForm = {
  tone_of_voice: string;
  content_pillars: string[];
  preferred_ctas: string[];
  brand_colors: string[];
  visual_references: string;
  no_gos: string;
  social_handles: SocialHandles;
  strategic_notes: string;
  // staging inputs for tag arrays
  _pillarInput: string;
  _ctaInput: string;
  _colorInput: string;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useBrandKit(clientId: string) {
  return useQuery({
    queryKey: ["brand_kit", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_kit" as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as BrandKit | null;
    },
    enabled: !!clientId,
  });
}

function useUpsertBrandKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kit: Omit<BrandKit, "id"> & { id?: string }) => {
      const { error } = await supabase
        .from("brand_kit" as any)
        .upsert(
          { ...kit },
          { onConflict: "client_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["brand_kit", vars.client_id] });
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS: { key: keyof SocialHandles; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { key: "instagram", label: "Instagram",  icon: <Instagram className="h-3.5 w-3.5" />,  placeholder: "@usuario" },
  { key: "tiktok",    label: "TikTok",     icon: <span className="text-[11px] font-bold leading-none">TT</span>, placeholder: "@usuario" },
  { key: "youtube",   label: "YouTube",    icon: <Youtube className="h-3.5 w-3.5" />,    placeholder: "canal o URL" },
  { key: "facebook",  label: "Facebook",   icon: <Facebook className="h-3.5 w-3.5" />,   placeholder: "página o URL" },
  { key: "linkedin",  label: "LinkedIn",   icon: <Linkedin className="h-3.5 w-3.5" />,   placeholder: "empresa o URL" },
  { key: "twitter",   label: "X/Twitter",  icon: <Twitter className="h-3.5 w-3.5" />,    placeholder: "@usuario" },
];

function isValidHex(c: string) {
  return /^#[0-9A-Fa-f]{3,8}$/.test(c.trim());
}

function toForm(kit: BrandKit | null, clientId: string): EditForm {
  return {
    tone_of_voice:    kit?.tone_of_voice    ?? "",
    content_pillars:  kit?.content_pillars  ?? [],
    preferred_ctas:   kit?.preferred_ctas   ?? [],
    brand_colors:     kit?.brand_colors     ?? [],
    visual_references:kit?.visual_references ?? "",
    no_gos:           kit?.no_gos           ?? "",
    social_handles:   kit?.social_handles   ?? {},
    strategic_notes:  kit?.strategic_notes  ?? "",
    _pillarInput: "",
    _ctaInput:    "",
    _colorInput:  "",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ icon: Icon, label }: { icon: typeof Palette; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

function TagChip({ label, onRemove, color }: { label: string; onRemove?: () => void; color?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium",
        "bg-primary/10 text-primary"
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:text-destructive transition-colors ml-0.5 leading-none"
          type="button"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

function ColorSwatch({ hex }: { hex: string }) {
  const clean = hex.trim();
  if (!isValidHex(clean)) return null;
  return (
    <div
      className="w-7 h-7 rounded-full border-2 border-background ring-1 ring-border/60 shrink-0"
      style={{ backgroundColor: clean }}
      title={clean}
    />
  );
}

function TagInput({
  value,
  onChange,
  onAdd,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
}) {
  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      onAdd();
    }
  };
  return (
    <div className="flex gap-1.5 mt-2">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="h-7 text-xs"
      />
      <Button type="button" size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={onAdd}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BrandKitCard({ clientId }: { clientId: string }) {
  const { data: brandKit, isLoading } = useBrandKit(clientId);
  const upsert = useUpsertBrandKit();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>(() => toForm(null, clientId));

  const hasContent = brandKit && (
    brandKit.tone_of_voice ||
    brandKit.content_pillars.length > 0 ||
    brandKit.preferred_ctas.length > 0 ||
    brandKit.brand_colors.length > 0 ||
    brandKit.visual_references ||
    brandKit.no_gos ||
    Object.keys(brandKit.social_handles).length > 0 ||
    brandKit.strategic_notes
  );

  const startEdit = () => {
    setForm(toForm(brandKit, clientId));
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        client_id: clientId,
        tone_of_voice:    form.tone_of_voice    || null,
        content_pillars:  form.content_pillars,
        preferred_ctas:   form.preferred_ctas,
        brand_colors:     form.brand_colors,
        visual_references:form.visual_references || null,
        no_gos:           form.no_gos           || null,
        social_handles:   form.social_handles,
        strategic_notes:  form.strategic_notes   || null,
      });
      toast.success("Brand Kit guardado");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const addTag = (field: "_pillarInput" | "_ctaInput" | "_colorInput") => {
    const raw = form[field].trim();
    if (!raw) return;
    const target = field === "_pillarInput" ? "content_pillars" : field === "_ctaInput" ? "preferred_ctas" : "brand_colors";
    const value = target === "brand_colors"
      ? (raw.startsWith("#") ? raw : `#${raw}`)
      : raw;
    if (form[target as "content_pillars"].includes(value)) {
      setForm(f => ({ ...f, [field]: "" }));
      return;
    }
    setForm(f => ({
      ...f,
      [target]: [...(f[target as "content_pillars"]), value],
      [field]: "",
    }));
  };

  const removeTag = (field: "content_pillars" | "preferred_ctas" | "brand_colors", idx: number) =>
    setForm(f => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));

  // ── Loading
  if (isLoading) {
    return (
      <Card className="luxury-card p-5">
        <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-3 bg-muted rounded animate-pulse" style={{ width: `${60 + i * 15}%` }} />)}
        </div>
      </Card>
    );
  }

  // ── Empty state (no brand kit yet, not editing)
  if (!hasContent && !editing) {
    return (
      <Card className="luxury-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Brand Kit
          </h3>
        </div>
        <div className="text-center py-6 border border-dashed border-border/60 rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <p className="font-medium text-sm mb-1">Define la identidad de marca</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
            Tono de voz, pilares de contenido, CTAs preferidos, colores,
            qué evitar y cómo suena esta marca.
          </p>
          <Button size="sm" className="gap-1.5" onClick={startEdit}>
            <Plus className="h-3.5 w-3.5" /> Crear Brand Kit
          </Button>
        </div>
      </Card>
    );
  }

  // ── Edit mode
  if (editing) {
    return (
      <Card className="luxury-card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Brand Kit
            <span className="text-xs font-normal text-muted-foreground">(editando)</span>
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" /> Cancelar
            </Button>
            <Button size="sm" className="gap-1 h-7 text-xs" onClick={handleSave} disabled={upsert.isPending}>
              <Check className="h-3 w-3" /> {upsert.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="space-y-5">

          {/* Tone of voice */}
          <div>
            <FieldLabel icon={Mic2} label="Voz & Tono" />
            <Textarea
              value={form.tone_of_voice}
              onChange={e => setForm(f => ({ ...f, tone_of_voice: e.target.value }))}
              placeholder="Ej: Profesional pero cercano. Segunda persona. Sin tecnicismos. Aspiracional pero accesible."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Content pillars */}
          <div>
            <FieldLabel icon={LayoutGrid} label="Pilares de contenido" />
            <div className="flex flex-wrap gap-1.5">
              {form.content_pillars.map((p, i) => (
                <TagChip key={i} label={p} onRemove={() => removeTag("content_pillars", i)} />
              ))}
            </div>
            <TagInput
              value={form._pillarInput}
              onChange={v => setForm(f => ({ ...f, _pillarInput: v }))}
              onAdd={() => addTag("_pillarInput")}
              placeholder="Añadir pilar (Enter para confirmar)"
            />
          </div>

          {/* Preferred CTAs */}
          <div>
            <FieldLabel icon={MousePointerClick} label="CTAs preferidos" />
            <div className="flex flex-wrap gap-1.5">
              {form.preferred_ctas.map((c, i) => (
                <TagChip key={i} label={c} onRemove={() => removeTag("preferred_ctas", i)} />
              ))}
            </div>
            <TagInput
              value={form._ctaInput}
              onChange={v => setForm(f => ({ ...f, _ctaInput: v }))}
              onAdd={() => addTag("_ctaInput")}
              placeholder="Añadir CTA (Enter para confirmar)"
            />
          </div>

          {/* Brand colors */}
          <div>
            <FieldLabel icon={Palette} label="Colores de marca" />
            <div className="flex flex-wrap items-center gap-2">
              {form.brand_colors.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-full px-2.5 py-1">
                  <ColorSwatch hex={c} />
                  <span className="font-mono">{c}</span>
                  <button
                    type="button"
                    onClick={() => removeTag("brand_colors", i)}
                    className="hover:text-destructive transition-colors ml-0.5"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
            <TagInput
              value={form._colorInput}
              onChange={v => setForm(f => ({ ...f, _colorInput: v }))}
              onAdd={() => addTag("_colorInput")}
              placeholder="#RRGGBB (Enter para añadir)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Visual references */}
            <div>
              <FieldLabel icon={Eye} label="Referencias visuales" />
              <Textarea
                value={form.visual_references}
                onChange={e => setForm(f => ({ ...f, visual_references: e.target.value }))}
                placeholder="Estilo visual, referencias de marcas, tipo de fotografía..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            {/* No-gos */}
            <div>
              <FieldLabel icon={AlertTriangle} label="No-gos" />
              <Textarea
                value={form.no_gos}
                onChange={e => setForm(f => ({ ...f, no_gos: e.target.value }))}
                placeholder="Qué evitar: temas, palabras, estilos, comparaciones..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>

          {/* Social handles */}
          <div>
            <FieldLabel icon={Instagram} label="Redes sociales" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SOCIAL_PLATFORMS.map(({ key, label, icon, placeholder }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    {icon} {label}
                  </label>
                  <Input
                    value={form.social_handles[key] ?? ""}
                    onChange={e => setForm(f => ({
                      ...f,
                      social_handles: { ...f.social_handles, [key]: e.target.value || undefined },
                    }))}
                    placeholder={placeholder}
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Strategic notes */}
          <div>
            <FieldLabel icon={NotebookPen} label="Notas estratégicas" />
            <Textarea
              value={form.strategic_notes}
              onChange={e => setForm(f => ({ ...f, strategic_notes: e.target.value }))}
              placeholder="Contexto del cliente, estacionalidad, particularidades del contrato..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>
        </div>
      </Card>
    );
  }

  // ── Read mode
  const kit = brandKit!;
  const activeSocials = SOCIAL_PLATFORMS.filter(p => kit.social_handles[p.key]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="luxury-card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" /> Brand Kit
          </h3>
          <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={startEdit}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
        </div>

        <div className="space-y-5">

          {/* Tone of voice */}
          {kit.tone_of_voice && (
            <div>
              <FieldLabel icon={Mic2} label="Voz & Tono" />
              <p className="text-sm leading-relaxed text-foreground/90 bg-muted/20 rounded-lg px-3 py-2.5 border-l-2 border-primary/40">
                {kit.tone_of_voice}
              </p>
            </div>
          )}

          {/* Content pillars + CTAs side by side */}
          {(kit.content_pillars.length > 0 || kit.preferred_ctas.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {kit.content_pillars.length > 0 && (
                <div>
                  <FieldLabel icon={LayoutGrid} label="Pilares de contenido" />
                  <div className="flex flex-wrap gap-1.5">
                    {kit.content_pillars.map((p, i) => (
                      <TagChip key={i} label={p} />
                    ))}
                  </div>
                </div>
              )}
              {kit.preferred_ctas.length > 0 && (
                <div>
                  <FieldLabel icon={MousePointerClick} label="CTAs preferidos" />
                  <div className="flex flex-wrap gap-1.5">
                    {kit.preferred_ctas.map((c, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium bg-accent/15 text-accent"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Colors + visual refs */}
          {(kit.brand_colors.length > 0 || kit.visual_references) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {kit.brand_colors.length > 0 && (
                <div>
                  <FieldLabel icon={Palette} label="Colores de marca" />
                  <div className="flex items-center gap-2 flex-wrap">
                    {kit.brand_colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-full px-2.5 py-1">
                        <ColorSwatch hex={c} />
                        <span className="font-mono text-muted-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {kit.visual_references && (
                <div>
                  <FieldLabel icon={Eye} label="Referencias visuales" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{kit.visual_references}</p>
                </div>
              )}
            </div>
          )}

          {/* No-gos */}
          {kit.no_gos && (
            <div>
              <FieldLabel icon={AlertTriangle} label="No-gos" />
              <div className="flex items-start gap-2.5 bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/80 leading-relaxed">{kit.no_gos}</p>
              </div>
            </div>
          )}

          {/* Social handles */}
          {activeSocials.length > 0 && (
            <div>
              <FieldLabel icon={Instagram} label="Redes sociales" />
              <div className="flex flex-wrap gap-2">
                {activeSocials.map(({ key, icon }) => (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 text-xs bg-muted/40 rounded-full px-3 py-1.5 text-foreground/80"
                  >
                    <span className="text-muted-foreground">{icon}</span>
                    <span className="font-medium">{kit.social_handles[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strategic notes */}
          {kit.strategic_notes && (
            <div>
              <FieldLabel icon={NotebookPen} label="Notas estratégicas" />
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/20 rounded-lg px-3 py-2.5">
                {kit.strategic_notes}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
