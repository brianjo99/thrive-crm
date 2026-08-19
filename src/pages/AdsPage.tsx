import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BarChart3, CircleDollarSign, Facebook, Linkedin, Music2, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

type AdAccount = Database["public"]["Tables"]["ad_accounts"]["Row"];
type AdAccountInsert = Database["public"]["Tables"]["ad_accounts"]["Insert"];

type Platform = "meta_ads" | "google_ads" | "tiktok_ads" | "linkedin_ads";
type AccountStatus = "planned" | "active" | "paused";

type AccountForm = {
  platform: Platform;
  status: AccountStatus;
  account_id: string;
  account_name: string;
  monthly_budget: string;
  notes: string;
};

const EMPTY_FORM: AccountForm = {
  platform: "meta_ads",
  status: "planned",
  account_id: "",
  account_name: "",
  monthly_budget: "",
  notes: "",
};

const PLATFORM_CONFIG: Record<Platform, { label: string; icon: typeof Facebook; color: string }> = {
  meta_ads: { label: "Meta Ads", icon: Facebook, color: "text-blue-400" },
  google_ads: { label: "Google Ads", icon: Search, color: "text-red-400" },
  tiktok_ads: { label: "TikTok Ads", icon: Music2, color: "text-pink-400" },
  linkedin_ads: { label: "LinkedIn Ads", icon: Linkedin, color: "text-sky-400" },
};

const STATUS_CONFIG: Record<AccountStatus, { label: string; className: string }> = {
  planned: { label: "Planificada", className: "bg-muted text-muted-foreground" },
  active: { label: "Activa", className: "bg-green-500/15 text-green-400" },
  paused: { label: "Pausada", className: "bg-yellow-500/15 text-yellow-400" },
};

function asPlatform(value: string): Platform {
  return value in PLATFORM_CONFIG ? value as Platform : "meta_ads";
}

function asStatus(value: string): AccountStatus {
  return value in STATUS_CONFIG ? value as AccountStatus : "planned";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No fue posible completar la acción";
}

