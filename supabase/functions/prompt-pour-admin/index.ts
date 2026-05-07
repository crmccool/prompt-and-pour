import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-prompt-pour-admin-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AdminAction = "list_pending" | "list_approved" | "approve" | "archive" | "feature" | "unfeature";

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminSecret = Deno.env.get("PROMPT_POUR_ADMIN_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !adminSecret) {
    return jsonResponse(500, { error: "Missing server configuration." });
  }

  let payload: { action?: AdminAction; id?: string; adminSecret?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const providedSecret = req.headers.get("x-prompt-pour-admin-secret") || payload.adminSecret || "";
  if (!providedSecret || providedSecret !== adminSecret) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const action = payload.action;
  if (!action) {
    return jsonResponse(400, { error: "Missing action." });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === "list_pending") {
    const { data, error } = await supabase
      .from("prompt_pour_pours")
      .select("*")
      .eq("approved", false)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { rows: data });
  }

  if (action === "list_approved") {
    const { data, error } = await supabase
      .from("prompt_pour_pours")
      .select("*")
      .eq("approved", true)
      .eq("archived", false)
      .order("created_at", { ascending: false });

    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { rows: data });
  }

  const id = payload.id;
  if (!id) {
    return jsonResponse(400, { error: "Missing id for action." });
  }

  const updatePayload: Record<string, boolean> =
    action === "approve"
      ? { approved: true }
      : action === "archive"
        ? { archived: true }
        : action === "feature"
          ? { featured: true }
          : action === "unfeature"
            ? { featured: false }
            : {};

  if (Object.keys(updatePayload).length === 0) {
    return jsonResponse(400, { error: `Unsupported action: ${action}` });
  }

  const { data, error } = await supabase
    .from("prompt_pour_pours")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return jsonResponse(500, { error: error.message });
  return jsonResponse(200, { row: data });
});
