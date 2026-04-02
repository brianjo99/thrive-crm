import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClients, useCampaigns } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt, DollarSign, Send, CheckCircle, AlertCircle,
  Plus, Trash2, FileText, Clock, ChevronRight, ArrowLeft
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
  draft:     { label: "Draft",     color: "bg-muted text-muted-foreground",      icon: <FileText className="h-3 w-3" /> },
  sent:      { label: "Sent",      color: "bg-blue-500/15 text-blue-400",        icon: <Send className="h-3 w-3" /> },
  paid:      { label: "Paid",      color: "bg-green-500/15 text-green-400",      icon: <CheckCircle className="h-3 w-3" /> },
  overdue:   { label: "Overdue",   color: "bg-red-500/15 text-red-400",          icon: <AlertCircle className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-zinc-500/15 text-zinc-400",        icon: <Clock className="h-3 w-3" /> },
};

const TABS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "draft",     label: "Draft" },
  { value: "sent",      label: "Sent" },
  { value: "paid",      label: "Paid" },
  { value: "overdue",   label: "Overdue" },
];

const usd = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

// ---------- Local Hooks ----------
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
      const { data, error } = await supabase
        .from("invoices")
        .insert(input)
        .select()
        .single();
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
  const next = (same.length + 1).toString().padStart(3, "0");
  return `${prefix}${next}`;
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
  client_id: "",
  campaign_id: "",
  due_date: "",
  tax_pct: 0,
  notes: "",
  items: [{ ...EMPTY_ITEM }],
};

