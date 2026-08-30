import { NextResponse } from "next/server";

import { countAdminNotifications } from "@/src/lib/admin-api/notifications";

const SUCCESS_TTL_MS = 10_000;
const MAX_CACHE_ENTRIES = 256;
type CountResult = Awaited<ReturnType<typeof countAdminNotifications>>;
type SuccessResult = Extract<CountResult, { kind: "ok" }>;

const successCache = new Map<string, { expiresAt: number; result: SuccessResult }>();
const inFlight = new Map<string, Promise<CountResult>>();

function noStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function sessionCacheKey(request: Request, sources: string): Promise<string | null> {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const bytes = new TextEncoder().encode(cookie);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sessionDigest = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${sessionDigest}:${sources}`;
}

function rememberSuccess(key: string, result: SuccessResult) {
  if (successCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = successCache.keys().next().value;
    if (oldest) successCache.delete(oldest);
  }
  successCache.set(key, { expiresAt: Date.now() + SUCCESS_TTL_MS, result });
}

async function sessionScopedCount(
  request: Request,
  searchParams: URLSearchParams,
): Promise<CountResult> {
  const key = await sessionCacheKey(request, searchParams.get("sources") ?? "");
  if (!key) return countAdminNotifications(searchParams);

  const cached = successCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  if (cached) successCache.delete(key);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const requestPromise = countAdminNotifications(searchParams);
  inFlight.set(key, requestPromise);
  try {
    const result = await requestPromise;
    if (result.kind === "ok") rememberSuccess(key, result);
    return result;
  } finally {
    inFlight.delete(key);
  }
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  for (const key of incoming.searchParams.keys()) {
    if (key !== "sources") {
      return noStore({ state: "invalid", message: "پارامتر شمارش اعلان معتبر نیست." }, 400);
    }
  }

  const result = await sessionScopedCount(request, incoming.searchParams);
  if (result.kind === "ok") return noStore(result.data, 200);
  if (result.kind === "unauthenticated") return noStore({ state: "unauthenticated" }, 401);
  if (result.kind === "forbidden") return noStore({ state: "forbidden" }, 403);
  if (result.kind === "invalid") return noStore({ state: "invalid", message: result.message }, 400);
  if (result.kind === "conflict")
    return noStore({ state: "conflict", message: result.message }, 409);
  if (result.kind === "not_found") return noStore({ state: "not_found" }, 404);
  return noStore({ state: "unavailable", correlationId: result.correlationId }, 503);
}
