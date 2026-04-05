import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save } from "lucide-react";

type OrgSettings = {
  org_name: string;
  timezone: string;
  currency: string;
  language: string;
  date_format: string;
};

const DEFAULTS: OrgSettings = {
  org_name: "Thrive Agency",
  timezone: "America/New_York",
  currency: "USD",
  language: "es",
  date_format: "MM/dd/yyyy",
};

function useOrgSettings() {
  return useQuery({
    queryKey: ["org_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("org_settings").select("key, value");
      if (error) return DEFAULTS;
      const obj: Record<string, string> = {};
      (data ?? []).forEach((row: any) => {
        obj[row.key] = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
      });
      return { ...DEFAULTS, ...obj } as OrgSettings;
    },
  });
}

export default function GeneralSection() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useOrgSettings();
  const [form, setForm] = useState<OrgSettings>(DEFAULTS);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const save = useMutation({
    mutationFn: async (values: OrgSettings) => {
      const rows = Object.entries(values).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("org_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org_settings"] });
      toast.success("Configuración guardada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground text-sm">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold">General</h2>
        <p className="text-sm text-muted-foreground mt-1">Configuración global del CRM</p>
      </div>

      <Card className="luxury-card p-6 space-y-5">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Organización</h3>

        <div className="space-y-2">
          <Label>Nombre de la organización</Label>
          <Input
            value={form.org_name}
            onChange={e => setForm(f => ({ ...f, org_name: e.target.value }))}
            placeholder="Thrive Agency"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Zona horaria</Label>
            <Select value={form.timezone} onValueChange={v => setForm(f => ({ ...f, timezone: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                <SelectItem value="America/Miami">America/Miami (EST)</SelectItem>
                <SelectItem value="America/Bogota">America/Bogota (COT)</SelectItem>
                <SelectItem value="America/Mexico_City">America/Mexico_City (CST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD — Dólar americano</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="COP">COP — Peso colombiano</SelectItem>
                <SelectItem value="MXN">MXN — Peso mexicano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Idioma por defecto</Label>
            <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Formato de fecha</Label>
            <Select value={form.date_format} onValueChange={v => setForm(f => ({ ...f, date_format: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate(form)} disabled={save.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {save.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
