import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type SupportSlaState = "OnTrack" | "DueSoon" | "Breached" | "Completed";

export type SupportTicketQueueItem = {
  ticketId: string;
  ticketNumber: number;
  requesterAccountId: string;
  requesterDisplayName: string | null;
  productCode: string | null;
  category: string;
  status: string;
  priority: string;
  summary: string | null;
  assignedAdminAccountId: string | null;
  assigneeDisplayName: string | null;
  slaState: SupportSlaState;
  nextDueAtUtc: string | null;
  lastActivityAtUtc: string;
  createdAtUtc: string;
};

export type SupportQueueResponse = {
  items: SupportTicketQueueItem[];
  page: number;
  pageSize: number;
  total: number;
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
  };
};

export type SupportQueueResult =
  | { kind: "ok"; data: SupportQueueResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLA_STATES = new Set<SupportSlaState>(["OnTrack", "DueSoon", "Breached", "Completed"]);

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseQueueResponse(value: unknown): SupportQueueResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items)) return null;
  if (!Number.isInteger(body.page) || !Number.isInteger(body.pageSize)) return null;
  if (!Number.isInteger(body.total) || Number(body.total) < 0) return null;
  if (!body.freshness || typeof body.freshness !== "object") return null;

  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (typeof freshness.asOfUtc !== "string") return null;

  const items: SupportTicketQueueItem[] = [];
  for (const rawItem of body.items) {
    if (!rawItem || typeof rawItem !== "object") return null;
    const item = rawItem as Record<string, unknown>;
    if (typeof item.ticketId !== "string" || !UUID_PATTERN.test(item.ticketId)) return null;
    if (!Number.isInteger(item.ticketNumber) || Number(item.ticketNumber) < 1) return null;
    if (
      typeof item.requesterAccountId !== "string" ||
      !UUID_PATTERN.test(item.requesterAccountId)
    ) {
      return null;
    }
    if (!nullableString(item.requesterDisplayName) || !nullableString(item.productCode))
      return null;
    if (typeof item.category !== "string") return null;
    if (typeof item.status !== "string" || typeof item.priority !== "string") return null;
    if (!nullableString(item.summary)) return null;
    if (!nullableString(item.assignedAdminAccountId) || !nullableString(item.assigneeDisplayName)) {
      return null;
    }
    if (item.assignedAdminAccountId && !UUID_PATTERN.test(item.assignedAdminAccountId)) return null;
    if (typeof item.slaState !== "string" || !SLA_STATES.has(item.slaState as SupportSlaState)) {
      return null;
    }
    if (!nullableString(item.nextDueAtUtc)) return null;
    if (typeof item.lastActivityAtUtc !== "string" || typeof item.createdAtUtc !== "string") {
      return null;
    }

    items.push({
      ticketId: item.ticketId,
      ticketNumber: item.ticketNumber as number,
      requesterAccountId: item.requesterAccountId,
      requesterDisplayName: item.requesterDisplayName,
      productCode: item.productCode,
      category: item.category,
      status: item.status,
      priority: item.priority,
      summary: item.summary,
      assignedAdminAccountId: item.assignedAdminAccountId,
      assigneeDisplayName: item.assigneeDisplayName,
      slaState: item.slaState as SupportSlaState,
      nextDueAtUtc: item.nextDueAtUtc,
      lastActivityAtUtc: item.lastActivityAtUtc,
      createdAtUtc: item.createdAtUtc,
    });
  }

  return {
    items,
    page: body.page as number,
    pageSize: body.pageSize as number,
    total: body.total as number,
    freshness: {
      status: freshness.status,
      asOfUtc: freshness.asOfUtc,
    },
  };
}

async function parseCorrelationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getSupportQueue(params: URLSearchParams): Promise<SupportQueueResult> {
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
    response = await fetch(`${config.adminApiUrl}/api/v1/support/tickets?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseQueueResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return {
    kind: "unavailable",
    correlationId: await parseCorrelationId(response),
  };
}
