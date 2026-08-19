import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 54322;
const origin = `http://${host}:${port}`;
const appOrigin = "http://127.0.0.1:3100";
const canonicalAuthOrigin = "http://127.0.0.1:54321";

const corsHeaders = {
  "access-control-allow-origin": appOrigin,
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,apikey",
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

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

async function canonicalAal1Session() {
  const response = await fetch(`${canonicalAuthOrigin}/auth/v1/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "+989121234567", token: "123456", type: "sms" }),
  });
  if (!response.ok) throw new Error("QA canonical Auth session unavailable");
  return await response.json();
}

export async function startQaWorkforceAuth() {
  const server = createServer(async (request, response) => {
    if (request.method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      return response.end();
    }
    if (request.method !== "POST" || request.url !== "/") {
      return json(response, 404, { ok: false, code: "not_found" });
    }

    const body = await readBody(request);
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

    if (body?.action === "signup") {
      if (
        body?.username !== "new.staff" ||
        body?.displayName !== "کارمند آزمایشی" ||
        body?.password !== "qa-password"
      ) {
        return json(response, 400, { ok: false, code: "invalid_registration" });
      }
      return json(response, 201, { ok: true, status: "pending_role_assignment" });
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