// ---------- Line Item Row ----------
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
    <div className="grid grid-cols-[1fr_72px_96px_88px_32px] gap-2 items-center">
      <Input
        value={item.description}
        onChange={e => onChange(index, "description", e.target.value)}
        placeholder="Description"
        className="text-sm"
      />
      <Input
        type="number"
        min={1}
        value={item.quantity}
        onChange={e => onChange(index, "quantity", parseFloat(e.target.value) || 0)}
        className="text-sm text-right"
      />
      <Input
        type="number"
        min={0}
        step={0.01}
        value={item.unit_price}
        onChange={e => onChange(index, "unit_price", parseFloat(e.target.value) || 0)}
        className="text-sm text-right"
        placeholder="Price"
      />
      <div className="text-sm text-right font-medium text-muted-foreground pr-1">{usd(item.amount)}</div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        disabled={!canRemove}
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ---------- Status Badge ----------
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", cfg.color)}>
      {cfg.icon} {cfg.label}
    </span>
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
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Stats
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const draftsCount = invoices.filter(i => i.status === "draft").length;
  const overdueCount = invoices.filter(i => i.status === "overdue").length;

  // Filtered list
  const filtered = tab === "all" ? invoices : invoices.filter(i => i.status === tab);

  const clientName = (id: string | null) => clients.find(c => c.id === id)?.name ?? "—";
  const filteredCampaigns = campaigns.filter(c => !form.client_id || c.client_id === form.client_id);

  // Form calculations
  const subtotal = form.items.reduce((s, it) => s + it.amount, 0);
  const taxAmount = subtotal * (form.tax_pct / 100);
  const total = subtotal + taxAmount;

  const updateItem = (i: number, field: keyof LineItem, val: string | number) => {
    setForm(f => {
      const items = [...f.items];
      const item = { ...items[i], [field]: val };
      item.amount = item.quantity * item.unit_price;
      items[i] = item;
      return { ...f, items };
    });
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm(f => ({ ...f, [key]: val }));

  const openNew = () => {
    setForm(EMPTY_FORM);
    setNewDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.client_id) { toast.error("Client is required"); return; }
    if (form.items.length === 0 || form.items.every(i => !i.description)) {
      toast.error("At least one line item is required"); return;
    }
    try {
      await createInvoice.mutateAsync({
        client_id: form.client_id,
        campaign_id: form.campaign_id || null,
        invoice_number: generateInvoiceNumber(invoices),
        status: "draft",
        subtotal,
        tax: taxAmount,
        total,
        due_date: form.due_date || null,
        paid_date: null,
        notes: form.notes || null,
        items: form.items.filter(i => i.description),
      });
      toast.success("Invoice created");
      setNewDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create invoice");
    }
  };

  const handleStatusChange = async (inv: Invoice, status: InvoiceStatus) => {
    const extra: Partial<Invoice> = {};
    if (status === "paid") extra.paid_date = new Date().toISOString().split("T")[0];
    await updateInvoice.mutateAsync({ id: inv.id, status, ...extra });
    setDetail(d => d ? { ...d, status, ...extra } : null);
    toast.success(`Invoice marked as ${STATUS_CONFIG[status].label}`);
  };

  const handleDelete = async (inv: Invoice) => {
    if (!confirm(`Delete invoice ${inv.invoice_number}?`)) return;
    await deleteInvoice.mutateAsync(inv.id);
    setDetail(null);
    toast.success("Invoice deleted");
  };

  // Detail view
  if (detail) {
    const inv = invoices.find(i => i.id === detail.id) ?? detail;
    const client = clients.find(c => c.id === inv.client_id);
    return (
      <div className="min-h-screen">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center gap-3">
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
            <div className="ml-auto flex items-center gap-2">
              <StatusBadge status={inv.status} />
            </div>
          </div>
        </header>

        <main className="p-6 max-w-3xl mx-auto space-y-6">
          {/* Meta */}
          <Card className="luxury-card p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Client</p>
                <p className="font-medium">{client?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Invoice #</p>
                <p className="font-medium font-mono">{inv.invoice_number}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Due Date</p>
                <p className={cn("font-medium", inv.due_date && inv.status !== "paid" && isPast(parseISO(inv.due_date)) && "text-red-400")}>
                  {inv.due_date ? format(parseISO(inv.due_date), "MMM d, yyyy") : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Created</p>
                <p className="font-medium">{format(new Date(inv.created_at), "MMM d, yyyy")}</p>
              </div>
              {inv.paid_date && (
                <div>
                  <p className="text-muted-foreground mb-1">Paid On</p>
                  <p className="font-medium text-green-400">{format(parseISO(inv.paid_date), "MMM d, yyyy")}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Line Items */}
          <Card className="luxury-card p-6">
            <h3 className="font-display font-semibold mb-4">Line Items</h3>
            <div className="space-y-0 divide-y divide-border">
              <div className="grid grid-cols-[1fr_72px_96px_88px] gap-2 pb-2 text-xs text-muted-foreground font-medium">
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Amount</span>
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
              <h3 className="font-display font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{inv.notes}</p>
            </Card>
          )}

          {/* Actions */}
          <Card className="luxury-card p-4">
            <p className="text-sm text-muted-foreground mb-3">Update Status</p>
            <div className="flex flex-wrap gap-2">
              {inv.status !== "sent" && inv.status !== "paid" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => handleStatusChange(inv, "sent")}
                  disabled={updateInvoice.isPending}
                >
                  <Send className="h-3 w-3" /> Mark as Sent
                </Button>
              )}
              {inv.status !== "paid" && (
                <Button
                  size="sm"
                  className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusChange(inv, "paid")}
                  disabled={updateInvoice.isPending}
                >
                  <CheckCircle className="h-3 w-3" /> Mark as Paid
                </Button>
              )}
              {inv.status !== "overdue" && inv.status !== "paid" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => handleStatusChange(inv, "overdue")}
                  disabled={updateInvoice.isPending}
                >
                  <AlertCircle className="h-3 w-3" /> Mark as Overdue
                </Button>
              )}
              {inv.status !== "cancelled" && inv.status !== "paid" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-muted-foreground"
                  onClick={() => handleStatusChange(inv, "cancelled")}
                  disabled={updateInvoice.isPending}
                >
                  Cancel Invoice
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-muted-foreground hover:text-destructive ml-auto"
                onClick={() => handleDelete(inv)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
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
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Revenue", value: usd(totalRevenue), icon: <DollarSign className="h-4 w-4" />, color: "text-green-400", iconBg: "bg-green-500/10 text-green-400" },
            { label: "Outstanding",   value: usd(outstanding),  icon: <Send className="h-4 w-4" />,        color: "text-blue-400",  iconBg: "bg-blue-500/10 text-blue-400" },
            { label: "Drafts",        value: draftsCount,       icon: <FileText className="h-4 w-4" />,    color: "text-muted-foreground", iconBg: "bg-muted text-muted-foreground" },
            { label: "Overdue",       value: overdueCount,      icon: <AlertCircle className="h-4 w-4" />, color: "text-red-400",   iconBg: "bg-red-500/10 text-red-400" },
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
                tab === t.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
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
                          <span className={cn(
                            inv.status !== "paid" && isPast(parseISO(inv.due_date)) ? "text-red-400" : ""
                          )}>
                            Due {format(parseISO(inv.due_date), "MMM d, yyyy")}
                          </span>
                        )}
                        <span className="hidden md:block">
                          Created {format(new Date(inv.created_at), "MMM d, yyyy")}
                        </span>
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
        <DialogContent className="sm:max-w-2xl p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-display flex items-center gap-2">
              <Receipt className="h-4 w-4" /> New Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 pt-4 space-y-5 overflow-y-auto max-h-[80vh]">
            {/* Client + Campaign */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Client <span className="text-destructive">*</span></label>
                <Select value={form.client_id} onValueChange={v => { setField("client_id", v); setField("campaign_id", ""); }}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Campaign <span className="text-xs">(optional)</span></label>
                <Select value={form.campaign_id} onValueChange={v => setField("campaign_id", v)} disabled={!form.client_id}>
                  <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                  <SelectContent>
                    {filteredCampaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due date */}
            <div className="space-y-1.5 max-w-xs">
              <label className="text-sm text-muted-foreground">Due Date</label>
              <Input type="date" value={form.due_date} onChange={e => setField("due_date", e.target.value)} />
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_72px_96px_88px_32px] gap-2 text-xs text-muted-foreground font-medium pb-1">
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Amount</span>
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
                <Plus className="h-3.5 w-3.5" /> Add Line Item
              </Button>
            </div>

            {/* Tax + Totals */}
            <div className="grid grid-cols-2 gap-6 items-start">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Tax %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={form.tax_pct}
                  onChange={e => setField("tax_pct", parseFloat(e.target.value) || 0)}
                  className="max-w-[100px]"
                />
              </div>
              <div className="space-y-1.5 text-sm ml-auto text-right min-w-[180px]">
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
              <label className="text-sm text-muted-foreground">Notes</label>
              <Textarea
                value={form.notes}
                onChange={e => setField("notes", e.target.value)}
                placeholder="Payment terms, additional info..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={createInvoice.isPending} className="gap-1">
                <FileText className="h-3.5 w-3.5" />
                {createInvoice.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
