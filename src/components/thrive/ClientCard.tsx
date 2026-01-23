import { cn } from "@/lib/utils";
import { Client, ChecklistItem } from "@/types/thrive";
import { useThriveStore } from "@/stores/thriveStore";
import { Card } from "@/components/ui/card";
import { ServiceBadge, ClientTypeBadge } from "./Badges";
import { User, Mail, MoreVertical, Calendar } from "lucide-react";
import { format } from "date-fns";
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
        'luxury-card p-5 cursor-pointer group',
        className
      )}
      onClick={onClick}
    >
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
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit Client</DropdownMenuItem>
            <DropdownMenuItem>View Campaigns</DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                deleteClient(client.id);
              }}
            >
              Delete Client
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {client.email && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Mail className="h-3.5 w-3.5" />
          <span className="truncate">{client.email}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <Calendar className="h-3.5 w-3.5" />
        <span>Client since {format(client.createdAt, 'MMM yyyy')}</span>
      </div>

      <div className="pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Services</p>
        <div className="flex flex-wrap gap-1.5">
          {(['film', 'edit', 'post', 'report'] as const).map((service) => (
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
