import { cn } from "@/lib/utils";
import { 
  Camera, 
  Scissors, 
  Send, 
  BarChart3, 
  Briefcase, 
  Star, 
  Palette,
  Check
} from "lucide-react";
import { ServiceType, ClientType, CampaignTemplate, TaskStatus, PipelineStage } from "@/types/thrive";

interface ServiceBadgeProps {
  service: ServiceType;
  enabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const serviceConfig: Record<ServiceType, { icon: typeof Camera; label: string; color: string }> = {
  film: { icon: Camera, label: 'Film', color: 'bg-[hsl(200_70%_50%/0.15)] text-[hsl(200_70%_45%)]' },
  edit: { icon: Scissors, label: 'Edit', color: 'bg-[hsl(280_60%_55%/0.15)] text-[hsl(280_60%_50%)]' },
  post: { icon: Send, label: 'Post', color: 'bg-[hsl(145_50%_45%/0.15)] text-[hsl(145_50%_40%)]' },
  report: { icon: BarChart3, label: 'Report', color: 'bg-[hsl(42_75%_50%/0.15)] text-[hsl(42_75%_40%)]' },
};

export function ServiceBadge({ service, enabled = true, size = 'md', showLabel = true, className }: ServiceBadgeProps) {
  const config = serviceConfig[service];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'h-5 px-1.5 text-xs gap-1',
    md: 'h-6 px-2 text-xs gap-1.5',
    lg: 'h-8 px-3 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-opacity',
        sizeClasses[size],
        enabled ? config.color : 'bg-muted text-muted-foreground opacity-50',
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface ClientTypeBadgeProps {
  type: ClientType;
  size?: 'sm' | 'md';
  className?: string;
}

const clientTypeConfig: Record<ClientType, { icon: typeof Briefcase; label: string; color: string }> = {
  business: { icon: Briefcase, label: 'Business', color: 'bg-primary/10 text-primary' },
  influencer: { icon: Star, label: 'Influencer', color: 'bg-accent/30 text-accent-foreground' },
  creator: { icon: Palette, label: 'Creator', color: 'bg-secondary text-secondary-foreground' },
};

export function ClientTypeBadge({ type, size = 'md', className }: ClientTypeBadgeProps) {
  const config = clientTypeConfig[type];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'h-5 px-2 text-xs gap-1' : 'h-6 px-2.5 text-xs gap-1.5',
        config.color,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      <span>{config.label}</span>
    </span>
  );
}

interface StatusBadgeProps {
  status: TaskStatus | PipelineStage;
  className?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  'in-progress': 'bg-[hsl(200_70%_50%/0.15)] text-[hsl(200_70%_45%)]',
  review: 'bg-[hsl(42_75%_50%/0.15)] text-[hsl(42_75%_40%)]',
  complete: 'bg-success/15 text-success',
  discovery: 'bg-muted text-muted-foreground',
  'pre-production': 'bg-[hsl(280_60%_55%/0.15)] text-[hsl(280_60%_50%)]',
  filming: 'bg-[hsl(200_70%_50%/0.15)] text-[hsl(200_70%_45%)]',
  editing: 'bg-[hsl(280_60%_55%/0.15)] text-[hsl(280_60%_50%)]',
  revisions: 'bg-warning/15 text-warning',
  posting: 'bg-[hsl(145_50%_45%/0.15)] text-[hsl(145_50%_40%)]',
  reporting: 'bg-[hsl(42_75%_50%/0.15)] text-[hsl(42_75%_40%)]',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = status.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  
  return (
    <span
      className={cn(
        'inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium',
        statusColors[status] || 'bg-muted text-muted-foreground',
        className
      )}
    >
      {status === 'complete' && <Check className="h-3 w-3 mr-1" />}
      {label}
    </span>
  );
}

interface TemplateBadgeProps {
  template: CampaignTemplate;
  className?: string;
}

const templateLabels: Record<CampaignTemplate, string> = {
  'film-only': 'Film Only',
  'film-edit': 'Film + Edit',
  'film-edit-post': 'Film + Edit + Post',
  'edit-only': 'Edit Only',
  'full-service': 'Full Service',
};

export function TemplateBadge({ template, className }: TemplateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-primary/10 text-primary',
        className
      )}
    >
      {templateLabels[template]}
    </span>
  );
}
