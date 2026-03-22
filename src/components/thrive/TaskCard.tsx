import { cn } from "@/lib/utils";
import { ServiceBadge, StatusBadge } from "./Badges";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Clock, User, ChevronDown, ChevronUp } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUpdateTask } from "@/hooks/useSupabaseData";
import type { Database } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";

type TaskRow = Database["public"]["Tables"]["tasks"]["Row"] & {
  clients?: { name: string } | null;
};

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

interface TaskCardProps {
  task: TaskRow;
  compact?: boolean;
  showClient?: boolean;
  className?: string;
}

export function TaskCard({ task, compact = false, showClient = true, className }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const updateTask = useUpdateTask();

  const checklist = (task.checklist as unknown as ChecklistItem[] | null) || [];

  const priorityClasses: Record<string, string> = {
    urgent: 'task-priority-high border-l-destructive',
    high: 'task-priority-high',
    medium: 'task-priority-medium',
    low: 'task-priority-low',
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const completedItems = checklist.filter(i => i.checked).length;
  const totalItems = checklist.length;

  const toggleChecklistItem = (itemId: string) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    updateTask.mutate({ id: task.id, checklist: updated as unknown as Json });
  };

  return (
    <Card className={cn('luxury-card p-4 transition-all', priorityClasses[task.priority], className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {task.service_type && <ServiceBadge service={task.service_type} size="sm" showLabel={false} />}
            <h4 className="font-medium text-foreground truncate">{task.title}</h4>
          </div>
          {!compact && task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {showClient && task.clients?.name && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />{task.clients.name}
              </span>
            )}
            {task.due_date && (
              <span className={cn("flex items-center gap-1", isToday(new Date(task.due_date)) ? "text-primary font-medium" : "text-muted-foreground")}>
                <Clock className="h-3 w-3" />{formatDueDate(task.due_date)}
              </span>
            )}
            <StatusBadge status={task.status} />
          </div>
        </div>
        {totalItems > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <span>{completedItems}/{totalItems}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {expanded && totalItems > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {checklist.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors">
                  <Checkbox checked={item.checked} onCheckedChange={() => toggleChecklistItem(item.id)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <span className={cn(item.checked && "line-through text-muted-foreground")}>{item.label}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

interface TaskListProps {
  tasks: TaskRow[];
  title?: string;
  emptyMessage?: string;
  compact?: boolean;
  showClient?: boolean;
  className?: string;
}

export function TaskList({ tasks, title, emptyMessage = "No tasks", compact = false, showClient = true, className }: TaskListProps) {
  return (
    <div className={className}>
      {title && (
        <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          {title}<span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
        </h3>
      )}
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <TaskCard task={task} compact={compact} showClient={showClient} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
