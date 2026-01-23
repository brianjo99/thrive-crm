import { cn } from "@/lib/utils";
import { Task, ChecklistItem } from "@/types/thrive";
import { useThriveStore } from "@/stores/thriveStore";
import { ServiceBadge, StatusBadge } from "./Badges";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Clock, User, ChevronDown, ChevronUp } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskCardProps {
  task: Task;
  compact?: boolean;
  showClient?: boolean;
  className?: string;
}

export function TaskCard({ task, compact = false, showClient = true, className }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { getClientById, toggleChecklistItem, updateTask } = useThriveStore();
  const client = getClientById(task.clientId);

  const priorityClasses = {
    urgent: 'task-priority-high border-l-destructive',
    high: 'task-priority-high',
    medium: 'task-priority-medium',
    low: 'task-priority-low',
  };

  const formatDueDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const completedItems = task.checklist?.filter(i => i.checked).length || 0;
  const totalItems = task.checklist?.length || 0;

  return (
    <Card
      className={cn(
        'luxury-card p-4 transition-all',
        priorityClasses[task.priority],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {task.serviceType && <ServiceBadge service={task.serviceType} size="sm" showLabel={false} />}
            <h4 className="font-medium text-foreground truncate">{task.title}</h4>
          </div>
          
          {!compact && task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {showClient && client && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                {client.name}
              </span>
            )}
            {task.dueDate && (
              <span className={cn(
                "flex items-center gap-1",
                isToday(task.dueDate) ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                <Clock className="h-3 w-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}
            <StatusBadge status={task.status} />
          </div>
        </div>

        {task.checklist && task.checklist.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{completedItems}/{totalItems}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && task.checklist && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {task.checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors"
                >
                  <Checkbox
                    checked={item.checked}
                    onCheckedChange={() => toggleChecklistItem(task.id, item.id)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <span className={cn(item.checked && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
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
  tasks: Task[];
  title?: string;
  emptyMessage?: string;
  compact?: boolean;
  showClient?: boolean;
  className?: string;
}

export function TaskList({ 
  tasks, 
  title, 
  emptyMessage = "No tasks", 
  compact = false,
  showClient = true,
  className 
}: TaskListProps) {
  return (
    <div className={className}>
      {title && (
        <h3 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          {title}
          <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
        </h3>
      )}
      
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <TaskCard task={task} compact={compact} showClient={showClient} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