function useAdAccounts() {
  return useQuery({
    queryKey: ["ad_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

function AccountDialog({
  open,
  account,
  onClose,
}: {
  open: boolean;
  account: AdAccount | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const initialForm = account ? {
    platform: asPlatform(account.platform),
    status: asStatus(account.status),
    account_id: account.account_id ?? "",
    account_name: account.account_name ?? "",
    monthly_budget: account.monthly_budget?.toString() ?? "",
    notes: account.notes ?? "",
  } : EMPTY_FORM;
  const [form, setForm] = useState<AccountForm>(initialForm);

  const save = useMutation({
    mutationFn: async () => {
      const parsedBudget = form.monthly_budget.trim() === "" ? null : Number(form.monthly_budget);
      if (!form.account_name.trim()) throw new Error("El nombre de la cuenta es obligatorio");
      if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
        throw new Error("El presupuesto debe ser un número válido");
      }

      const payload: AdAccountInsert = {
        platform: form.platform,
        status: form.status,
        account_id: form.account_id.trim() || null,
        account_name: form.account_name.trim(),
        monthly_budget: parsedBudget,
        notes: form.notes.trim() || null,
      };

      const result = account
        ? await supabase.from("ad_accounts").update(payload).eq("id", account.id)
        : await supabase.from("ad_accounts").insert(payload);
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad_accounts"] });
      toast.success(account ? "Cuenta actualizada" : "Cuenta agregada");
      onClose();
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  return (
    <Dialog open={open} onOpenChange={openState => !openState && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{account ? "Editar cuenta publicitaria" : "Agregar cuenta publicitaria"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ad-platform">Plataforma</Label>
            <Select value={form.platform} onValueChange={value => setForm(current => ({ ...current, platform: asPlatform(value) }))}>
              <SelectTrigger id="ad-platform"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PLATFORM_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ad-status">Estado operativo</Label>
            <Select value={form.status} onValueChange={value => setForm(current => ({ ...current, status: asStatus(value) }))}>
              <SelectTrigger id="ad-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ad-name">Nombre de la cuenta</Label>
            <Input id="ad-name" value={form.account_name} onChange={event => setForm(current => ({ ...current, account_name: event.target.value }))} placeholder="Ej. Thrive — Cuenta principal" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ad-id">ID externo (opcional)</Label>
            <Input id="ad-id" value={form.account_id} onChange={event => setForm(current => ({ ...current, account_id: event.target.value }))} placeholder="ID de la plataforma" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ad-budget">Presupuesto mensual</Label>
            <Input id="ad-budget" type="number" min="0" step="0.01" value={form.monthly_budget} onChange={event => setForm(current => ({ ...current, monthly_budget: event.target.value }))} placeholder="0.00" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="ad-notes">Notas</Label>
            <Textarea id="ad-notes" value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Objetivo, responsable, forma de pago u observaciones" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdsPage() {
  const { data: accounts = [], isLoading } = useAdAccounts();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdAccount | null>(null);
  const [deleting, setDeleting] = useState<AdAccount | null>(null);

  const summary = useMemo(() => ({
    total: accounts.length,
    active: accounts.filter(account => account.status === "active").length,
    monthlyBudget: accounts.reduce((sum, account) => sum + (account.monthly_budget ?? 0), 0),
  }), [accounts]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ad_accounts"] });
      setDeleting(null);
      toast.success("Cuenta eliminada");
    },
    onError: (error: unknown) => toast.error(errorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (account: AdAccount) => {
    setEditing(account);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold">Media Buying</h1>
              <p className="text-sm text-muted-foreground">Control operativo de cuentas y presupuestos publicitarios</p>
            </div>
          </div>
          <Button onClick={openCreate} className="w-full gap-2 sm:w-auto">
            <Plus className="h-4 w-4" /> Agregar cuenta
          </Button>
        </div>
      </header>

      <main className="space-y-6 p-4 sm:p-6">
        <Card className="flex items-start gap-3 border-green-500/20 bg-green-500/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
          <div>
            <p className="text-sm font-medium">Datos reales guardados en Supabase</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Este módulo no almacena tokens publicitarios en el navegador ni muestra métricas de demostración como si fueran reales.
            </p>
          </div>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card className="luxury-card p-5">
            <p className="text-sm text-muted-foreground">Cuentas registradas</p>
            <p className="mt-1 font-display text-3xl font-bold">{summary.total}</p>
          </Card>
          <Card className="luxury-card p-5">
            <p className="text-sm text-muted-foreground">Cuentas activas</p>
            <p className="mt-1 font-display text-3xl font-bold text-green-400">{summary.active}</p>
          </Card>
          <Card className="luxury-card p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleDollarSign className="h-4 w-4" /> Presupuesto mensual</div>
            <p className="mt-1 font-display text-3xl font-bold">{summary.monthlyBudget.toLocaleString("es-US", { style: "currency", currency: "USD" })}</p>
          </Card>
        </section>

        {isLoading ? (
          <Card className="luxury-card p-8 text-center text-sm text-muted-foreground">Cargando cuentas...</Card>
        ) : accounts.length === 0 ? (
          <Card className="luxury-card p-10 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-display text-lg font-semibold">Todavía no hay cuentas registradas</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Agrega la primera cuenta para centralizar plataforma, identificador, estado y presupuesto mensual.
            </p>
            <Button onClick={openCreate} className="mt-5 gap-2"><Plus className="h-4 w-4" /> Agregar primera cuenta</Button>
          </Card>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {accounts.map(account => {
              const platform = PLATFORM_CONFIG[asPlatform(account.platform)];
              const status = STATUS_CONFIG[asStatus(account.status)];
              const Icon = platform.icon;
              return (
                <Card key={account.id} className="luxury-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                        <Icon className={`h-5 w-5 ${platform.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{account.account_name || platform.label}</p>
                        <p className="text-xs text-muted-foreground">{platform.label}</p>
                      </div>
                    </div>
                    <Badge className={status.className}>{status.label}</Badge>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">ID externo</dt>
                      <dd className="mt-0.5 truncate">{account.account_id || "No registrado"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Presupuesto</dt>
                      <dd className="mt-0.5">{account.monthly_budget === null ? "Sin definir" : account.monthly_budget.toLocaleString("es-US", { style: "currency", currency: "USD" })}</dd>
                    </div>
                  </dl>

                  {account.notes && <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">{account.notes}</p>}

                  <div className="mt-5 flex gap-2 border-t border-border pt-4">
                    <Button variant="outline" size="sm" onClick={() => openEdit(account)} className="flex-1 gap-1.5">
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(account)} aria-label={`Eliminar ${account.account_name || platform.label}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </section>
        )}
      </main>

      {dialogOpen && (
        <AccountDialog
          key={editing?.id ?? "new"}
          open={dialogOpen}
          account={editing}
          onClose={() => setDialogOpen(false)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará “{deleting?.account_name || "Cuenta publicitaria"}” del registro de Media Buying.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleting && remove.mutate(deleting.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
