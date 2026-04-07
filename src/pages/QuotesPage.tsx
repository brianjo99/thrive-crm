import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useCampaigns } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileCheck, DollarSign, Send, CheckCircle, XCircle, Clock,
  Plus, Trash2, FileText, ChevronRight, ArrowLeft, Printer, Edit2, Receipt, Sparkles, Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type Quote = {
  id: string;
  client_id: string | null;
  campaign_id: string | null;
  quote_number: string;
  status: QuoteStatus;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
};

// ─── Config ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:    { label: "Borrador",  color: "bg-muted text-muted-foreground",       icon: <FileText className="h-3 w-3" /> },
  sent:     { label: "Enviada",   color: "bg-blue-500/15 text-blue-400",         icon: <Send className="h-3 w-3" /> },
  accepted: { label: "Aceptada",  color: "bg-green-500/15 text-green-400",       icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "Rechazada", color: "bg-red-500/15 text-red-400",           icon: <XCircle className="h-3 w-3" /> },
  expired:  { label: "Vencida",   color: "bg-yellow-500/15 text-yellow-400",     icon: <Clock className="h-3 w-3" /> },
};

const TABS: { value: QuoteStatus | "all"; label: string }[] = [
  { value: "all",      label: "Todas" },
  { value: "draft",    label: "Borrador" },
  { value: "sent",     label: "Enviadas" },
  { value: "accepted", label: "Aceptadas" },
  { value: "rejected", label: "Rechazadas" },
];

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const EMPTY_ITEM: LineItem = { description: "", quantity: 1, unit_price: 0, amount: 0 };

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useQuotes() {
  return useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((q: any) => ({
        ...q,
        items: Array.isArray(q.items) ? q.items : [],
      })) as Quote[];
    },
  });
}

