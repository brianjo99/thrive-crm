import { useTasks, useShotLists } from "@/hooks/useSupabaseData";
import { TaskList } from "@/components/thrive/TaskCard";
import { SOPPanel } from "@/components/thrive/SOPPanel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle, Calendar, FileStack, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { format, isToday } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function VideographerDashboard() {
  const { data: allTasks = [] } = useTasks({ assignee: "videographer" });
  const { data: shotLists = [] } = useShotLists();
  const navigate = useNavigate();

  const filmingTasks = allTasks.filter(t => t.service_type === 'film');
  const todaysTasks = filmingTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const upcomingTasks = filmingTasks.filter(t => t.due_date && !isToday(new Date(t.due_date)) && t.status !== 'complete');
  const completedTasks = filmingTasks.filter(t => t.status === 'complete');

  // Map campaign_id → shot list for quick lookup
  const shotListByCampaign = new Map(shotLists.map(sl => [sl.campaign_id, sl]));

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(200_70%_50%/0.15)] flex items-center justify-center">
              <Camera className="h-5 w-5 text-[hsl(200_70%_50%)]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Dashboard Videógrafo</h1>
              <p className="text-sm text-muted-foreground">Tu agenda de filmaciones y call sheets</p>
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
                    <h2 className="font-display text-lg font-semibold">Filmaciones de hoy</h2>
                  </div>
                  <span className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d MMM")}</span>
                </div>
                {todaysTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Sin filmaciones programadas para hoy</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <TaskList tasks={todaysTasks} showCampaign />
                    {todaysTasks.some(t => shotListByCampaign.has(t.campaign_id)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 w-full"
                        onClick={() => navigate("/shot-lists")}
                      >
                        <FileStack className="h-4 w-4" /> Ver Call Sheets
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="luxury-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-lg font-semibold">Próximas filmaciones</h2>
                  </div>
                  {upcomingTasks.some(t => shotListByCampaign.has(t.campaign_id)) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => navigate("/shot-lists")}
                    >
                      <FileStack className="h-3 w-3" /> Call Sheets
                    </Button>
                  )}
                </div>
                <TaskList tasks={upcomingTasks} compact showCampaign emptyMessage="Sin próximas filmaciones" />
              </Card>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <SOPPanel role="videographer" />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card className="luxury-card p-5">
                <h3 className="font-display font-semibold mb-4">Esta semana</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Filmaciones completadas</span>
                    <span className="font-medium">{completedTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Programadas</span>
                    <span className="font-medium">{upcomingTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Hoy</span>
                    <span className="font-medium">{todaysTasks.length}</span>
                  </div>
                  {shotLists.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => navigate("/shot-lists")}
                      >
                        <FileStack className="h-4 w-4" /> {shotLists.length} Call Sheet{shotLists.length !== 1 ? "s" : ""}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
