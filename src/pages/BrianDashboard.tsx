import { useThriveStore } from "@/stores/thriveStore";
import { TaskList } from "@/components/thrive/TaskCard";
import { AlertsPanel } from "@/components/thrive/AlertsPanel";
import { Card } from "@/components/ui/card";
import { 
  Camera, 
  Scissors, 
  CheckCircle, 
  Send, 
  Users, 
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function BrianDashboard() {
  const { 
    getTodaysTasks, 
    getTasksToReview, 
    getPendingApprovals,
    getContentToPost,
    clients,
    unpaidAlerts,
    campaigns
  } = useThriveStore();

  const todaysTasks = getTodaysTasks();
  const tasksToReview = getTasksToReview();
  const approvalsPending = getPendingApprovals();
  const contentToPost = getContentToPost();
  const activeAlerts = unpaidAlerts.filter(a => !a.dismissed);

  const filmingTasks = todaysTasks.filter(t => t.serviceType === 'film');
  const editingTasks = todaysTasks.filter(t => t.serviceType === 'edit');

  const stats = [
    { 
      label: 'Filming Today', 
      value: filmingTasks.length, 
      icon: Camera, 
      color: 'text-[hsl(200_70%_50%)]',
      bg: 'bg-[hsl(200_70%_50%/0.1)]'
    },
    { 
      label: 'Edits to Review', 
      value: tasksToReview.length, 
      icon: Scissors, 
      color: 'text-[hsl(280_60%_55%)]',
      bg: 'bg-[hsl(280_60%_55%/0.1)]'
    },
    { 
      label: 'Pending Approvals', 
      value: approvalsPending.length, 
      icon: CheckCircle, 
      color: 'text-primary',
      bg: 'bg-primary/10'
    },
    { 
      label: 'Content to Post', 
      value: contentToPost.length, 
      icon: Send, 
      color: 'text-success',
      bg: 'bg-success/10'
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
              <h1 className="font-display text-2xl font-bold">
                Good {getGreeting()}, Brian
              </h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(), 'h:mm a')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Alerts Section */}
        {activeAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertsPanel />
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="luxury-card p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Today's Focus */}
          <div className="space-y-6">
            <Card className="luxury-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Today's Focus</h2>
              </div>
              
              {todaysTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">All clear for today!</p>
                  <p className="text-sm text-muted-foreground">No urgent tasks scheduled.</p>
                </div>
              ) : (
                <TaskList tasks={todaysTasks} compact />
              )}
            </Card>

            {/* Filming Section */}
            {filmingTasks.length > 0 && (
              <Card className="luxury-card p-5 border-l-4 border-l-[hsl(200_70%_50%)]">
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="h-5 w-5 text-[hsl(200_70%_50%)]" />
                  <h2 className="font-display text-lg font-semibold">Filming Today</h2>
                </div>
                <TaskList tasks={filmingTasks} compact />
              </Card>
            )}
          </div>

          {/* Right Column - Reviews & Posts */}
          <div className="space-y-6">
            {/* Edits to Review */}
            <Card className="luxury-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-[hsl(280_60%_55%)]" />
                  <h2 className="font-display text-lg font-semibold">Edits to Review</h2>
                </div>
                {tasksToReview.length > 0 && (
                  <span className="text-xs bg-[hsl(280_60%_55%/0.15)] text-[hsl(280_60%_50%)] px-2 py-1 rounded-full">
                    {tasksToReview.length} waiting
                  </span>
                )}
              </div>
              <TaskList 
                tasks={tasksToReview} 
                compact 
                emptyMessage="No edits waiting for review"
              />
            </Card>

            {/* Content to Post */}
            <Card className="luxury-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-success" />
                  <h2 className="font-display text-lg font-semibold">Content to Post</h2>
                </div>
              </div>
              <TaskList 
                tasks={contentToPost} 
                compact 
                emptyMessage="All content is posted"
              />
            </Card>

            {/* Quick Stats */}
            <Card className="luxury-card p-5 bg-gradient-to-br from-card to-secondary/50">
              <h3 className="font-display font-semibold mb-4">Quick Overview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Clients</span>
                  <span className="font-medium">{clients.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Campaigns</span>
                  <span className="font-medium">{campaigns.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks This Week</span>
                  <span className="font-medium">{getTodaysTasks().length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
