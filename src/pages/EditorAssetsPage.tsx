import { Card } from "@/components/ui/card";
import { FolderOpen, Scissors } from "lucide-react";
import { motion } from "framer-motion";

export default function EditorAssetsPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(280_60%_55%/0.15)] flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-[hsl(280_60%_55%)]" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Assets</h1>
              <p className="text-sm text-muted-foreground">Footage and project files</p>
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
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Asset Management</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect your cloud storage to access footage, project files, and brand assets directly from Thrive OS.
            </p>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
