import { cn } from "@/lib/utils";
import { Client } from "@/types/thrive";
import { useThriveStore } from "@/stores/thriveStore";
import { Card } from "@/components/ui/card";
import { ServiceBadge, ClientTypeBadge } from "./Badges";
import { User, Mail, MoreVertical, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ClientCardProps {
  client: Client;
  onClick?: () => void;
  className?: string;
}

export function ClientCard({ client, onClick, className }: ClientCardProps) {
  const { deleteClient } = useThriveStore();

  return (
    <Card
      className={cn(
        "luxury-card group relative overflow-hidden p-0",
        className
      )}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={`Ver cliente ${client.name}`}
        className="w-full p-5 text-left transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:cursor-default"
      >
        <div className="flex items-start justify-between mb-4 pr-9">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground">{client.name}</h3>
              <ClientTypeBadge type={client.type} size="sm" />
            </div>
          </div>
        </div>

        {client.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate">{client.email}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Calendar className="h-3.5 w-3.5" />
          <span>Cliente desde {format(client.createdAt, "MMM yyyy", { locale: es })}</span>
        </div>

        <div className="pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Servicios</p>
          <div className="flex flex-wrap gap-1.5">
            {(["film", "edit", "post", "report"] as const).map((service) => (
              <ServiceBadge
                key={service}
                service={service}
                enabled={client.enabledServices.includes(service)}
                size="sm"
                showLabel={false}
              />
            ))}
          </div>
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Acciones para ${client.name}`}
            className="absolute right-4 top-4 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onClick}>Ver cliente</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => {
              if (window.confirm(`¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`)) {
                deleteClient(client.id);
              }
            }}
          >
            Eliminar cliente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
}

interface ClientListProps {
  clients: Client[];
  onClientClick?: (client: Client) => void;
  className?: string;
}

export function ClientList({ clients, onClientClick, className }: ClientListProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {clients.map((client, index) => (
        <motion.div
          key={client.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <ClientCard client={client} onClick={() => onClientClick?.(client)} />
        </motion.div>
      ))}
    </div>
  );
}
