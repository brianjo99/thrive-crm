import { useTasks } from "@/hooks/useSupabaseData";
import { TaskList } from "@/components/thrive/TaskCard";
import { SOPPanel } from "@/components/thrive/SOPPanel";
import { Card } from "@/components/ui/card";
import { Camera, MapPin, CheckCircle, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday } from "date-fns";

export default function VideographerDashboard() {
  const { data: allTasks = [] } = useTasks({ assignee: "videographer" });

  const filmingTasks = allTasks.filter(t => t.service_type === 'film');
  const todaysTasks = filmingTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const upcomingTasks = filmingTasks.filter(t => t.due_date && !isToday(new Date(t.due_date)) && t.status !== 'complete');
  const completedTasks = filmingTasks.filter(t => t.status === 'complete');

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(200_70%_50%/0.15)] flex items-center justify-center">
              <Camera className="h-5 w-5 text-[hsl(200_70%_50%)]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Videographer Dashboard</h1>
              <p className="text-sm text-muted-foreground">Your filming schedule and shot lists</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="luxury-card p-5 border-l-4 border-l-[hsl(200_70%_50%)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-[hsl(200_70%_50%)]" />
                    <h2 className="font-display text-lg font-semibold">Filming Today</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMM d')}</span>
                </div>
                {todaysTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No shoots scheduled for today</p>
                  </div>
                ) : (
                  <TaskList tasks={todaysTasks} />
                )}
              </Card>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="luxury-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-lg font-semibold">Upcoming Shoots</h2>
                </div>
                <TaskList tasks={upcomingTasks} compact emptyMessage="No upcoming shoots scheduled" />
              </Card>
            </motion.div>
          </div>
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <SOPPanel role="videographer" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="luxury-card p-5">
                <h3 className="font-display font-semibold mb-4">This Week</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Shoots Completed</span>
                    <span className="font-medium">{completedTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Scheduled</span>
                    <span className="font-medium">{upcomingTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Today</span>
                    <span className="font-medium">{todaysTasks.length}</span>
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
