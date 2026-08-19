import { AccessError, corsHeaders, jsonResponse, requireInternalUser } from "../_shared/security.ts";

type NotificationInsert = {
  user_id: string;
  type: "approval" | "task" | "campaign" | "asset" | "message";
  title: string;
  message: string;
  read: boolean;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return jsonResponse(req, { error: "Method not allowed" }, 405);

  try {
    const { adminClient: supabase } = await requireInternalUser(req, true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Get all owner users to notify
    const { data: owners } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner");

    const ownerIds = (owners || []).map(r => r.user_id);
    if (ownerIds.length === 0) {
      return jsonResponse(req, { message: "No owners found" });
    }

    const notifications: NotificationInsert[] = [];
    const todayIso = today.toISOString();
    const threeDaysIso = threeDaysFromNow.toISOString();

    // 1. Overdue tasks
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, campaign_id, campaigns(name)")
      .lt("due_date", todayIso)
      .neq("status", "complete")
      .not("due_date", "is", null);

    if (overdueTasks && overdueTasks.length > 0) {
      for (const userId of ownerIds) {
        // Check if we already sent this notification today
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "task")
          .like("title", "Tareas vencidas%")
          .gte("created_at", todayIso)
          .limit(1);

        if (!existing || existing.length === 0) {
          notifications.push({
            user_id: userId,
            type: "task",
            title: `Tareas vencidas: ${overdueTasks.length}`,
            message: overdueTasks.slice(0, 3).map(t =>
              `"${t.title}"${t.campaigns?.name ? ` — ${t.campaigns.name}` : ""}`
            ).join(", ") + (overdueTasks.length > 3 ? ` y ${overdueTasks.length - 3} más` : ""),
            read: false,
          });
        }
      }
    }

    // 2. Pending approvals (pending for > 1 day)
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const { data: pendingApprovals } = await supabase
      .from("approvals")
      .select("id, tasks(title)")
      .eq("status", "pending")
      .lt("created_at", yesterday.toISOString());

    if (pendingApprovals && pendingApprovals.length > 0) {
      for (const userId of ownerIds) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "approval")
          .like("title", "Aprobaciones pendientes%")
          .gte("created_at", todayIso)
          .limit(1);

        if (!existing || existing.length === 0) {
          notifications.push({
            user_id: userId,
            type: "approval",
            title: `Aprobaciones pendientes: ${pendingApprovals.length}`,
            message: pendingApprovals.slice(0, 3).map(a => `"${a.tasks?.title ?? "Aprobación"}"`).join(", ") +
              (pendingApprovals.length > 3 ? ` y ${pendingApprovals.length - 3} más` : ""),
            read: false,
          });
        }
      }
    }

    // 3. Campaigns with upcoming deadline (next 3 days)
    const { data: upcomingCampaigns } = await supabase
      .from("campaigns")
      .select("id, name, due_date")
      .gte("due_date", todayIso)
      .lte("due_date", threeDaysIso)
      .neq("current_stage", "complete")
      .not("due_date", "is", null);

    if (upcomingCampaigns && upcomingCampaigns.length > 0) {
      for (const userId of ownerIds) {
        for (const campaign of upcomingCampaigns) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "campaign")
            .like("title", `%${campaign.name}%`)
            .gte("created_at", todayIso)
            .limit(1);

          if (!existing || existing.length === 0) {
            const dueDate = new Date(campaign.due_date);
            const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            notifications.push({
              user_id: userId,
              type: "campaign",
              title: `Campaña próxima a vencer: ${campaign.name}`,
              message: daysLeft === 0
                ? "Vence hoy"
                : daysLeft === 1
                ? "Vence mañana"
                : `Vence en ${daysLeft} días`,
              read: false,
            });
          }
        }
      }
    }

    // 4. Urgent tasks not started
    const { data: urgentTasks } = await supabase
      .from("tasks")
      .select("id, title, campaign_id, campaigns(name)")
      .eq("priority", "urgent")
      .eq("status", "pending");

    if (urgentTasks && urgentTasks.length > 0) {
      for (const userId of ownerIds) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "task")
          .like("title", "Tareas urgentes sin iniciar%")
          .gte("created_at", todayIso)
          .limit(1);

        if (!existing || existing.length === 0) {
          notifications.push({
            user_id: userId,
            type: "task",
            title: `Tareas urgentes sin iniciar: ${urgentTasks.length}`,
            message: urgentTasks.slice(0, 3).map(t =>
              `"${t.title}"${t.campaigns?.name ? ` — ${t.campaigns.name}` : ""}`
            ).join(", ") + (urgentTasks.length > 3 ? ` y ${urgentTasks.length - 3} más` : ""),
            read: false,
          });
        }
      }
    }

    // Insert all new notifications
    if (notifications.length > 0) {
      const { error } = await supabase.from("notifications").insert(notifications);
      if (error) throw error;
    }

    return jsonResponse(req, { created: notifications.length, message: "Smart notifications processed" });
  } catch (error: unknown) {
    const status = error instanceof AccessError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonResponse(req, { error: message }, status);
  }
});
