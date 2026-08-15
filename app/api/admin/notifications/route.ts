import { NextResponse } from "next/server";

import {
  listAdminNotifications,
  setAdminNotificationReadState,
  type NotificationReadStatePayload,
  type NotificationSource,
} from "@/src/lib/admin-api/notifications";

const LIST_PARAMS = new Set(["page", "pageSize", "sources", "unreadOnly"]);
const SOURCES = new Set<NotificationSource>([
  "support",
  "security",
  "operations",
  "finance",
  "product",
]);
const ALERT_KEY = /^[a-z][a-z0-9._:-]{2,179}$/;

function noStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function mapFailure(
  result: Exclude<Awaited<ReturnType<typeof listAdminNotifications>>, { kind: "ok" }>,
) {
  if (result.kind === "unauthenticated") return noStore({ state: "unauthenticated" }, 401);
  if (result.kind === "forbidden") return noStore({ state: "forbidden" }, 403);
  if (result.kind === "not_found") return noStore({ state: "not_found" }, 404);
  if (result.kind === "invalid") return noStore({ state: "invalid", message: result.message }, 400);
  if (result.kind === "conflict")
    return noStore({ state: "conflict", message: result.message }, 409);
  return noStore({ state: "unavailable", correlationId: result.correlationId }, 503);
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  for (const key of incoming.searchParams.keys()) {
    if (!LIST_PARAMS.has(key)) {
      return noStore({ state: "invalid", message: "پارامتر اعلان معتبر نیست." }, 400);
    }
  }
  const result = await listAdminNotifications(incoming.searchParams);
  return result.kind === "ok" ? noStore(result.data, 200) : mapFailure(result);
}

function parsePayload(value: unknown): NotificationReadStatePayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row).sort();
  if (JSON.stringify(keys) !== JSON.stringify(["alertKey", "read", "source"])) return null;
  if (
    typeof row.alertKey !== "string" ||
    !ALERT_KEY.test(row.alertKey) ||
    typeof row.source !== "string" ||
    !SOURCES.has(row.source as NotificationSource) ||
    typeof row.read !== "boolean"
  ) {
    return null;
  }
  const source = row.source as NotificationSource;
  if (!row.alertKey.startsWith(`${source}:`)) return null;
  return { alertKey: row.alertKey, source, read: row.read };
}

export async function POST(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!/^[A-Za-z0-9._:-]{8,180}$/.test(idempotencyKey)) {
    return noStore({ state: "invalid", message: "Idempotency-Key معتبر لازم است." }, 400);
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return noStore({ state: "invalid", message: "بدنه درخواست معتبر نیست." }, 400);
  }
  const payload = parsePayload(raw);
  if (!payload) {
    return noStore({ state: "invalid", message: "درخواست تغییر وضعیت اعلان معتبر نیست." }, 400);
  }

  const result = await setAdminNotificationReadState(payload, idempotencyKey);
  return result.kind === "ok" ? noStore(result.data, 200) : mapFailure(result);
}
