const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  const memberSecret = Deno.env.get("PROMPT_POUR_MEMBER_SECRET");
  const adminSecret = Deno.env.get("PROMPT_POUR_ADMIN_SECRET");

  if (!memberSecret || !adminSecret) {
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
    return jsonResponse(200, { success: true, role: "admin" });
  }

  if (passphrase === memberSecret) {
    return jsonResponse(200, { success: true, role: "member" });
  }

  return jsonResponse(401, { success: false, error: "That passphrase did not open the door." });
});
