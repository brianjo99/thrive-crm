import { CheckCircle, Circle, Clock, AlertTriangle, ArrowRight, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Types — kept minimal to avoid dependency hell
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
  label: string;
  status: StepStatus;
  detail: string;
}

interface WorkflowPipelineProps {
  campaign: Campaign;
  tasks: Task[];
  scripts: Script[];
  shotLists: ShotList[];
  assets: Asset[];
  approvals: Approval[];
  deliverables: Deliverable[];
}

function deriveSteps(props: WorkflowPipelineProps): WorkflowStep[] {
  const { campaign, tasks, scripts, shotLists, assets, approvals, deliverables } = props;
  const stage = campaign.current_stage;

  const approvedScripts = scripts.filter(s => s.status === "approved");
  const reviewScripts   = scripts.filter(s => s.status === "review");
  const editTasks       = tasks.filter(t => t.service_type === "edit");
  const completedEditTasks = editTasks.filter(t => t.status === "complete");
  const internalApprovals = approvals.filter(a => a.reviewer_type === "internal");
  const clientApprovals   = approvals.filter(a => a.reviewer_type === "client");
  const pendingInternal   = internalApprovals.filter(a => a.status === "pending");
  const pendingClient     = clientApprovals.filter(a => a.status === "pending");
  const approvedClient    = clientApprovals.filter(a => a.status === "approved");
  const deliveredDeliverables = deliverables.filter(d => d.status === "delivered" || d.status === "approved");
  const urgentTasks = tasks.filter(t => t.priority === "urgent" && t.status !== "complete");

  const completedShotLists = shotLists.filter(s => s.status === "completed");
  const inProgressShotLists = shotLists.filter(s => s.status === "in-progress");

  const stageOrder = ["discovery","pre-production","filming","editing","review","revisions","posting","reporting","complete"];
  const stageIdx = stageOrder.indexOf(stage);

  function stageReached(s: string) { return stageIdx >= stageOrder.indexOf(s); }

  return [
    {
      id: "created",
      label: "Campaña creada",
      status: "complete",
      detail: "Campaña iniciada",
    },
    {
      id: "script-draft",
      label: "Script redactado",
      status: scripts.length === 0
        ? (stageReached("pre-production") ? "blocked" : "pending")
        : (approvedScripts.length > 0 || reviewScripts.length > 0 ? "complete" : "in-progress"),
      detail: scripts.length === 0
        ? "Sin scripts vinculados"
        : `${scripts.length} script${scripts.length !== 1 ? "s" : ""} — ${approvedScripts.length} aprobado${approvedScripts.length !== 1 ? "s" : ""}`,
    },
    {
      id: "script-approved",
      label: "Script aprobado",
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
          ? "En revisión"
          : "Esperando aprobación",
    },
    {
      id: "shot-list",
      label: "Plan de filmación",
      status: shotLists.length === 0
        ? (stageReached("filming") ? "blocked" : "pending")
        : completedShotLists.length === shotLists.length
          ? "complete"
          : inProgressShotLists.length > 0
            ? "in-progress"
            : "in-progress",
      detail: shotLists.length === 0
        ? "Sin shot lists"
        : `${shotLists.length} shot list${shotLists.length !== 1 ? "s" : ""} — ${completedShotLists.length} completado${completedShotLists.length !== 1 ? "s" : ""}`,
    },
    {
      id: "filming",
      label: "Filmación",
      status: shotLists.length === 0
        ? "pending"
        : completedShotLists.length === shotLists.length
          ? "complete"
          : stageReached("filming")
            ? "in-progress"
            : "pending",
      detail: shotLists.length === 0
        ? "Sin plan de filmación"
        : completedShotLists.length === shotLists.length
          ? "Filmación completada"
          : `${completedShotLists.length}/${shotLists.length} sesiones completadas`,
    },
    {
      id: "assets",
      label: "Assets subidos",
      status: assets.length > 0 ? "complete" : stageReached("editing") ? "blocked" : "pending",
      detail: assets.length === 0
        ? "Sin assets"
        : `${assets.length} archivo${assets.length !== 1 ? "s" : ""} subido${assets.length !== 1 ? "s" : ""}`,
    },
    {
      id: "editing",
      label: "Edición",
      status: editTasks.length === 0
        ? stageReached("editing") ? "in-progress" : "pending"
        : completedEditTasks.length === editTasks.length
          ? "complete"
          : "in-progress",
      detail: editTasks.length === 0
        ? stageReached("editing") ? "Etapa activa — sin tareas de edición" : "Sin tareas de edición"
        : `${completedEditTasks.length}/${editTasks.length} tareas completadas`,
    },
    {
      id: "internal-review",
      label: "Revisión interna",
      status: internalApprovals.length === 0
        ? stageReached("review") ? "in-progress" : "pending"
        : pendingInternal.length === 0
          ? "complete"
          : urgentTasks.length > 0
            ? "blocked"
            : "in-progress",
      detail: internalApprovals.length === 0
        ? "Sin revisiones internas"
        : `${internalApprovals.length - pendingInternal.length}/${internalApprovals.length} aprobadas`,
    },
    {
      id: "client-approval",
      label: "Aprobación cliente",
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
    },
    {
      id: "deliverable",
      label: "Entrega final",
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
      label: "Publicación",
      status: stageReached("posting") ? "complete" : stageReached("revisions") ? "in-progress" : "pending",
      detail: stageReached("posting") ? "Publicado" : stageReached("revisions") ? "Próxima etapa" : "Pendiente",
    },
    {
      id: "reporting",
      label: "Reporte / cierre",
      status: stageReached("complete") ? "complete" : stageReached("reporting") ? "in-progress" : "pending",
      detail: stageReached("complete") ? "Completado" : stageReached("reporting") ? "En progreso" : "Pendiente",
    },
  ];
}

