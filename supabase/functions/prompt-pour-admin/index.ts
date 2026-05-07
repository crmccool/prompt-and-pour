import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-prompt-pour-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AdminAction = "list_pending" | "list_approved" | "list_archived" | "approve" | "archive" | "restore" | "feature" | "unfeature";

type AdminTokenPayload = {
  role: string;
  exp: number;
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

async function verifyAdminToken(token: string, signingSecret: string): Promise<AdminTokenPayload | null> {
  const [payloadB64, signatureB64] = token.split(".");
  if (!payloadB64 || !signatureB64) return null;

  let payloadJson = "";
  try {
    payloadJson = decodeBase64Url(payloadB64);
  } catch {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  let signature: Uint8Array;
  try {
    signature = Uint8Array.from(decodeBase64Url(signatureB64), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }

  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(payloadJson),
  );

  if (!isValid) return null;

  let payload: AdminTokenPayload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.role !== "admin" || typeof payload.exp !== "number" || payload.exp <= now) {
    return null;
  }

  return payload;
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
  const adminTokenSigningSecret = Deno.env.get("PROMPT_POUR_ADMIN_TOKEN_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !adminTokenSigningSecret) {
    return jsonResponse(500, { error: "Missing server configuration." });
  }

  let payload: { action?: AdminAction; id?: string; adminToken?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const providedToken = req.headers.get("x-prompt-pour-admin-token") || payload.adminToken || "";
  const tokenPayload = providedToken ? await verifyAdminToken(providedToken, adminTokenSigningSecret) : null;
  if (!tokenPayload) {
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

  if (action === "list_archived") {
    const { data, error } = await supabase
      .from("prompt_pour_pours")
      .select("*")
      .eq("archived", true)
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
        : action === "restore"
          ? { archived: false }
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
