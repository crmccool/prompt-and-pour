const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 4;
const MEMBER_TOKEN_TTL_SECONDS = 60 * 60 * 4;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signAdminToken(payloadJson: string, signingSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadJson));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

  return `${toBase64Url(payloadJson)}.${signatureB64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const memberSecret = Deno.env.get("PROMPT_POUR_MEMBER_SECRET");
  const adminSecret = Deno.env.get("PROMPT_POUR_ADMIN_SECRET");
  const adminTokenSigningSecret = Deno.env.get("PROMPT_POUR_ADMIN_TOKEN_SECRET");

  if (!memberSecret || !adminSecret || !adminTokenSigningSecret) {
    return jsonResponse(500, { error: "Missing server configuration." });
  }

  let payload: { passphrase?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const passphrase = (payload.passphrase || "").trim();
  if (!passphrase) {
    return jsonResponse(400, { error: "Passphrase is required." });
  }

  if (passphrase === adminSecret) {
    const now = Math.floor(Date.now() / 1000);
    const adminToken = await signAdminToken(JSON.stringify({ role: "admin", exp: now + ADMIN_TOKEN_TTL_SECONDS }), adminTokenSigningSecret);
    return jsonResponse(200, { success: true, role: "admin", adminToken, expiresInSeconds: ADMIN_TOKEN_TTL_SECONDS });
  }

  if (passphrase === memberSecret) {
    const now = Math.floor(Date.now() / 1000);
    const memberToken = await signAdminToken(JSON.stringify({ role: "member", exp: now + MEMBER_TOKEN_TTL_SECONDS }), adminTokenSigningSecret);
    return jsonResponse(200, { success: true, role: "member", memberToken, expiresInSeconds: MEMBER_TOKEN_TTL_SECONDS });
  }

  return jsonResponse(401, { success: false, error: "That passphrase did not open the door." });
});