function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Quote, "id" | "created_at">) => {
      const { data, error } = await (supabase as any).from("quotes").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Omit<Quote, "id" | "created_at">>) => {
      const { error } = await (supabase as any).from("quotes").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

function useConvertToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: Quote) => {
      // Get next invoice number
      const { data: existing } = await supabase.from("invoices").select("invoice_number").order("created_at", { ascending: false }).limit(1);
      const lastNum = existing?.[0]?.invoice_number?.replace(/\D/g, "") ?? "0";
      const nextNum = String(parseInt(lastNum) + 1).padStart(4, "0");
      const invoice_number = `INV-${nextNum}`;

      const { error } = await supabase.from("invoices").insert({
        client_id: quote.client_id,
        campaign_id: quote.campaign_id,
        invoice_number,
        status: "draft",
        items: quote.items,
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        notes: quote.notes,
      } as any);
      if (error) throw error;

      // Mark quote as accepted
      await (supabase as any).from("quotes").update({ status: "accepted" }).eq("id", quote.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Cotización convertida a factura");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ─── Quote Form ───────────────────────────────────────────────────────────────

function QuoteForm({
  initialData,
  onSave,
  onCancel,
  isSaving,
}: {
  initialData: Partial<Quote>;
  onSave: (data: Omit<Quote, "id" | "created_at">) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const { data: clients = [] } = useClients();
  const { data: campaigns = [] } = useCampaigns();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiServiciosDesc, setAiServiciosDesc] = useState("");

  const handleAIGenerateItems = async () => {
    if (!aiServiciosDesc.trim()) return toast.error("Describe los servicios a cotizar");
    const client = clients.find((c: any) => c.id === initialData.client_id);
    const campaign = campaigns.find((c: any) => c.id === initialData.campaign_id);
    setAiLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "quote",
          clientName: client?.name || "",
          campaignName: campaign?.name || "",
          servicios: aiServiciosDesc,
          presupuesto: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newItems: LineItem[] = JSON.parse(data.items);
      setItems(newItems);
      toast.success("Partidas generadas con IA");
    } catch (e: any) { toast.error(e.message); }
    finally { setAiLoading(false); }
  };

  const [form, setForm] = useState({
    client_id: initialData.client_id ?? "",
    campaign_id: initialData.campaign_id ?? "",
    quote_number: initialData.quote_number ?? `COT-${String(Date.now()).slice(-4)}`,
    status: (initialData.status ?? "draft") as QuoteStatus,
    valid_until: initialData.valid_until ?? "",
    notes: initialData.notes ?? "",
    tax: initialData.tax ?? 0,
  });
  const [items, setItems] = useState<LineItem[]>(
    initialData.items?.length ? initialData.items : [{ ...EMPTY_ITEM }]
  );

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[i], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        item.amount = Number(item.quantity) * Number(item.unit_price);
      }
      next[i] = item;
      return next;
    });
  };

  const subtotal = items.reduce((s, it) => s + (it.amount || 0), 0);
  const taxAmount = subtotal * (form.tax / 100);
  const total = subtotal + taxAmount;

  const handleSave = () => {
    if (!form.quote_number) return toast.error("El número de cotización es obligatorio");
    onSave({
      ...form,
      client_id: (form.client_id && form.client_id !== "none") ? form.client_id : null,
      campaign_id: (form.campaign_id && form.campaign_id !== "none") ? form.campaign_id : null,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
      items: items.filter(it => it.description.trim()),
      subtotal,
      tax: taxAmount,
      total,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Número de cotización</Label>
          <Input value={form.quote_number} onChange={e => setForm(f => ({ ...f, quote_number: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as QuoteStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="accepted">Aceptada</SelectItem>
              <SelectItem value="rejected">Rechazada</SelectItem>
              <SelectItem value="expired">Vencida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Cliente</Label>
          <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin cliente</SelectItem>
              {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Campaña</Label>
          <Select value={form.campaign_id} onValueChange={v => setForm(f => ({ ...f, campaign_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Seleccionar campaña..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin campaña</SelectItem>
              {campaigns.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Válida hasta</Label>
          <Input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>IVA / Tax (%)</Label>
          <Input type="number" min="0" max="100" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: parseFloat(e.target.value) || 0 }))} />
        </div>
      </div>

      {/* AI Line Items */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
        <p className="text-sm font-medium text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generar partidas con IA</p>
        <div className="flex gap-2">
          <Input className="text-sm" placeholder="Ej: producción de 4 reels, edición, gestión de redes, fotografía..." value={aiServiciosDesc} onChange={e => setAiServiciosDesc(e.target.value)} />
          <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleAIGenerateItems} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {aiLoading ? "..." : "Generar"}
          </Button>
        </div>
      </div>

      {/* Line items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Servicios / Partidas</h3>
          <Button type="button" variant="ghost" size="sm" className="gap-1 h-7 text-xs"
            onClick={() => setItems(p => [...p, { ...EMPTY_ITEM }])}>
            <Plus className="h-3 w-3" /> Agregar línea
          </Button>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 text-xs text-muted-foreground font-medium">Descripción</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-16">Cant.</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-28">Precio unit.</th>
                <th className="text-right px-3 py-2 text-xs text-muted-foreground font-medium w-28">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t border-border/50">
                  <td className="px-2 py-1.5">
                    <Input className="border-0 bg-transparent h-8 p-0 focus-visible:ring-0" placeholder="Descripción del servicio"
                      value={item.description} onChange={e => updateItem(i, "description", e.target.value)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input className="border-0 bg-transparent h-8 p-0 text-right focus-visible:ring-0" type="number" min="1"
                      value={item.quantity} onChange={e => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input className="border-0 bg-transparent h-8 p-0 text-right focus-visible:ring-0" type="number" min="0" step="0.01"
                      value={item.unit_price} onChange={e => updateItem(i, "unit_price", parseFloat(e.target.value) || 0)} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium">{usd(item.amount)}</td>
                  <td className="px-2 py-1.5">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} disabled={items.length === 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span><span>{usd(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax ({form.tax}%)</span><span>{usd(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-border">
              <span>Total</span><span className="text-primary">{usd(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notas / Términos</Label>
        <Textarea placeholder="Condiciones de pago, validez, términos..." value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar cotización"}
        </Button>
      </div>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function QuoteDetail({
  quote,
  onBack,
  onEdit,
}: {
  quote: Quote;
  onBack: () => void;
  onEdit: () => void;
}) {
  const { data: clients = [] } = useClients();
  const updateQuote  = useUpdateQuote();
  const deleteQuote  = useDeleteQuote();
  const convertToInvoice = useConvertToInvoice();

  const client = clients.find((c: any) => c.id === quote.client_id);
  const cfg    = STATUS_CONFIG[quote.status];

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta cotización?")) return;
    await deleteQuote.mutateAsync(quote.id);
    onBack();
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
        <div className="flex items-center gap-2">
          {quote.status === "sent" && (
            <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={() => convertToInvoice.mutate(quote)} disabled={convertToInvoice.isPending}>
              <Receipt className="h-3.5 w-3.5" /> Convertir a factura
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </Button>
        </div>
      </div>

      <Card className="luxury-card p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold">{quote.quote_number}</h2>
            {client && <p className="text-muted-foreground mt-1">{client.name}</p>}
          </div>
          <span className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium", cfg.color)}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-4">
          <div>
            <p className="text-muted-foreground">Fecha de creación</p>
            <p className="font-medium">{format(parseISO(quote.created_at), "d MMM yyyy")}</p>
          </div>
          {quote.valid_until && (
            <div>
              <p className="text-muted-foreground">Válida hasta</p>
              <p className="font-medium">{format(parseISO(quote.valid_until), "d MMM yyyy")}</p>
            </div>
          )}
        </div>

        {/* Line items */}
        <div>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs text-muted-foreground font-medium">Descripción</th>
                  <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium w-16">Cant.</th>
                  <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium w-28">Precio unit.</th>
                  <th className="text-right px-4 py-2.5 text-xs text-muted-foreground font-medium w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-4 py-2.5">{item.description}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{item.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">{usd(item.unit_price)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{usd(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="w-64 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{usd(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span><span>{usd(quote.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1.5 border-t border-border">
                <span>Total</span><span className="text-primary">{usd(quote.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {quote.notes && (
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-2">Notas / Términos</p>
            <p className="text-sm bg-muted/30 rounded-lg p-3 leading-relaxed">{quote.notes}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuotesPage() {
  const { data: quotes = [], isLoading } = useQuotes();
  const { data: clients = [] } = useClients();
  const createQuote  = useCreateQuote();
  const updateQuote  = useUpdateQuote();

  const [activeTab, setActiveTab]           = useState<QuoteStatus | "all">("all");
  const [view, setView]                     = useState<"list" | "create" | "detail" | "edit">("list");
  const [selectedQuote, setSelectedQuote]   = useState<Quote | null>(null);

  const filtered = quotes.filter(q => activeTab === "all" || q.status === activeTab);

  const totalAccepted  = quotes.filter(q => q.status === "accepted").reduce((s, q) => s + q.total, 0);
  const totalPending   = quotes.filter(q => q.status === "sent").reduce((s, q) => s + q.total, 0);
  const conversionRate = quotes.length > 0
    ? Math.round((quotes.filter(q => q.status === "accepted").length / quotes.length) * 100)
    : 0;

  const handleCreate = async (data: Omit<Quote, "id" | "created_at">) => {
    try {
      await createQuote.mutateAsync(data);
      toast.success("Cotización creada");
      setView("list");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUpdate = async (data: Omit<Quote, "id" | "created_at">) => {
    if (!selectedQuote) return;
    try {
      await updateQuote.mutateAsync({ id: selectedQuote.id, ...data });
      toast.success("Cotización actualizada");
      setView("detail");
    } catch (e: any) { toast.error(e.message); }
  };

  if (view === "create") {
    return (
      <div className="min-h-screen">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Nueva cotización</h1>
          </div>
        </header>
        <main className="p-6 max-w-4xl">
          <QuoteForm initialData={{}} onSave={handleCreate} onCancel={() => setView("list")} isSaving={createQuote.isPending} />
        </main>
      </div>
    );
  }

  if (view === "detail" && selectedQuote) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Cotización</h1>
          </div>
        </header>
        <main className="p-6 max-w-4xl">
          <QuoteDetail
            quote={selectedQuote}
            onBack={() => { setView("list"); setSelectedQuote(null); }}
            onEdit={() => setView("edit")}
          />
        </main>
      </div>
    );
  }

  if (view === "edit" && selectedQuote) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center gap-3">
            <FileCheck className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Editar cotización</h1>
          </div>
        </header>
        <main className="p-6 max-w-4xl">
          <QuoteForm
            initialData={selectedQuote}
            onSave={handleUpdate}
            onCancel={() => setView("detail")}
            isSaving={updateQuote.isPending}
          />
        </main>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">Cotizaciones</h1>
              <span className="text-sm text-muted-foreground">({quotes.length} total)</span>
            </div>
            <Button className="gap-2" onClick={() => setView("create")}>
              <Plus className="h-4 w-4" /> Nueva cotización
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Aceptadas",       value: usd(totalAccepted), sub: "ingresos potenciales", dot: "bg-green-500" },
            { label: "Pendientes",      value: usd(totalPending),  sub: "en espera de respuesta", dot: "bg-blue-500" },
            { label: "Tasa de cierre",  value: `${conversionRate}%`, sub: "de cotizaciones aceptadas", dot: "bg-primary" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="luxury-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-display font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.sub}</p>
                  </div>
                  <span className={cn("w-3 h-3 rounded-full", stat.dot)} />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map(t => (
            <Button key={t.value} variant={activeTab === t.value ? "default" : "outline"} size="sm"
              onClick={() => setActiveTab(t.value)}>
              {t.label}
            </Button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Sin cotizaciones</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Crea cotizaciones para presentar propuestas a tus clientes antes de emitir una factura.
            </p>
            <Button className="gap-2" onClick={() => setView("create")}>
              <Plus className="h-4 w-4" /> Nueva cotización
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((quote, index) => {
              const client = clients.find((c: any) => c.id === quote.client_id);
              const cfg    = STATUS_CONFIG[quote.status];
              return (
                <motion.div key={quote.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card
                    className="luxury-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => { setSelectedQuote(quote); setView("detail"); }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-display font-semibold">{quote.quote_number}</h3>
                          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {client?.name ?? "Sin cliente"} · {format(parseISO(quote.created_at), "d MMM yyyy")}
                          {quote.valid_until && ` · Válida hasta ${format(parseISO(quote.valid_until), "d MMM")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-display font-semibold text-lg">{usd(quote.total)}</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
