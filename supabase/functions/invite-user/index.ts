import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Verify the calling user is an owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, authHeader.replace("Bearer ", ""), {
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).single();
    if (roleData?.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only owners can invite users" }), { status: 403, headers: corsHeaders });
    }

    const { email, role, display_name } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "Email required" }), { status: 400, headers: corsHeaders });

    const { data: invited, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name: display_name || email.split("@")[0] },
    });
    if (error) throw error;

    // Set role if provided
    if (role && invited?.user?.id) {
      await adminClient.from("user_roles").upsert(
        { user_id: invited.user.id, role },
        { onConflict: "user_id" }
      );
      await adminClient.from("profiles").upsert(
        { id: invited.user.id, email, display_name: display_name || email.split("@")[0], status: "invited" },
        { onConflict: "id" }
      );
    }

    return new Response(JSON.stringify({ success: true, user: invited?.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
