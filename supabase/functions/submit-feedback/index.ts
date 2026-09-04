/**
 * Public feedback gateway.
 *
 * Raw IP addresses are never persisted. A secret, project-specific salt turns
 * the gateway-provided client address into a short-lived pseudonymous hash.
 */
const allowedOrigins = new Set([
  "https://berndmarnau.de",
  "https://www.berndmarnau.de",
]);

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "https://berndmarnau.de",
    "Access-Control-Allow-Headers": "apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function json(origin: string | null, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin),
  });
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return allowedOrigins.has(origin || "")
      ? new Response(null, { status: 204, headers: corsHeaders(origin) })
      : json(origin, 403, { error: "origin_not_allowed" });
  }
  if (request.method !== "POST") return json(origin, 405, { error: "method_not_allowed" });
  if (!allowedOrigins.has(origin || "")) return json(origin, 403, { error: "origin_not_allowed" });

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 7000) return json(origin, 413, { error: "request_too_large" });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json(origin, 400, { error: "invalid_json" });
  }

  // A bot filling the hidden field receives an ordinary success response.
  if (typeof payload.website === "string" && payload.website.trim()) {
    return json(origin, 202, { ok: true });
  }

  const category = typeof payload.category === "string" ? payload.category : "";
  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const storyVersion = typeof payload.story_version === "string" ? payload.story_version : "";
  if (message.length < 10 || message.length > 5000) {
    return json(origin, 400, { error: "invalid_message" });
  }

  const forwarded = request.headers.get("x-forwarded-for") || "";
  const clientAddress = forwarded.split(",")[0].trim();
  const salt = Deno.env.get("FEEDBACK_HASH_SALT") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!clientAddress || salt.length < 32 || !supabaseUrl || !serviceRoleKey) {
    console.error("Feedback gateway configuration is incomplete");
    return json(origin, 503, { error: "temporarily_unavailable" });
  }

  const clientHash = await sha256(`${salt}:${clientAddress}`);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/submit_reader_feedback`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_client_hash: clientHash,
      p_category: category,
      p_message: message,
      p_story_version: storyVersion,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 400 && /rate limit|too quickly/i.test(detail)) {
      return json(origin, 429, { error: "rate_limited" });
    }
    console.error("Feedback database request failed", response.status, detail);
    return json(origin, 500, { error: "storage_failed" });
  }

  return json(origin, 201, { ok: true });
});
