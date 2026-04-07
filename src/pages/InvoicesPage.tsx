import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useCampaigns } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt, DollarSign, Send, CheckCircle, AlertCircle,
  Plus, Trash2, FileText, Clock, ChevronRight, ArrowLeft, Printer, Save
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format, isPast, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ---------- Types ----------
type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

type Invoice = {
  id: string;
  client_id: string | null;
  campaign_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  items: LineItem[];
  created_at: string;
};

// ---------- Config ----------
const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: "Borrador",  color: "bg-muted text-muted-foreground",   icon: <FileText className="h-3 w-3" /> },
  sent:      { label: "Enviada",   color: "bg-blue-500/15 text-blue-400",     icon: <Send className="h-3 w-3" /> },
  paid:      { label: "Pagada",    color: "bg-green-500/15 text-green-400",   icon: <CheckCircle className="h-3 w-3" /> },
  overdue:   { label: "Vencida",   color: "bg-red-500/15 text-red-400",       icon: <AlertCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelada", color: "bg-zinc-500/15 text-zinc-400",     icon: <Clock className="h-3 w-3" /> },
};

const TABS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all",     label: "Todas" },
  { value: "draft",   label: "Borrador" },
  { value: "sent",    label: "Enviadas" },
  { value: "paid",    label: "Pagadas" },
  { value: "overdue", label: "Vencidas" },
];

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

// ---------- Hooks ----------
function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((inv: any) => ({
        ...inv,
        items: Array.isArray(inv.items) ? inv.items : [],
      })) as Invoice[];
    },
  });
}

