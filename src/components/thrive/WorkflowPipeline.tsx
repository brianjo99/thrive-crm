import { CheckCircle, Circle, Clock, AlertTriangle, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types — minimal to avoid dependency hell
interface Script { status: string }
interface ShotList { status: string | null }
interface Asset { id: string }
interface Approval { status: string; reviewer_type?: string | null }
interface Task { status: string; service_type?: string | null; priority?: string }
interface Deliverable { status: string }
interface Campaign { current_stage: string }

type StepStatus = "complete" | "in-progress" | "pending" | "blocked";

interface WorkflowStep {
  id: string;
  label: string;        // completed form: "Script aprobado"
  actionLabel: string;  // imperative: "Aprobar el script"
  status: StepStatus;
  detail: string;
  ctaPath?: string;
  ctaText?: string;
}

interface WorkflowPipelineProps {
  campaign: Campaign;
  tasks: Task[];
  scripts: Script[];
  shotLists: ShotList[];
  assets: Asset[];
  approvals: Approval[];
  deliverables: Deliverable[];
  onNavigate?: (path: string) => void;
}

function deriveSteps(props: WorkflowPipelineProps): WorkflowStep[] {
  const { campaign, tasks, scripts, shotLists, assets, approvals, deliverables } = props;
  const stage = campaign.current_stage;

  const approvedScripts       = scripts.filter(s => s.status === "approved");
  const reviewScripts         = scripts.filter(s => s.status === "review");
  const editTasks             = tasks.filter(t => t.service_type === "edit");
  const completedEditTasks    = editTasks.filter(t => t.status === "complete");
  const internalApprovals     = approvals.filter(a => a.reviewer_type === "internal");
  const clientApprovals       = approvals.filter(a => a.reviewer_type === "client");
  const pendingInternal       = internalApprovals.filter(a => a.status === "pending");
  const pendingClient         = clientApprovals.filter(a => a.status === "pending");
  const approvedClient        = clientApprovals.filter(a => a.status === "approved");
  const deliveredDeliverables = deliverables.filter(d => d.status === "delivered" || d.status === "approved");
  const urgentTasks           = tasks.filter(t => t.priority === "urgent" && t.status !== "complete");
  const completedShotLists    = shotLists.filter(s => s.status === "completed");
  const inProgressShotLists   = shotLists.filter(s => s.status === "in-progress");

  const stageOrder = ["discovery","pre-production","filming","editing","review","revisions","posting","reporting","complete"];
  const stageIdx   = stageOrder.indexOf(stage);
  const stageReached = (s: string) => stageIdx >= stageOrder.indexOf(s);

  return [
    {
      id: "created",
      label: "Campaña creada",
      actionLabel: "Campaña creada",
      status: "complete",
      detail: "Campaña activa",
    },
    {
      id: "script-draft",
      label: "Script listo",
      actionLabel: "Crear el script",
      status: scripts.length === 0
        ? (stageReached("pre-production") ? "blocked" : "pending")
        : (approvedScripts.length > 0 || reviewScripts.length > 0 ? "complete" : "in-progress"),
      detail: scripts.length === 0
        ? "Ningún script vinculado"
        : reviewScripts.length > 0 && approvedScripts.length === 0
          ? `${reviewScripts.length} en revisión`
          : `${scripts.length} script${scripts.length !== 1 ? "s" : ""}`,
      ctaPath: "/scripts",
      ctaText: "Ir a Scripts",
    },
    {
      id: "script-approved",
      label: "Script aprobado",
      actionLabel: "Aprobar el script",
      status: approvedScripts.length > 0
        ? "complete"
        : reviewScripts.length > 0
          ? "in-progress"
          : scripts.length > 0
            ? "in-progress"
            : "pending",
      detail: approvedScripts.length > 0
        ? `${approvedScripts.length} aprobado${approvedScripts.length !== 1 ? "s" : ""}`
        : reviewScripts.length > 0
          ? "Esperando aprobación"
          : "Sin scripts para aprobar",
      ctaPath: "/scripts",
      ctaText: "Ver Scripts",
    },
    {
      id: "shot-list",
      label: "Plan de filmación listo",
      actionLabel: "Crear el plan de filmación",
      status: shotLists.length === 0
        ? (stageReached("filming") ? "blocked" : "pending")
        : completedShotLists.length === shotLists.length
          ? "complete"
          : "in-progress",
      detail: shotLists.length === 0
        ? "Sin shot list"
        : `${shotLists.length} shot list${shotLists.length !== 1 ? "s" : ""} — ${completedShotLists.length} listo${completedShotLists.length !== 1 ? "s" : ""}`,
      ctaPath: "/shot-lists",
      ctaText: "Ir a Shot Lists",
    },
    {
      id: "filming",
      label: "Filmación completada",
      actionLabel: "Completar la filmación",
      status: shotLists.length === 0
        ? "pending"
        : completedShotLists.length === shotLists.length
          ? "complete"
          : stageReached("filming")
            ? "in-progress"
            : "pending",
      detail: shotLists.length === 0
        ? "Requiere shot list primero"
        : completedShotLists.length === shotLists.length
          ? "Todas las sesiones completadas"
          : `${completedShotLists.length}/${shotLists.length} sesiones completadas`,
    },
    {
      id: "assets",
      label: "Material de rodaje subido",
      actionLabel: "Subir el material filmado",
      status: assets.length > 0 ? "complete" : stageReached("editing") ? "blocked" : "pending",
      detail: assets.length === 0
        ? "Sin archivos subidos"
        : `${assets.length} archivo${assets.length !== 1 ? "s" : ""}`,
      ctaPath: "/assets",
      ctaText: "Ir a Assets",
    },
    {
      id: "editing",
      label: "Edición completada",
      actionLabel: "Completar las tareas de edición",
      status: editTasks.length === 0
        ? stageReached("editing") ? "in-progress" : "pending"
        : completedEditTasks.length === editTasks.length
          ? "complete"
          : "in-progress",
      detail: editTasks.length === 0
        ? stageReached("editing") ? "En edición — sin tareas asignadas" : "Sin tareas de edición"
        : `${completedEditTasks.length}/${editTasks.length} tareas completadas`,
    },
    {
      id: "internal-review",
      label: "Revisión interna completada",
      actionLabel: "Completar la revisión interna",
      status: internalApprovals.length === 0
        ? stageReached("review") ? "in-progress" : "pending"
        : pendingInternal.length === 0
          ? "complete"
          : urgentTasks.length > 0
            ? "blocked"
            : "in-progress",
      detail: internalApprovals.length === 0
        ? "Sin revisiones internas"
        : `${internalApprovals.length - pendingInternal.length}/${internalApprovals.length} completadas`,
      ctaPath: "/approvals",
      ctaText: "Ver Aprobaciones",
    },
    {
      id: "client-approval",
      label: "Aprobación del cliente",
      actionLabel: "Obtener aprobación del cliente",
      status: clientApprovals.length === 0
        ? "pending"
        : approvedClient.length === clientApprovals.length
          ? "complete"
          : pendingClient.length > 0
            ? "in-progress"
            : "complete",
      detail: clientApprovals.length === 0
        ? "Sin aprobaciones de cliente"
        : `${approvedClient.length}/${clientApprovals.length} aprobadas`,
      ctaPath: "/approvals",
      ctaText: "Ver Aprobaciones",
    },
    {
      id: "deliverable",
      label: "Entrega final lista",
      actionLabel: "Preparar la entrega final",
      status: deliverables.length === 0
        ? "pending"
        : deliveredDeliverables.length > 0
          ? "complete"
          : "in-progress",
      detail: deliverables.length === 0
        ? "Sin entregas definidas"
        : `${deliveredDeliverables.length}/${deliverables.length} entregadas`,
    },
    {
      id: "publishing",
      label: "Publicado",
      actionLabel: "Publicar el contenido",
      status: stageReached("posting") ? "complete" : stageReached("revisions") ? "in-progress" : "pending",
      detail: stageReached("posting") ? "Contenido publicado" : stageReached("revisions") ? "Lista para publicar" : "Pendiente",
    },
    {
      id: "reporting",
      label: "Campaña cerrada",
      actionLabel: "Cerrar y reportar resultados",
      status: stageReached("complete") ? "complete" : stageReached("reporting") ? "in-progress" : "pending",
      detail: stageReached("complete") ? "Campaña completada" : stageReached("reporting") ? "Generando reporte" : "Pendiente",
    },
  ];
}

const STATUS_ICON: Record<StepStatus, typeof CheckCircle> = {
  complete:      CheckCircle,
  "in-progress": Clock,
  pending:       Circle,
  blocked:       AlertTriangle,
};

const STATUS_COLORS: Record<StepStatus, string> = {
  complete:      "text-success",
  "in-progress": "text-primary",
  pending:       "text-muted-foreground/30",
  blocked:       "text-destructive",
};

const STATUS_BG: Record<StepStatus, string> = {
  complete:      "bg-success/10 border-success/20",
  "in-progress": "bg-primary/10 border-primary/20",
  pending:       "bg-muted/20 border-border/50",
  blocked:       "bg-destructive/10 border-destructive/20",
};

export function WorkflowPipeline(props: WorkflowPipelineProps) {
  const { onNavigate } = props;
  const steps     = deriveSteps(props);
  const focusStep = steps.find(s => s.status === "blocked")
    ?? steps.find(s => s.status === "in-progress")
    ?? steps.find(s => s.status === "pending")
    ?? null;

  const completedCount = steps.filter(s => s.status === "complete").length;
  const isBlocked      = !!steps.find(s => s.status === "blocked");
  const allDone        = completedCount === steps.length;

  return (
    <div className="space-y-4">
      {/* Next action card */}
      {focusStep && !allDone && (
        <div className={cn(
          "rounded-xl border p-3 space-y-2",
          isBlocked ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"
        )}>
          <div className="flex items-start gap-2">
            <Lightbulb className={cn("h-4 w-4 mt-0.5 shrink-0", isBlocked ? "text-destructive" : "text-primary")} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", isBlocked ? "text-destructive" : "text-foreground")}>
                {isBlocked ? "Bloqueado: " : "Siguiente paso: "}
                {focusStep.actionLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{focusStep.detail}</p>
            </div>
          </div>
          {focusStep.ctaPath && onNavigate && (
            <Button
              size="sm"
              variant={isBlocked ? "destructive" : "outline"}
              className="w-full gap-1.5 h-7 text-xs"
              onClick={() => onNavigate(focusStep.ctaPath!)}
            >
              {focusStep.ctaText} <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {allDone && (
        <div className="rounded-xl border bg-success/5 border-success/20 p-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success shrink-0" />
          <p className="text-sm font-medium text-success">¡Flujo de producción completado!</p>
        </div>
      )}

      {/* Pipeline steps */}
      <div className="space-y-0">
        {steps.map((step, i) => {
          const Icon   = STATUS_ICON[step.status];
          const isLast = i === steps.length - 1;
          const isFocus = focusStep?.id === step.id;
          return (
            <div key={step.id} className="flex items-start gap-2.5">
              {/* Spine */}
              <div className="flex flex-col items-center shrink-0">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border",
                  STATUS_BG[step.status],
                  isFocus && "ring-2 ring-offset-1 ring-primary/30"
                )}>
                  <Icon className={cn("h-3 w-3", STATUS_COLORS[step.status])} />
                </div>
                {!isLast && (
                  <div
                    className={cn("w-px my-0.5", step.status === "complete" ? "bg-success/30" : "bg-border/60")}
                    style={{ minHeight: "10px" }}
                  />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 pb-1.5 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn(
                    "text-xs font-medium leading-5",
                    step.status === "pending" ? "text-muted-foreground/50" :
                    step.status === "complete" ? "text-muted-foreground" :
                    isFocus ? "text-foreground" :
                    "text-foreground/80"
                  )}>
                    {step.label}
                  </span>
                  {step.status !== "pending" && (
                    <span className="text-xs text-muted-foreground/60 shrink-0 text-right">{step.detail}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion bar */}
      <div className="pt-1.5 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Progreso</span>
          <span>{completedCount}/{steps.length}</span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-success rounded-full transition-all" style={{ width: `${Math.round((completedCount / steps.length) * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
