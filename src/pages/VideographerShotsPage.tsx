import { Card } from "@/components/ui/card";
import { FileStack, Camera } from "lucide-react";
import { motion } from "framer-motion";

export default function VideographerShotsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(200_70%_50%/0.15)] flex items-center justify-center">
              <FileStack className="h-5 w-5 text-[hsl(200_70%_50%)]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Shot Lists</h1>
              <p className="text-sm text-muted-foreground">Pre-production planning</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="luxury-card p-12 text-center">
            <FileStack className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Shot List Templates</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create and manage shot lists for upcoming shoots. Templates will auto-populate based on campaign type.
            </p>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