function deriveNextAction(steps: WorkflowStep[]): { label: string; hint: string } | null {
  const blocked = steps.find(s => s.status === "blocked");
  if (blocked) return { label: `Desbloquear: ${blocked.label}`, hint: blocked.detail };

  const inProgress = steps.find(s => s.status === "in-progress");
  if (inProgress) return { label: `En curso: ${inProgress.label}`, hint: inProgress.detail };

  const nextPending = steps.find(s => s.status === "pending");
  if (nextPending) return { label: `Siguiente: ${nextPending.label}`, hint: nextPending.detail };

  return null;
}

const STATUS_ICON: Record<StepStatus, typeof CheckCircle> = {
  complete:    CheckCircle,
  "in-progress": Clock,
  pending:     Circle,
  blocked:     AlertTriangle,
};

const STATUS_COLORS: Record<StepStatus, string> = {
  complete:    "text-success",
  "in-progress": "text-primary",
  pending:     "text-muted-foreground/40",
  blocked:     "text-destructive",
};

const STATUS_BG: Record<StepStatus, string> = {
  complete:    "bg-success/10 border-success/20",
  "in-progress": "bg-primary/10 border-primary/20",
  pending:     "bg-muted/30 border-border",
  blocked:     "bg-destructive/10 border-destructive/20",
};

export function WorkflowPipeline(props: WorkflowPipelineProps) {
  const steps = deriveSteps(props);
  const nextAction = deriveNextAction(steps);

  const completedCount = steps.filter(s => s.status === "complete").length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="space-y-4">
      {/* Next action card */}
      {nextAction && (
        <div className={cn(
          "flex items-start gap-3 p-3 rounded-xl border",
          steps.find(s => s.status === "blocked") ? "bg-destructive/5 border-destructive/20" : "bg-primary/5 border-primary/20"
        )}>
          <Lightbulb className={cn("h-4 w-4 mt-0.5 shrink-0", steps.find(s => s.status === "blocked") ? "text-destructive" : "text-primary")} />
          <div>
            <p className="text-sm font-medium">{nextAction.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{nextAction.hint}</p>
          </div>
        </div>
      )}

      {/* Pipeline steps */}
      <div className="space-y-1">
        {steps.map((step, i) => {
          const Icon = STATUS_ICON[step.status];
          const isLast = i === steps.length - 1;
          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Spine */}
              <div className="flex flex-col items-center">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 border", STATUS_BG[step.status])}>
                  <Icon className={cn("h-3.5 w-3.5", STATUS_COLORS[step.status])} />
                </div>
                {!isLast && <div className={cn("w-px flex-1 my-0.5", step.status === "complete" ? "bg-success/30" : "bg-border")} style={{ minHeight: "12px" }} />}
              </div>
              {/* Content */}
              <div className={cn("flex-1 pb-2", isLast ? "" : "")}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-medium", step.status === "pending" ? "text-muted-foreground" : "text-foreground")}>
                    {step.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{step.detail}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion bar */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>Progreso del flujo</span>
          <span>{completedCount}/{steps.length} pasos</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
