import { getPublicRuntimeConfig } from "../runtime-config";
import { createServerSupabaseClient } from "../supabase/server";
import { parseAuditLogResponse, type AuditLogResponse } from "./audit-log-contract";

export type { AuditLogEvent, AuditLogResponse } from "./audit-log-contract";

export type AuditLogQuery = {
  limit?: number;
  from?: string | null;
  to?: string | null;
  cursor?: string | null;
  timeoutMs?: number;
};

export type AuditLogResult =
  | { kind: "ok"; data: AuditLogResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

function normalizedDate(value: string | null | undefined, boundary: "start" | "end") {
  const normalized = value?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  return `${normalized}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}Z`;
}

export async function getAuditLog(query: AuditLogQuery = {}): Promise<AuditLogResult> {
  const boundedLimit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 50)));
  const customTimeoutMs = query.timeoutMs
    ? Math.min(10_000, Math.max(500, Math.trunc(query.timeoutMs)))
    : null;
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return { kind: "unauthenticated" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    const url = new URL(`${config.adminApiUrl}/api/v1/audit`);
    url.searchParams.set("limit", String(boundedLimit));
    const from = normalizedDate(query.from, "start");
    const to = normalizedDate(query.to, "end");
    if (from) url.searchParams.set("from", from);
    if (to) url.searchParams.set("to", to);
    if (query.cursor?.trim()) url.searchParams.set("cursor", query.cursor.trim());
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: customTimeoutMs ? AbortSignal.timeout(customTimeoutMs) : AbortSignal.timeout(3_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseAuditLogResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
