import { useTasks } from "@/hooks/useSupabaseData";
import { TaskList } from "@/components/thrive/TaskCard";
import { SOPPanel } from "@/components/thrive/SOPPanel";
import { Card } from "@/components/ui/card";
import { Scissors, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function EditorDashboard() {
  const { data: allTasks = [] } = useTasks({ assignee: "editor" });

  const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'in-progress');
  const completedTasks = allTasks.filter(t => t.status === 'complete');

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(280_60%_55%/0.15)] flex items-center justify-center">
              <Scissors className="h-5 w-5 text-[hsl(280_60%_55%)]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Dashboard Editor</h1>
              <p className="text-sm text-muted-foreground">Tus tareas de edición y flujos de trabajo</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="luxury-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Scissors className="h-5 w-5 text-[hsl(280_60%_55%)]" />
                    <h2 className="font-display text-lg font-semibold">Mis tareas de edición</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">{pendingTasks.length} activas</span>
                </div>
                <TaskList tasks={pendingTasks} showCampaign emptyMessage="No hay tareas de edición asignadas" />
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="luxury-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <h2 className="font-display text-lg font-semibold">Completadas</h2>
                </div>
                <TaskList tasks={completedTasks.slice(0, 5)} compact emptyMessage="Sin tareas completadas todavía" />
              </Card>
            </motion.div>
          </div>
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <SOPPanel role="editor" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="luxury-card p-5">
                <h3 className="font-display font-semibold mb-4">Esta semana</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completadas</span>
                    <span className="font-medium">{completedTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">En progreso</span>
                    <span className="font-medium">{allTasks.filter(t => t.status === 'in-progress').length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">En revisión</span>
                    <span className="font-medium">{allTasks.filter(t => t.status === 'review').length}</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
