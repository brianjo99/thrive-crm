import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://crm.thrv.media",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export class AccessError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
export function corsHeaders(req: Request) {
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

export function jsonResponse(req: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders(req) });
}

export async function requireInternalUser(req: Request, ownerOnly = false) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new AccessError("Unauthorized", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("Supabase environment is not configured");

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) throw new AccessError("Unauthorized", 401);

  const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const [roleResult, profileResult] = await Promise.all([
    adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
    adminClient.from("profiles").select("status").eq("user_id", user.id).maybeSingle(),
  ]);

  const role = roleResult.data?.role;
  const status = profileResult.data?.status;
  const isInternal = role === "owner" || role === "editor" || role === "videographer";
  if (status !== "active" || !isInternal || (ownerOnly && role !== "owner")) {
    throw new AccessError("Forbidden", 403);
  }

  return { user, role, adminClient };
}
