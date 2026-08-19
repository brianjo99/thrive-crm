import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://crm.thrv.media",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const isVercelPreview = /^https:\/\/[-a-z0-9]+\.vercel\.app$/i.test(origin);
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) || isVercelPreview ? origin : "https://crm.thrv.media",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
}

type InvitePayload = {
  email?: unknown;
  role?: unknown;
  display_name?: unknown;
};

const allowedRoles = new Set(["owner", "editor", "videographer"]);

Deno.serve(async (req) => {
  const headers = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  try {
    // Verify the calling user is an owner
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });

    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const [roleResult, profileResult] = await Promise.all([
      adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      adminClient.from("profiles").select("status").eq("user_id", user.id).maybeSingle(),
    ]);
    if (roleResult.data?.role !== "owner" || profileResult.data?.status !== "active") {
      return new Response(JSON.stringify({ error: "Only owners can invite users" }), { status: 403, headers });
    }

    const payload = await req.json() as InvitePayload;
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const role = typeof payload.role === "string" ? payload.role : "";
    const displayName = typeof payload.display_name === "string" ? payload.display_name.trim() : "";
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Valid email required" }), { status: 400, headers });
    }
    if (!allowedRoles.has(role)) {
      return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers });
    }

    const { data: invited, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name: displayName || email.split("@")[0], invited: true },
    });
    if (error) throw error;

    if (invited.user?.id) {
      const { error: roleError } = await adminClient.from("user_roles").upsert(
        { user_id: invited.user.id, role },
        { onConflict: "user_id" }
      );
      const { error: profileError } = await adminClient.from("profiles").update({
        email,
        display_name: displayName || email.split("@")[0],
        status: "invited",
      }).eq("user_id", invited.user.id);

      if (roleError || profileError) {
        await adminClient.auth.admin.deleteUser(invited.user.id);
        throw roleError ?? profileError;
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
      headers,
    });
  }
});
