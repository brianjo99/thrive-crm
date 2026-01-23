import { cn } from "@/lib/utils";
import { CLIENT_TYPE_CHECKLISTS, ClientType, ChecklistItem } from "@/types/thrive";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientTypeBadge } from "./Badges";
import { Briefcase, Star, Palette } from "lucide-react";
import { motion } from "framer-motion";

interface ChecklistPanelProps {
  items: ChecklistItem[];
  editable?: boolean;
  onToggle?: (itemId: string) => void;
  className?: string;
}

export function ChecklistPanel({ 
  items, 
  editable = true, 
  onToggle,
  className 
}: ChecklistPanelProps) {
  const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
  const completedCount = items.filter(i => i.checked).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <Card className={cn('luxury-card p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Checklist</h3>
        <span className="text-sm text-muted-foreground">{completedCount}/{items.length}</span>
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full mb-4 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <div className="space-y-4">
        {categories.length > 0 ? (
          categories.map((category) => (
            <div key={category}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {category}
              </p>
              <div className="space-y-2">
                {items
                  .filter((item) => item.category === category)
                  .map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 p-2 -mx-2 rounded-md transition-colors',
                        editable && 'cursor-pointer hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => editable && onToggle?.(item.id)}
                        disabled={!editable}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className={cn(
                        'text-sm',
                        item.checked && 'line-through text-muted-foreground'
                      )}>
                        {item.label}
                      </span>
                    </label>
                  ))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <label
                key={item.id}
                className={cn(
                  'flex items-center gap-3 p-2 -mx-2 rounded-md transition-colors',
                  editable && 'cursor-pointer hover:bg-muted/50'
                )}
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => editable && onToggle?.(item.id)}
                  disabled={!editable}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <span className={cn(
                  'text-sm',
                  item.checked && 'line-through text-muted-foreground'
                )}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

interface DefaultChecklistPreviewProps {
  clientType: ClientType;
  className?: string;
}

export function DefaultChecklistPreview({ clientType, className }: DefaultChecklistPreviewProps) {
  const checklist = CLIENT_TYPE_CHECKLISTS[clientType];

  return (
    <Card className={cn('luxury-card p-5', className)}>
      <div className="flex items-center gap-3 mb-4">
        <ClientTypeBadge type={clientType} />
        <span className="text-sm text-muted-foreground">Default Checklist</span>
      </div>
      
      <div className="space-y-2">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-center gap-3 text-sm">
            <div className="w-4 h-4 rounded border border-border flex-shrink-0" />
            <span>{item.label}</span>
            {item.category && (
              <span className="text-xs text-muted-foreground ml-auto">{item.category}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
