import { createServer } from "node:http";
import { createPublicKey, generateKeyPairSync, sign } from "node:crypto";

const host = "127.0.0.1";
const port = 54321;
const origin = `http://${host}:${port}`;
const appOrigin = "http://127.0.0.1:3100";
const authIssuer = `${origin}/auth/v1`;
const userId = "11111111-1111-4111-8111-111111111111";
const factorId = "22222222-2222-4222-8222-222222222222";
const challengeId = "33333333-3333-4333-8333-333333333333";
const kid = "lifemate-qa-rs256";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

const publicJwk = {
  ...createPublicKey(publicKey).export({ format: "jwk" }),
  kid,
  alg: "RS256",
  use: "sig",
};

function base64Url(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString(
    "base64url",
  );
}

function jwt(aal) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid };
  const payload = {
    iss: authIssuer,
    sub: userId,
    aud: "authenticated",
    exp: now + 3600,
    iat: now,
    role: "authenticated",
    aal,
    session_id: "44444444-4444-4444-8444-444444444444",
    phone: "+989121234567",
    amr:
      aal === "aal2"
        ? [
            { method: "otp", timestamp: now - 5 },
            { method: "totp", timestamp: now },
          ]
        : [{ method: "otp", timestamp: now }],
    app_metadata: { provider: "phone", providers: ["phone"] },
    user_metadata: {},
  };
  const unsigned = `${base64Url(header)}.${base64Url(payload)}`;
  const signature = sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url");
  return `${unsigned}.${signature}`;
}

function factor() {
  const now = new Date().toISOString();
  return {
    id: factorId,
    friendly_name: "LifeMate Command Center",
    factor_type: "totp",
    status: "verified",
    created_at: now,
    updated_at: now,
  };
}

function user() {
  const now = new Date().toISOString();
  return {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    phone: "+989121234567",
    created_at: now,
    updated_at: now,
    confirmed_at: now,
    phone_confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: "phone", providers: ["phone"] },
    user_metadata: {},
    identities: [],
    factors: [factor()],
  };
}

function session(aal) {
  return {
    access_token: jwt(aal),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: aal === "aal2" ? "qa-refresh-aal2" : "qa-refresh-aal1",
    user: user(),
  };
}

const corsHeaders = {
  "access-control-allow-origin": appOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type,x-client-info,x-supabase-api-version",
  vary: "Origin",
};

function json(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders,
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function parseJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

export function startQaMockServices() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", origin);
    const method = request.method ?? "GET";

    if (method === "OPTIONS") {
      response.writeHead(204, corsHeaders);
      return response.end();
    }

    if (method === "GET" && url.pathname === "/auth/v1/.well-known/jwks.json") {
      return json(response, 200, { keys: [publicJwk] });
    }

    if (method === "POST" && url.pathname === "/auth/v1/otp") {
      const body = await readBody(request);
      if (body?.phone !== "+989121234567" || body?.create_user !== false) {
        return json(response, 400, {
          code: "qa_otp_contract_mismatch",
          message: "QA OTP request did not preserve existing-account-only semantics.",
        });
      }
      return json(response, 200, { message_id: "qa-message" });
    }

    if (method === "POST" && url.pathname === "/auth/v1/verify") {
      const body = await readBody(request);
      if (
        body?.phone !== "+989121234567" ||
        body?.token !== "123456" ||
        body?.type !== "sms"
      ) {
        return json(response, 400, { code: "otp_expired", message: "Invalid QA OTP." });
      }
      return json(response, 200, session("aal1"));
    }

    if (method === "GET" && url.pathname === "/auth/v1/user") {
      const authorization = request.headers.authorization ?? "";
      if (!authorization.startsWith("Bearer ")) {
        return json(response, 401, { message: "Missing bearer token." });
      }
      return json(response, 200, user());
    }

    if (
      method === "POST" &&
      url.pathname === `/auth/v1/factors/${factorId}/challenge`
    ) {
      return json(response, 200, {
        id: challengeId,
        type: "totp",
        expires_at: Math.floor(Date.now() / 1000) + 300,
      });
    }

    if (
      method === "POST" &&
      url.pathname === `/auth/v1/factors/${factorId}/verify`
    ) {
      const body = await readBody(request);
      if (body?.challenge_id !== challengeId || body?.code !== "654321") {
        return json(response, 400, {
          code: "mfa_verification_failed",
          message: "Invalid QA TOTP.",
        });
      }
      return json(response, 200, session("aal2"));
    }

    if (method === "POST" && url.pathname === "/auth/v1/token") {
      const body = await readBody(request);
      const aal = body?.refresh_token === "qa-refresh-aal2" ? "aal2" : "aal1";
      return json(response, 200, session(aal));
    }

    if (method === "GET" && url.pathname === "/api/v1/me") {
      const authorization = request.headers.authorization ?? "";
      const payload = authorization.startsWith("Bearer ")
        ? parseJwtPayload(authorization.slice("Bearer ".length))
        : null;
      if (!payload?.sub) {
        return json(response, 401, {
          status: 401,
          code: "unauthenticated",
          title: "Authentication required.",
        });
      }
      if (payload.aal !== "aal2") {
        return json(response, 403, {
          status: 403,
          code: "mfa_required",
          title: "AAL2 is required.",
        });
      }
      return json(response, 200, {
        admin: {
          accountId: userId,
          roles: ["technical"],
          permissions: [
            "users.read.basic",
            "analytics.read",
            "operations.read",
            "ai.business.read",
            "settings.read",
          ],
        },
      });
    }

    return json(response, 404, {
      status: 404,
      code: "qa_mock_route_missing",
      title: `${method} ${url.pathname} is not implemented by QA mock services.`,
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve({ server, origin }));
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { origin: listeningOrigin } = await startQaMockServices();
  console.log(`LifeMate QA mock services listening on ${listeningOrigin}`);
}
