import { CampaignTemplateGrid } from "@/components/thrive/CampaignTemplateCard";
import { DefaultChecklistPreview } from "@/components/thrive/ChecklistPanel";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileStack, LayoutTemplate, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";
import { ClientType } from "@/types/thrive";

export default function TemplatesPage() {
  const clientTypes: ClientType[] = ['business', 'influencer', 'creator'];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <FileStack className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold">Plantillas</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Plantillas de campañas y checklists por defecto que se generan según el paquete de servicios
          </p>
        </div>
      </header>

      <main className="p-6">
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns" className="gap-2">
              <LayoutTemplate className="h-4 w-4" />
              Plantillas de campaña
            </TabsTrigger>
            <TabsTrigger value="checklists" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Checklists por defecto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="luxury-card p-6">
                <h2 className="font-display text-lg font-semibold mb-2">
                  Plantillas de campañas por servicio
                </h2>
                <p className="text-muted-foreground mb-6">
                  Cada plantilla genera automáticamente las etapas, tareas y entregables correctos
                  según los servicios incluidos. Elige una plantilla al crear una nueva campaña.
                </p>
                <CampaignTemplateGrid />
              </Card>
            </motion.div>

            <Card className="luxury-card p-6 bg-gradient-to-br from-card to-primary/5">
              <h3 className="font-display font-semibold mb-3">Cómo funcionan las plantillas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-primary">1. Elige plantilla</p>
                  <p className="text-muted-foreground">
                    Selecciónala según el paquete de servicios del cliente (Film Only, Film+Edit, etc.)
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-primary">2. Generación automática</p>
                  <p className="text-muted-foreground">
                    Las etapas del pipeline, checklists y categorías de tareas se crean automáticamente
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-primary">3. Empieza a operar</p>
                  <p className="text-muted-foreground">
                    Todo queda configurado correctamente para empezar a avanzar por el pipeline
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="checklists" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="luxury-card p-6">
                <h2 className="font-display text-lg font-semibold mb-2">
                  Checklists por defecto según tipo de cliente
                </h2>
                <p className="text-muted-foreground mb-6">
                  Estos checklists se cargan automáticamente al crear un cliente. Son editables por cliente,
                  pero sirven como base inteligente según el tipo de cuenta.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {clientTypes.map((type, index) => (
                    <motion.div
                      key={type}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <DefaultChecklistPreview clientType={type} />
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <Card className="luxury-card p-6 bg-gradient-to-br from-card to-accent/10">
              <h3 className="font-display font-semibold mb-3">Lógica de los checklists</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-medium">Clientes business</p>
                  <p className="text-muted-foreground">
                    Enfocados en consistencia de marca, CTAs de generación de leads y reporting detallado
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Influencers</p>
                  <p className="text-muted-foreground">
                    Enfatizan pruebas de hooks, alineación con trends y contenido orientado a engagement
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="font-medium">Creators</p>
                  <p className="text-muted-foreground">
                    Priorizan volumen, velocidad, iteración y workflows eficientes por lotes
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
