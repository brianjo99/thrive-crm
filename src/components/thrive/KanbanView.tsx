import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, User, GripVertical } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";

type Task = {
  id: string;
  title: string;
  status: string;
  due_date?: string | null;
  service_type?: string | null;
  stage?: string | null;
  [key: string]: any;
};

const COLUMNS = [
  { id: "todo", label: "To Do", color: "text-muted-foreground", bg: "bg-muted/30", border: "border-muted/50" },
  { id: "in_progress", label: "In Progress", color: "text-[hsl(200_70%_50%)]", bg: "bg-[hsl(200_70%_50%/0.05)]", border: "border-[hsl(200_70%_50%/0.3)]" },
  { id: "review", label: "Review", color: "text-warning", bg: "bg-warning/5", border: "border-warning/30" },
  { id: "complete", label: "Complete", color: "text-success", bg: "bg-success/5", border: "border-success/30" },
];

const serviceColors: Record<string, string> = {
  film: "bg-[hsl(200_70%_50%/0.15)] text-[hsl(200_70%_50%)]",
  edit: "bg-[hsl(280_60%_55%/0.15)] text-[hsl(280_60%_55%)]",
  post: "bg-success/15 text-success",
  report: "bg-warning/15 text-warning",
};

function TaskCard({ task, onDragStart }: { task: Task; onDragStart: (e: React.DragEvent, task: Task) => void }) {
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const overdue = dueDate && isPast(dueDate) && task.status !== "complete";
  const today = dueDate && isToday(dueDate);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task)}
      className="group cursor-grab active:cursor-grabbing"
    >
      <Card className="luxury-card p-3 hover:border-primary/30 transition-all hover:shadow-md active:opacity-70 select-none">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 mt-0.5 flex-shrink-0 transition-colors" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {task.service_type && (
                <Badge variant="outline" className={cn("text-xs px-1.5 py-0 border-0", serviceColors[task.service_type] || "bg-muted text-muted-foreground")}>
                  {task.service_type}
                </Badge>
              )}
              {dueDate && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs",
                  overdue ? "text-destructive" : today ? "text-warning" : "text-muted-foreground"
                )}>
                  <Calendar className="h-3 w-3" />
                  {overdue ? "Overdue" : today ? "Today" : format(dueDate, "MMM d")}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Column({
  column,
  tasks,
  onDragStart,
  onDrop,
  onDragOver,
  isDragOver,
}: {
  column: typeof COLUMNS[0];
  tasks: Task[];
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  isDragOver: boolean;
}) {
  return (
    <div
      className={cn("flex flex-col rounded-xl border transition-colors min-h-[200px]", column.bg, column.border, isDragOver && "border-primary/50 bg-primary/5")}
      onDrop={e => onDrop(e, column.id)}
      onDragOver={onDragOver}
    >
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h3 className={cn("text-sm font-semibold", column.color)}>{column.label}</h3>
          <span className="text-xs text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
      </div>
      <div className={cn("flex-1 p-2 space-y-2 transition-colors", isDragOver && "bg-primary/5 rounded-b-xl")}>
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart} />
        ))}
        {tasks.length === 0 && (
          <div className="h-20 flex items-center justify-center text-xs text-muted-foreground/50">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanView({ tasks }: { tasks: Task[] }) {
  const qc = useQueryClient();
  const [dragging, setDragging] = useState<Task | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: () => toast.error("Failed to update task"),
  });

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDragging(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOverCol(null);
    if (dragging && dragging.status !== status) {
      await updateStatus.mutateAsync({ id: dragging.id, status });
      toast.success(`Moved to ${COLUMNS.find(c => c.id === status)?.label}`);
    }
    setDragging(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colId);
  };

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {COLUMNS.map(col => (
        <Column
          key={col.id}
          column={col}
          tasks={tasksByStatus[col.id] || []}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragOver={e => handleDragOver(e, col.id)}
          isDragOver={dragOverCol === col.id}
        />
      ))}
    </div>
  );
}
