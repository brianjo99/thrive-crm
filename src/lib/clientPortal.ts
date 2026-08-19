import { z } from "zod";

const pipelineStageSchema = z.enum([
  "discovery",
  "pre-production",
  "filming",
  "editing",
  "review",
  "revisions",
  "posting",
  "reporting",
  "complete",
]);

const portalSnapshotSchema = z.object({
  client: z.object({
    id: z.string().uuid(),
    name: z.string(),
    avatar_url: z.string().nullable(),
    email: z.string().nullable(),
  }).nullable(),
  campaigns: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    current_stage: pipelineStageSchema,
    stages: z.array(pipelineStageSchema),
    due_date: z.string().nullable(),
  })),
  approvals: z.array(z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "revision-requested", "rejected"]),
    feedback: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    tasks: z.object({ title: z.string(), description: z.string().nullable() }).nullable(),
    campaigns: z.object({ name: z.string() }).nullable(),
    assets: z.object({ name: z.string(), file_type: z.string() }).nullable(),
  })),
  deliverables: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.string(),
    type: z.string(),
    due_date: z.string().nullable(),
    campaigns: z.object({ name: z.string() }),
  })),
  calendar: z.array(z.object({
    id: z.string().uuid(),
    platform: z.string(),
    content_type: z.string().nullable(),
    caption: z.string().nullable(),
    scheduled_date: z.string(),
  })),
  invoices: z.array(z.object({
    id: z.string().uuid(),
    invoice_number: z.string(),
    status: z.string().nullable(),
    due_date: z.string().nullable(),
    created_at: z.string().nullable(),
    total: z.number(),
  })),
  alerts: z.array(z.object({
    id: z.string().uuid(),
    message: z.string(),
    created_at: z.string(),
  })),
});

export type PortalSnapshot = z.infer<typeof portalSnapshotSchema>;
export type PortalApproval = PortalSnapshot["approvals"][number];
export type ApprovalDecisionStatus = "approved" | "revision-requested";

export function parsePortalSnapshot(value: unknown): PortalSnapshot {
  return portalSnapshotSchema.parse(value);
}
