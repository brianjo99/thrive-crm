import { cn } from "@/lib/utils";
import { CampaignTemplate, SERVICE_TEMPLATES, ServiceType, PipelineStage } from "@/types/thrive";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServiceBadge } from "./Badges";
import { ArrowRight, Check, Camera, Scissors, Send, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

interface CampaignTemplateCardProps {
  template: CampaignTemplate;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

const templateDescriptions: Record<CampaignTemplate, string> = {
  'film-only': 'Capture raw footage only. Client handles editing and posting.',
  'film-edit': 'Full production from filming to polished edit. Client posts.',
  'film-edit-post': 'Complete content creation with strategic posting.',
  'edit-only': 'Transform client-provided footage into professional content.',
  'full-service': 'End-to-end content solution including analytics and reporting.',
};

const templateIcons: Record<CampaignTemplate, React.ReactNode> = {
  'film-only': <Camera className="h-5 w-5" />,
  'film-edit': (
    <div className="flex items-center gap-1">
      <Camera className="h-4 w-4" />
      <ArrowRight className="h-3 w-3" />
      <Scissors className="h-4 w-4" />
    </div>
  ),
  'film-edit-post': (
    <div className="flex items-center gap-1">
      <Camera className="h-4 w-4" />
      <ArrowRight className="h-3 w-3" />
      <Scissors className="h-4 w-4" />
      <ArrowRight className="h-3 w-3" />
      <Send className="h-4 w-4" />
    </div>
  ),
  'edit-only': <Scissors className="h-5 w-5" />,
  'full-service': (
    <div className="flex items-center gap-1">
      <Camera className="h-4 w-4" />
      <Scissors className="h-4 w-4" />
      <Send className="h-4 w-4" />
      <BarChart3 className="h-4 w-4" />
    </div>
  ),
};

export function CampaignTemplateCard({ 
  template, 
  selected, 
  onSelect,
  className 
}: CampaignTemplateCardProps) {
  const config = SERVICE_TEMPLATES[template];

  return (
    <Card
      className={cn(
        'luxury-card p-5 cursor-pointer transition-all relative overflow-hidden',
        selected && 'ring-2 ring-primary',
        className
      )}
      onClick={onSelect}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
        >
          <Check className="h-4 w-4 text-primary-foreground" />
        </motion.div>
      )}

      <div className="text-primary mb-3">{templateIcons[template]}</div>

      <h3 className="font-display font-semibold text-lg mb-2">{config.label}</h3>
      <p className="text-sm text-muted-foreground mb-4">{templateDescriptions[template]}</p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {config.services.map((service) => (
          <ServiceBadge key={service} service={service} size="sm" />
        ))}
      </div>

      <div className="pt-3 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Pipeline Stages</p>
        <div className="flex flex-wrap gap-1">
          {config.stages.map((stage, i) => (
            <span key={stage} className="text-xs text-muted-foreground">
              {stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' ')}
              {i < config.stages.length - 1 && <span className="mx-1">→</span>}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

interface CampaignTemplateGridProps {
  selectedTemplate?: CampaignTemplate;
  onSelectTemplate?: (template: CampaignTemplate) => void;
  className?: string;
}

export function CampaignTemplateGrid({ 
  selectedTemplate, 
  onSelectTemplate,
  className 
}: CampaignTemplateGridProps) {
  const templates = Object.keys(SERVICE_TEMPLATES) as CampaignTemplate[];

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {templates.map((template, index) => (
        <motion.div
          key={template}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CampaignTemplateCard
            template={template}
            selected={selectedTemplate === template}
            onSelect={() => onSelectTemplate?.(template)}
          />
        </motion.div>
      ))}
    </div>
  );
}
