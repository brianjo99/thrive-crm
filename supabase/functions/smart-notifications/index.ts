import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    // Get all owner users to notify
    const { data: owners } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner");

    const ownerIds = (owners || []).map((r: any) => r.user_id);
    if (ownerIds.length === 0) {
      return new Response(JSON.stringify({ message: "No owners found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notifications: any[] = [];
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
            message: overdueTasks.slice(0, 3).map((t: any) =>
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
      .select("id, title")
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
            message: pendingApprovals.slice(0, 3).map((a: any) => `"${a.title}"`).join(", ") +
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
            message: urgentTasks.slice(0, 3).map((t: any) =>
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

    return new Response(
      JSON.stringify({ created: notifications.length, message: "Smart notifications processed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
