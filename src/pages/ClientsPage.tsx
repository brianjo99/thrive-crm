import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients, useCreateClient, useDeleteClient } from "@/hooks/useSupabaseData";
import { ServiceBadge, ClientTypeBadge } from "@/components/thrive/Badges";
import { ClientOnboardingWizard } from "@/components/thrive/ClientOnboardingWizard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Search, Mail, Calendar, User, MoreVertical, Download } from "lucide-react";
import { exportToCsv } from "@/utils/exportCsv";
import { motion } from "framer-motion";
import { ClientType, ServiceType, CLIENT_TYPE_CHECKLISTS } from "@/types/thrive";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";

type ClientRow = Tables<"clients">;

type ClientFormState = {
  name: string;
  email: string;
  type: ClientType;
  enabledServices: ServiceType[];
};

const EMPTY_FORM: ClientFormState = {
  name: "",
  email: "",
  type: "business",
  enabledServices: ["film", "edit"],
};

function ClientForm({
  form,
  onChange,
  onToggleService,
  showChecklist = true,
}: {
  form: ClientFormState;
  onChange: (updates: Partial<ClientFormState>) => void;
  onToggleService: (s: ServiceType) => void;
  showChecklist?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="client-name">Nombre del cliente</Label>
        <Input
          id="client-name"
          value={form.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Nombre del cliente"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="client-email">Email</Label>
        <Input
          id="client-email"
          type="email"
          value={form.email}
          onChange={e => onChange({ email: e.target.value })}
          placeholder="cliente@ejemplo.com"
        />
      </div>
      <div className="space-y-2">
        <Label>Tipo de cliente</Label>
        <Select value={form.type} onValueChange={(v: ClientType) => onChange({ type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="influencer">Influencer</SelectItem>
            <SelectItem value="creator">Creator</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Determina los checklists y flujos por defecto</p>
      </div>
      <div className="space-y-2">
        <Label>Servicios habilitados</Label>
        <div className="flex flex-wrap gap-2">
          {(["film", "edit", "post", "report"] as ServiceType[]).map(service => (
            <button key={service} onClick={() => onToggleService(service)} className="transition-transform hover:scale-105">
              <ServiceBadge service={service} enabled={form.enabledServices.includes(service)} />
            </button>
          ))}
        </div>
      </div>
      {showChecklist && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium mb-2">Vista previa del checklist</p>
          <div className="text-xs text-muted-foreground space-y-1">
            {CLIENT_TYPE_CHECKLISTS[form.type].slice(0, 3).map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border border-border" />
                <span>{item.label}</span>
              </div>
            ))}
            <p>+{CLIENT_TYPE_CHECKLISTS[form.type].length - 3} elementos más</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [onboardingClient, setOnboardingClient] = useState<ClientRow | null>(null);

  const [createForm, setCreateForm] = useState<ClientFormState>(EMPTY_FORM);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleService = (form: ClientFormState, service: ServiceType): ClientFormState => ({
    ...form,
    enabledServices: form.enabledServices.includes(service)
      ? form.enabledServices.filter(s => s !== service)
      : [...form.enabledServices, service],
  });

  const handleCreate = async () => {
    if (!createForm.name) return;
    try {
      await createClient.mutateAsync({
        name: createForm.name,
        email: createForm.email,
        type: createForm.type,
        enabledServices: createForm.enabledServices,
      });
      toast.success("¡Cliente creado!");
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = (client: ClientRow) => {
    if (!confirm(`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`)) return;
    deleteClient.mutate(client.id);
    toast.success("Cliente eliminado");
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">Clientes</h1>
              <span className="text-sm text-muted-foreground">({clients.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => exportToCsv("clientes.csv", clients.map(c => ({
                  Nombre: c.name,
                  Email: c.email || "",
                  Tipo: c.type || "",
                  Creado: c.created_at ? c.created_at.split("T")[0] : "",
                })))}
              >
                <Download className="h-3.5 w-3.5" /> Exportar
              </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Nuevo cliente</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">Crear cliente nuevo</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                  <ClientForm
                    form={createForm}
                    onChange={updates => setCreateForm(f => ({ ...f, ...updates }))}
                    onToggleService={s => setCreateForm(f => toggleService(f, s))}
                  />
                </div>
                <div className="shrink-0 border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={createClient.isPending || !createForm.name}>
                    {createClient.isPending ? "Creando..." : "Crear cliente"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar clientes..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
      </header>

      <main className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No se encontraron clientes</h3>
            <p className="text-muted-foreground mb-4">{searchQuery ? "Intenta con otro término de búsqueda" : "Agrega tu primer cliente para empezar"}</p>
            {!searchQuery && <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo cliente</Button>}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client, index) => (
              <motion.div key={client.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="luxury-card p-5 cursor-pointer group" onClick={() => navigate(`/clients/${client.id}`)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{client.name}</h3>
                        <ClientTypeBadge type={client.type} size="sm" />
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}>
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => { e.stopPropagation(); setOnboardingClient(client); }}>
                          Iniciar onboarding
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={e => { e.stopPropagation(); handleDelete(client); }}>
                          Eliminar cliente
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Mail className="h-3.5 w-3.5" /><span className="truncate" title={client.email}>{client.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Cliente desde {format(new Date(client.created_at), "MMM yyyy")}</span>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Servicios</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["film", "edit", "post", "report"] as const).map(service => (
                        <ServiceBadge key={service} service={service} enabled={client.enabled_services.includes(service)} size="sm" showLabel={false} />
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {onboardingClient && (
          <ClientOnboardingWizard
            client={onboardingClient}
            isOpen={!!onboardingClient}
            onClose={() => setOnboardingClient(null)}
            onComplete={() => setOnboardingClient(null)}
          />
        )}
      </main>
    </div>
  );
}