function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<Invoice, "id" | "created_at">) => {
      const { data, error } = await supabase.from("invoices").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Invoice>) => {
      const { error } = await supabase.from("invoices").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

// ---------- Helpers ----------
function generateInvoiceNumber(existing: Invoice[]): string {
  const now = new Date();
  const prefix = `INV-${format(now, "yyyyMM")}-`;
  const same = existing.filter(i => i.invoice_number.startsWith(prefix));
  return `${prefix}${(same.length + 1).toString().padStart(3, "0")}`;
}

const EMPTY_ITEM: LineItem = { description: "", quantity: 1, unit_price: 0, amount: 0 };

type FormState = {
  client_id: string;
  campaign_id: string;
  due_date: string;
  tax_pct: number;
  notes: string;
  items: LineItem[];
};

const EMPTY_FORM: FormState = {
  client_id: "", campaign_id: "", due_date: "", tax_pct: 0, notes: "",
  items: [{ ...EMPTY_ITEM }],
};

function calcTotals(items: LineItem[], tax_pct: number) {
  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const taxAmount = subtotal * (tax_pct / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

// ---------- Line Item Row (editable) ----------
function LineItemRow({
  item, index, onChange, onRemove, canRemove,
}: {
  item: LineItem;
  index: number;
  onChange: (i: number, field: keyof LineItem, val: string | number) => void;
  onRemove: (i: number) => void;
  canRemove: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_72px_100px_90px_32px] gap-2 items-center">
      <Input
        value={item.description}
        onChange={e => onChange(index, "description", e.target.value)}
        placeholder="Description"
        className="text-sm h-8"
      />
      <Input
        type="number" min={1}
        value={item.quantity === 0 ? "" : item.quantity}
        onChange={e => onChange(index, "quantity", parseFloat(e.target.value) || 0)}
        className="text-sm text-right h-8"
      />
      <Input
        type="number" min={0} step={0.01}
        value={item.unit_price === 0 ? "" : item.unit_price}
        onChange={e => onChange(index, "unit_price", parseFloat(e.target.value) || 0)}
        className="text-sm text-right h-8"
        placeholder="0.00"
      />
      <div className="text-sm text-right font-medium pr-1">{usd(item.amount)}</div>
      <Button
        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
        disabled={!canRemove}
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ---------- Print ----------
function printInvoice(inv: Invoice, clientName: string, companyName = "Thrive Agency") {
  const itemRows = inv.items.map(it => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #eee">${it.description}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${it.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${usd(it.unit_price)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600">${usd(it.amount)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${inv.invoice_number}</title>
<style>
  body{font-family:Georgia,serif;color:#1a1a1a;margin:0;padding:40px;max-width:750px;margin:0 auto}
  h1{font-size:28px;margin:0 0 4px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid #1a1a1a}
  .company{font-size:13px;color:#666;margin-top:4px}
  .invoice-meta{text-align:right;font-size:13px}
  .invoice-meta strong{font-size:20px;display:block;margin-bottom:8px;font-family:Georgia,serif}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px}
  .meta-block p{margin:0 0 2px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.5px}
  .meta-block strong{font-size:14px}
  table{width:100%;border-collapse:collapse}
  thead th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#888;padding-bottom:8px;border-bottom:2px solid #1a1a1a}
  thead th:not(:first-child){text-align:right}
  .totals{margin-top:24px;text-align:right}
  .totals table{width:220px;margin-left:auto}
  .totals td{padding:4px 0;font-size:14px}
  .totals .total-row td{font-size:18px;font-weight:700;border-top:2px solid #1a1a1a;padding-top:8px}
  .notes{margin-top:32px;padding-top:24px;border-top:1px solid #eee;font-size:13px;color:#555}
  .status{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-top:8px;background:#f0fdf4;color:#16a34a}
  @media print{body{padding:20px}button{display:none}}
</style></head><body>
<div class="header">
  <div>
    <h1>${companyName}</h1>
    <p class="company">Content Creation Agency</p>
  </div>
  <div class="invoice-meta">
    <strong>${inv.invoice_number}</strong>
    <div>Date: ${format(new Date(inv.created_at), "MMMM d, yyyy")}</div>
    ${inv.due_date ? `<div>Due: ${format(parseISO(inv.due_date), "MMMM d, yyyy")}</div>` : ""}
    <span class="status">${STATUS_CONFIG[inv.status].label}</span>
  </div>
</div>
<div class="meta-grid">
  <div class="meta-block"><p>Bill To</p><strong>${clientName}</strong></div>
  ${inv.paid_date ? `<div class="meta-block"><p>Paid On</p><strong>${format(parseISO(inv.paid_date), "MMMM d, yyyy")}</strong></div>` : ""}
</div>
<table>
  <thead>
    <tr>
      <th>Description</th>
      <th style="text-align:right">Qty</th>
      <th style="text-align:right">Unit Price</th>
      <th style="text-align:right">Amount</th>
    </tr>
  </thead>
  <tbody>${itemRows}</tbody>
</table>
<div class="totals">
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${usd(inv.subtotal)}</td></tr>
    <tr><td>Tax</td><td style="text-align:right">${usd(inv.tax)}</td></tr>
    <tr class="total-row"><td>Total</td><td style="text-align:right">${usd(inv.total)}</td></tr>
  </table>
</div>
${inv.notes ? `<div class="notes"><strong>Notes:</strong><br>${inv.notes}</div>` : ""}
<script>window.onload=()=>{window.print();}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

// ---------- Invoice Form (shared between Create & Edit) ----------
function InvoiceForm({
  form, setForm, clients, campaigns, onSave, onCancel, isSaving, saveLabel,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  clients: any[];
  campaigns: any[];
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  saveLabel: string;
}) {
  const filteredCampaigns = campaigns.filter(c => !form.client_id || c.client_id === form.client_id);
  const { subtotal, taxAmount, total } = calcTotals(form.items, form.tax_pct);

  const updateItem = (i: number, field: keyof LineItem, val: string | number) => {
    setForm(f => {
      const items = [...f.items];
      const item = { ...items[i], [field]: val };
      item.amount = (item.quantity || 0) * (item.unit_price || 0);
      items[i] = item;
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="space-y-5">
      {/* Client + Campaign */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Cliente <span className="text-destructive">*</span></label>
          <Select value={form.client_id} onValueChange={v => { setField("client_id", v); setField("campaign_id", ""); }}>
            <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
            <SelectContent>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Campaña <span className="text-xs">(opcional)</span></label>
          <Select value={form.campaign_id} onValueChange={v => setField("campaign_id", v)} disabled={!form.client_id}>
            <SelectTrigger><SelectValue placeholder="Seleccionar campaña" /></SelectTrigger>
            <SelectContent>
              {filteredCampaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Due date */}
      <div className="space-y-1.5 max-w-[200px]">
        <label className="text-sm text-muted-foreground">Fecha de vencimiento</label>
        <Input type="date" value={form.due_date} onChange={e => setField("due_date", e.target.value)} />
      </div>

      {/* Line items */}
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_72px_100px_90px_32px] gap-2 text-xs text-muted-foreground font-medium pb-1 border-b border-border">
          <span>Descripción</span>
          <span className="text-right">Cant.</span>
          <span className="text-right">Precio unit. ($)</span>
          <span className="text-right">Total</span>
          <span />
        </div>
        {form.items.map((item, i) => (
          <LineItemRow
            key={i}
            item={item}
            index={i}
            onChange={updateItem}
            onRemove={removeItem}
            canRemove={form.items.length > 1}
          />
        ))}
        <Button variant="outline" size="sm" onClick={addItem} className="gap-1 mt-1">
          <Plus className="h-3.5 w-3.5" /> Añadir línea
        </Button>
      </div>

      {/* Tax + Totals */}
      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Impuesto %</label>
          <Input
            type="number" min={0} max={100} step={0.5}
            value={form.tax_pct === 0 ? "" : form.tax_pct}
            onChange={e => setField("tax_pct", parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="max-w-[100px]"
          />
        </div>
        <div className="space-y-1.5 text-sm ml-auto text-right min-w-[200px]">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span><span>{usd(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({form.tax_pct}%)</span><span>{usd(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-2 border-t border-border">
            <span>Total</span><span className="text-primary">{usd(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">Notas</label>
        <Textarea
          value={form.notes}
          onChange={e => setField("notes", e.target.value)}
          placeholder="Condiciones de pago, datos bancarios, notas adicionales..."
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-1">
          <Save className="h-3.5 w-3.5" />
          {isSaving ? "Guardando..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function InvoicesPage() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: clients = [] } = useClients();
  const { data: campaigns = [] } = useCampaigns();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [tab, setTab] = useState<InvoiceStatus | "all">("all");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const totalRevenue   = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const outstanding    = invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const draftsTotal    = invoices.filter(i => i.status === "draft").reduce((s, i) => s + i.total, 0);
  const draftsCount    = invoices.filter(i => i.status === "draft").length;
  const overdueCount   = invoices.filter(i => i.status === "overdue").length;
  const filtered       = tab === "all" ? invoices : invoices.filter(i => i.status === tab);
  const clientName     = (id: string | null) => clients.find(c => c.id === id)?.name ?? "—";

  // Sync detail when invoices refresh
  useEffect(() => {
    if (detail) {
      const fresh = invoices.find(i => i.id === detail.id);
      if (fresh) setDetail(fresh);
    }
  }, [invoices]);

  const openEdit = (inv: Invoice) => {
    const taxPct = inv.subtotal > 0 ? Math.round((inv.tax / inv.subtotal) * 100 * 10) / 10 : 0;
    setEditForm({
      client_id: inv.client_id ?? "",
      campaign_id: inv.campaign_id ?? "",
      due_date: inv.due_date ?? "",
      tax_pct: taxPct,
      notes: inv.notes ?? "",
      items: inv.items.length > 0 ? inv.items : [{ ...EMPTY_ITEM }],
    });
    setEditDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!createForm.client_id) { toast.error("Selecciona un cliente"); return; }
    if (createForm.items.every(i => !i.description)) { toast.error("Añade al menos una línea de servicio"); return; }
    const { subtotal, taxAmount, total } = calcTotals(createForm.items, createForm.tax_pct);
    try {
      await createInvoice.mutateAsync({
        client_id: createForm.client_id,
        campaign_id: createForm.campaign_id || null,
        invoice_number: generateInvoiceNumber(invoices),
        status: "draft",
        subtotal,
        tax: taxAmount,
        total,
        due_date: createForm.due_date || null,
        paid_date: null,
        notes: createForm.notes || null,
        items: createForm.items.filter(i => i.description),
      });
      toast.success("Factura creada");
      setNewDialogOpen(false);
      setCreateForm(EMPTY_FORM);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  const handleSaveEdit = async () => {
    if (!detail) return;
    if (!editForm.client_id) { toast.error("Selecciona un cliente"); return; }
    const { subtotal, taxAmount, total } = calcTotals(editForm.items, editForm.tax_pct);
    try {
      await updateInvoice.mutateAsync({
        id: detail.id,
        client_id: editForm.client_id,
        campaign_id: editForm.campaign_id || null,
        due_date: editForm.due_date || null,
        notes: editForm.notes || null,
        subtotal,
        tax: taxAmount,
        total,
        items: editForm.items.filter(i => i.description),
      });
      toast.success("Factura actualizada");
      setEditDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed");
    }
  };

  const handleStatusChange = async (inv: Invoice, status: InvoiceStatus) => {
    const extra: Partial<Invoice> = {};
    if (status === "paid") extra.paid_date = new Date().toISOString().split("T")[0];
    await updateInvoice.mutateAsync({ id: inv.id, status, ...extra });
    toast.success(`Estado actualizado: ${STATUS_CONFIG[status].label}`);
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`¿Eliminar la factura ${inv.invoice_number}?`)) return;
    await deleteInvoice.mutateAsync(inv.id);
    setDetail(null);
    toast.success("Factura eliminada");
  };

  // -------- Detail View --------
  if (detail) {
    const inv = invoices.find(i => i.id === detail.id) ?? detail;
    const client = clients.find(c => c.id === inv.client_id);
    return (
      <div className="min-h-screen">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => setDetail(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{inv.invoice_number}</h1>
              <p className="text-sm text-muted-foreground">{client?.name}</p>
            </div>
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <StatusBadge status={inv.status} />
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => printInvoice(inv, client?.name ?? "Cliente")}>
                <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => openEdit(inv)}>
                <Save className="h-3.5 w-3.5" /> Editar factura
              </Button>
            </div>
          </div>
        </header>

        <main className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Meta */}
          <Card className="luxury-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Cliente</p>
                <p className="font-medium">{client?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Factura #</p>
                <p className="font-medium font-mono">{inv.invoice_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Vence</p>
                <p className={cn("font-medium", inv.due_date && inv.status !== "paid" && isPast(parseISO(inv.due_date)) && "text-red-400")}>
                  {inv.due_date ? format(parseISO(inv.due_date), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Creada</p>
                <p className="font-medium">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
              </div>
              {inv.paid_date && (
                <div>
                  <p className="text-muted-foreground mb-1">Pagada el</p>
                  <p className="font-medium text-green-400">{format(parseISO(inv.paid_date), "MMM d, yyyy")}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Line Items */}
          <Card className="luxury-card p-6">
            <h3 className="font-display font-semibold mb-4">Servicios</h3>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[1fr_72px_96px_88px] gap-2 pb-2 text-xs text-muted-foreground font-medium">
                <span>Descripción</span>
                <span className="text-right">Cant.</span>
                <span className="text-right">Precio unit.</span>
                <span className="text-right">Total</span>
              </div>
              {inv.items.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_72px_96px_88px] gap-2 py-2.5 text-sm">
                  <span>{item.description}</span>
                  <span className="text-right text-muted-foreground">{item.quantity}</span>
                  <span className="text-right text-muted-foreground">{usd(item.unit_price)}</span>
                  <span className="text-right font-medium">{usd(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-sm max-w-xs ml-auto">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{usd(inv.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span><span>{usd(inv.tax)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-1 border-t border-border">
                <span>Total</span><span className="text-primary">{usd(inv.total)}</span>
              </div>
            </div>
          </Card>

          {inv.notes && (
            <Card className="luxury-card p-6">
              <h3 className="font-display font-semibold mb-2">Notas</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{inv.notes}</p>
            </Card>
          )}

          {/* Status Actions */}
          <Card className="luxury-card p-4">
            <p className="text-sm text-muted-foreground mb-3">Cambiar estado</p>
            <div className="flex flex-wrap gap-2">
              {inv.status !== "sent" && inv.status !== "paid" && (
                <Button size="sm" variant="outline" className="gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => handleStatusChange(inv, "sent")} disabled={updateInvoice.isPending}>
                  <Send className="h-3 w-3" /> Marcar enviada
                </Button>
              )}
              {inv.status !== "paid" && (
                <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusChange(inv, "paid")} disabled={updateInvoice.isPending}>
                  <CheckCircle className="h-3 w-3" /> Marcar pagada
                </Button>
              )}
              {inv.status !== "overdue" && inv.status !== "paid" && (
                <Button size="sm" variant="outline" className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleStatusChange(inv, "overdue")} disabled={updateInvoice.isPending}>
                  <AlertCircle className="h-3 w-3" /> Marcar vencida
                </Button>
              )}
              {inv.status !== "cancelled" && inv.status !== "paid" && (
                <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground"
                  onClick={() => handleStatusChange(inv, "cancelled")} disabled={updateInvoice.isPending}>
                  Cancelar factura
                </Button>
              )}
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-destructive ml-auto"
                onClick={() => handleDelete(inv)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </Card>
        </main>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl p-0 flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-0 shrink-0">
              <DialogTitle className="font-display flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Edit {inv.invoice_number}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4">
              <InvoiceForm
                form={editForm}
                setForm={setEditForm}
                clients={clients}
                campaigns={campaigns}
                onSave={handleSaveEdit}
                onCancel={() => setEditDialogOpen(false)}
                isSaving={updateInvoice.isPending}
                saveLabel="Guardar cambios"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // -------- List View --------
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Invoices</h1>
              <p className="text-sm text-muted-foreground">{invoices.length} total invoices</p>
            </div>
          </div>
          <Button onClick={() => { setCreateForm(EMPTY_FORM); setNewDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total cobrado", value: usd(totalRevenue), icon: <DollarSign className="h-4 w-4" />, color: "text-green-400", iconBg: "bg-green-500/10 text-green-400" },
            { label: "Por cobrar",    value: usd(outstanding),  icon: <Send className="h-4 w-4" />,        color: "text-blue-400",  iconBg: "bg-blue-500/10 text-blue-400" },
            { label: `Borradores (${draftsCount})`, value: usd(draftsTotal), icon: <FileText className="h-4 w-4" />, color: "text-muted-foreground", iconBg: "bg-muted text-muted-foreground" },
            { label: "Vencidas",      value: overdueCount,      icon: <AlertCircle className="h-4 w-4" />, color: "text-red-400",   iconBg: "bg-red-500/10 text-red-400" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="luxury-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={cn("text-2xl font-display font-bold", stat.color)}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.iconBg)}>
                    {stat.icon}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                tab === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {t.value === "all" ? invoices.length : invoices.filter(i => i.status === t.value).length}
              </span>
            </button>
          ))}
        </div>

        {/* Invoice List */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No invoices found</h3>
            <p className="text-muted-foreground text-sm">
              {tab === "all" ? "Create your first invoice to get started." : `No ${tab} invoices yet.`}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((inv, idx) => (
              <motion.div key={inv.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                <Card
                  className="luxury-card px-5 py-4 cursor-pointer hover:border-primary/30 transition-colors group"
                  onClick={() => setDetail(inv)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Receipt className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{inv.invoice_number}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{clientName(inv.client_id)}</span>
                        {inv.due_date && (
                          <span className={cn(inv.status !== "paid" && isPast(parseISO(inv.due_date)) ? "text-red-400" : "")}>
                            Due {format(parseISO(inv.due_date), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="hidden md:block">Creada {format(new Date(inv.created_at), "d MMM yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-display font-semibold text-base">{usd(inv.total)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* New Invoice Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-2xl p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle className="font-display flex items-center gap-2">
              <Receipt className="h-4 w-4" /> New Invoice
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 pt-4">
            <InvoiceForm
              form={createForm}
              setForm={setCreateForm}
              clients={clients}
              campaigns={campaigns}
              onSave={handleCreate}
              onCancel={() => setNewDialogOpen(false)}
              isSaving={createInvoice.isPending}
              saveLabel="Create Invoice"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
