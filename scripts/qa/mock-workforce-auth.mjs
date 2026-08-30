import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 54322;
const origin = `http://${host}:${port}`;
const appOrigin = "http://127.0.0.1:3100";
const canonicalOrigin = "http://127.0.0.1:54321";

const corsHeaders = {
  "access-control-allow-origin": appOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers":
    "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
  vary: "Origin",
};

function json(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders,
  });
  response.end(JSON.stringify(body));
}

async function rawBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function parseBody(buffer) {
  if (buffer.length === 0) return null;
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    return null;
  }
}

async function canonicalAal1Session() {
  const response = await fetch(`${canonicalOrigin}/auth/v1/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+989121234567", token: "123456", type: "sms" }),
  });
  if (!response.ok) throw new Error("QA canonical Auth session unavailable");
  return await response.json();
}

async function proxyCanonicalAuth(request, response, body) {
  const target = new URL(request.url ?? "/", canonicalOrigin);
  target.host = new URL(canonicalOrigin).host;
  target.protocol = "http:";

  const headers = new Headers();
  for (const name of ["authorization", "apikey", "content-type", "x-client-info"]) {
    const value = request.headers[name];
    if (typeof value === "string") headers.set(name, value);
  }

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : body,
  });
  const payload = Buffer.from(await upstream.arrayBuffer());
  response.writeHead(upstream.status, {
    "content-type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders,
  });
  response.end(payload);
}

export async function startQaWorkforceAuth() {
  const server = createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      return response.end();
    }

    const bodyBuffer = await rawBody(request);
    const url = new URL(request.url ?? "/", origin);

    if (url.pathname.startsWith("/auth/v1/")) {
      return await proxyCanonicalAuth(request, response, bodyBuffer);
    }

    if (request.method !== "POST" || url.pathname !== "/functions/v1/lifemate-admin-auth") {
      return json(response, 404, { ok: false, code: "not_found" });
    }

    const body = parseBody(bodyBuffer);
    if (body?.action === "login") {
      if (body?.username !== "staff.test" || body?.password !== "qa-password") {
        return json(response, 401, { ok: false, code: "invalid_credentials" });
      }
      const session = await canonicalAal1Session();
      return json(response, 200, {
        ok: true,
        access_state: "mfa_required",
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
        },
      });
    }

    if (body?.action === "activate_founder") {
      return json(response, 401, { ok: false, code: "invalid_activation" });
    }

    return json(response, 400, { ok: false, code: "invalid_action" });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  return { server, origin };
}
