const MAX_BODY_BYTES = 16_384;
const UPSTREAM_TIMEOUT_MS = 12_000;
const ALLOWED_ACTIONS = new Set(["login", "signup", "activate_founder"]);

function noStoreHeaders(contentType = "application/json; charset=utf-8") {
  return {
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Type": contentType,
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  };
}

function json(status: number, payload: Record<string, unknown>) {
  return Response.json(payload, {
    status,
    headers: noStoreHeaders(),
  });
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function upstreamAuthUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_ADMIN_AUTH_URL?.trim();
  const candidate = explicit
    ? explicit
    : `${requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL").replace(/\/$/, "")}/functions/v1/lifemate-admin-auth`;
  const parsed = new URL(candidate);
  const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !local) {
    throw new Error("Workforce auth upstream must use HTTPS outside localhost.");
  }
  return parsed.toString();
}

function firstForwardedValue(value: string | null): string | null {
  const first = value?.split(",", 1)[0]?.trim();
  return first || null;
}

function requestOriginCandidates(request: Request): ReadonlySet<string> {
  const requestUrl = new URL(request.url);
  const origins = new Set<string>([requestUrl.origin]);
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto"));
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? `${forwardedProto}:`
      : requestUrl.protocol;

  const hosts = [
    firstForwardedValue(request.headers.get("x-forwarded-host")),
    request.headers.get("host")?.trim() || null,
    requestUrl.host,
  ];
  for (const host of hosts) {
    if (!host) continue;
    try {
      origins.add(new URL(`${protocol}//${host}`).origin);
    } catch {
      // Ignore malformed forwarding metadata and keep the request fail-closed.
    }
  }
  return origins;
}

function verifiedBrowserOrigin(request: Request): string | null {
  const value = request.headers.get("origin")?.trim();
  if (!value || value === "null") return null;

  const fetchSite = request.headers.get("sec-fetch-site")?.trim().toLowerCase();
  if (fetchSite && fetchSite !== "same-origin") return null;

  let origin: string;
  try {
    origin = new URL(value).origin;
  } catch {
    return null;
  }
  return requestOriginCandidates(request).has(origin) ? origin : null;
}

async function readPayload(request: Request): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null;

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;

  try {
    const payload: unknown = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const browserOrigin = verifiedBrowserOrigin(request);
  if (!browserOrigin) {
    return json(403, { ok: false, code: "origin_denied" });
  }

  const payload = await readPayload(request);
  if (!payload || typeof payload.action !== "string" || !ALLOWED_ACTIONS.has(payload.action)) {
    return json(400, { ok: false, code: "invalid_request" });
  }

  let upstream: string;
  let publishableKey: string;
  try {
    upstream = upstreamAuthUrl();
    publishableKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  } catch {
    return json(503, { ok: false, code: "auth_service_unavailable" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      apikey: publishableKey,
      "Content-Type": "application/json",
      Origin: browserOrigin,
    };
    const forwardedFor = request.headers.get("x-forwarded-for")?.slice(0, 512);
    if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;

    const response = await fetch(upstream, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal,
    });

    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "application/json; charset=utf-8";
    return new Response(body, {
      status: response.status,
      headers: noStoreHeaders(contentType),
    });
  } catch {
    return json(503, { ok: false, code: "auth_service_unavailable" });
  } finally {
    clearTimeout(timeout);
  }
}
