import { cn } from "@/lib/utils";
import { UnpaidAlert } from "@/types/thrive";
import { useUnpaidAlerts, useDismissAlert } from "@/hooks/useSupabaseData";
import { AlertTriangle, X, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface AlertBannerProps {
  alert: UnpaidAlert;
  onDismiss: () => void;
  className?: string;
}

export function AlertBanner({ alert, onDismiss, className }: AlertBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -10, height: 0 }}
      className={cn('alert-card flex items-start gap-3', className)}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
        <DollarSign className="h-4 w-4 text-warning" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Consider updating {alert.clientName}'s service package or discussing scope.
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={onDismiss} className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

export function AlertsPanel({ className }: { className?: string }) {
  const { data: alerts = [] } = useUnpaidAlerts();
  const dismissAlert = useDismissAlert();

  if (alerts.length === 0) return null;

  const mappedAlerts: UnpaidAlert[] = alerts.map(a => ({
    id: a.id,
    clientId: a.client_id,
    clientName: (a as any).clients?.name || "Client",
    servicePerformed: a.service_performed,
    message: a.message,
    createdAt: new Date(a.created_at),
    dismissed: a.dismissed,
  }));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle className="h-4 w-4" />
        <h3 className="font-display text-sm font-semibold">Unpaid Work Alerts</h3>
        <span className="text-xs bg-warning/20 px-2 py-0.5 rounded-full">{mappedAlerts.length}</span>
      </div>
      <AnimatePresence mode="popLayout">
        {mappedAlerts.map((alert) => (
          <AlertBanner key={alert.id} alert={alert} onDismiss={() => dismissAlert.mutate(alert.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}
