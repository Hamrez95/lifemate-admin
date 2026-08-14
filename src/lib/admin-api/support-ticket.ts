import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type SupportTicketDetail = {
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
  slaState: "OnTrack" | "DueSoon" | "Breached" | "Completed";
  nextDueAtUtc: string | null;
  lastActivityAtUtc: string;
  createdAtUtc: string;
};

export type SupportTicketEvent = {
  eventId: string;
  eventType: string;
  actorAccountId: string | null;
  actorDisplayName: string | null;
  summary: string | null;
  fromValue: string | null;
  toValue: string | null;
  occurredAtUtc: string;
};

export type SupportAssignee = {
  accountId: string;
  displayName: string | null;
};

export type SupportTicketAction = "add_note" | "set_status" | "set_priority" | "set_assignee";

export type SupportTicketActionPayload =
  | { note: string }
  | { status: string }
  | { priority: string }
  | { assigneeAccountId: string | null };

export type SupportTicketReadResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

export type SupportTicketActionResult =
  | {
      kind: "ok";
      data: {
        ticketId: string;
        status: string;
        priority: string;
        assignedAdminAccountId: string | null;
        lastActivityAtUtc: string;
        action: SupportTicketAction;
        replayed: boolean;
      };
    }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const SLA_STATES = new Set(["OnTrack", "DueSoon", "Breached", "Completed"]);
const ACTION_PATHS: Record<SupportTicketAction, string> = {
  add_note: "note",
  set_status: "status",
  set_priority: "priority",
  set_assignee: "assignee",
};

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseTicket(value: unknown): SupportTicketDetail | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.ticketId !== "string" || !UUID_PATTERN.test(row.ticketId)) return null;
  if (!Number.isInteger(row.ticketNumber)) return null;
  if (typeof row.requesterAccountId !== "string" || !UUID_PATTERN.test(row.requesterAccountId)) {
    return null;
  }
  if (!nullableString(row.requesterDisplayName) || !nullableString(row.productCode)) return null;
  if (typeof row.category !== "string" || typeof row.status !== "string") return null;
  if (typeof row.priority !== "string" || !nullableString(row.summary)) return null;
  if (!nullableString(row.assignedAdminAccountId) || !nullableString(row.assigneeDisplayName)) {
    return null;
  }
  if (row.assignedAdminAccountId && !UUID_PATTERN.test(row.assignedAdminAccountId)) return null;
  if (typeof row.slaState !== "string" || !SLA_STATES.has(row.slaState)) return null;
  if (!nullableString(row.nextDueAtUtc)) return null;
  if (typeof row.lastActivityAtUtc !== "string" || typeof row.createdAtUtc !== "string") {
    return null;
  }
  return row as unknown as SupportTicketDetail;
}

function parseEvents(value: unknown): {
  items: SupportTicketEvent[];
  page: number;
  pageSize: number;
  total: number;
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
} | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (
    !Array.isArray(body.items) ||
    !Number.isInteger(body.page) ||
    !Number.isInteger(body.pageSize)
  ) {
    return null;
  }
  if (!Number.isInteger(body.total) || !body.freshness || typeof body.freshness !== "object") {
    return null;
  }
  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (typeof freshness.asOfUtc !== "string") return null;

  const items: SupportTicketEvent[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.eventId !== "string" || !UUID_PATTERN.test(row.eventId)) return null;
    if (typeof row.eventType !== "string") return null;
    if (!nullableString(row.actorAccountId) || !nullableString(row.actorDisplayName)) return null;
    if (row.actorAccountId && !UUID_PATTERN.test(row.actorAccountId)) return null;
    if (
      !nullableString(row.summary) ||
      !nullableString(row.fromValue) ||
      !nullableString(row.toValue)
    ) {
      return null;
    }
    if (typeof row.occurredAtUtc !== "string") return null;
    items.push(row as unknown as SupportTicketEvent);
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

function parseAssignees(value: unknown): {
  items: SupportAssignee[];
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
} | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items) || !body.freshness || typeof body.freshness !== "object") {
    return null;
  }
  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (typeof freshness.asOfUtc !== "string") return null;
  const items: SupportAssignee[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.accountId !== "string" || !UUID_PATTERN.test(row.accountId)) return null;
    if (!nullableString(row.displayName)) return null;
    items.push({ accountId: row.accountId, displayName: row.displayName });
  }
  return {
    items,
    freshness: { status: freshness.status, asOfUtc: freshness.asOfUtc },
  };
}

async function problem(response: Response): Promise<{
  code?: string;
  message?: string;
  correlationId?: string;
}> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      code: typeof body.code === "string" ? body.code : undefined,
      message:
        typeof body.detail === "string"
          ? body.detail
          : typeof body.message === "string"
            ? body.message
            : undefined,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

async function getJson(path: string): Promise<SupportTicketReadResult<unknown>> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) return { kind: "ok", data: await response.json() };
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  if (response.status === 400) return { kind: "invalid" };
  const issue = await problem(response);
  return { kind: "unavailable", correlationId: issue.correlationId };
}

export async function getSupportTicket(ticketId: string): Promise<
  SupportTicketReadResult<{
    ticket: SupportTicketDetail;
    freshness: { status: "fresh" | "stale"; asOfUtc: string };
  }>
> {
  if (!UUID_PATTERN.test(ticketId)) return { kind: "not_found" };
  const result = await getJson(`/api/v1/support/tickets/${ticketId}`);
  if (result.kind !== "ok") return result;
  const body = result.data as Record<string, unknown>;
  const ticket = parseTicket(body.ticket);
  if (!ticket || !body.freshness || typeof body.freshness !== "object") {
    return { kind: "unavailable" };
  }
  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return { kind: "unavailable" };
  if (typeof freshness.asOfUtc !== "string") return { kind: "unavailable" };
  return {
    kind: "ok",
    data: {
      ticket,
      freshness: { status: freshness.status, asOfUtc: freshness.asOfUtc },
    },
  };
}

export async function getSupportTicketEvents(
  ticketId: string,
  page: number,
  pageSize = 20,
): Promise<SupportTicketReadResult<NonNullable<ReturnType<typeof parseEvents>>>> {
  if (!UUID_PATTERN.test(ticketId)) return { kind: "not_found" };
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const result = await getJson(`/api/v1/support/tickets/${ticketId}/events?${params.toString()}`);
  if (result.kind !== "ok") return result;
  const parsed = parseEvents(result.data);
  return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
}

export async function getSupportAssignees(): Promise<
  SupportTicketReadResult<NonNullable<ReturnType<typeof parseAssignees>>>
> {
  const result = await getJson("/api/v1/support/assignees");
  if (result.kind !== "ok") return result;
  const parsed = parseAssignees(result.data);
  return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
}

export async function performSupportTicketAction(input: {
  ticketId: string;
  action: SupportTicketAction;
  payload: SupportTicketActionPayload;
  idempotencyKey: string;
}): Promise<SupportTicketActionResult> {
  if (!UUID_PATTERN.test(input.ticketId)) return { kind: "not_found" };
  if (!IDEMPOTENCY_PATTERN.test(input.idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/support/tickets/${input.ticketId}/actions/${ACTION_PATHS[input.action]}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify(input.payload),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const body = (await response.json()) as Record<string, unknown>;
    if (
      typeof body.ticketId !== "string" ||
      !UUID_PATTERN.test(body.ticketId) ||
      typeof body.status !== "string" ||
      typeof body.priority !== "string" ||
      !nullableString(body.assignedAdminAccountId) ||
      typeof body.lastActivityAtUtc !== "string" ||
      typeof body.action !== "string" ||
      typeof body.replayed !== "boolean"
    ) {
      return { kind: "unavailable" };
    }
    return {
      kind: "ok",
      data: body as SupportTicketActionResult & never,
    } as SupportTicketActionResult;
  }

  const issue = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message: issue.message };
  if (response.status === 404) return { kind: "not_found", message: issue.message };
  if (response.status === 409)
    return { kind: "conflict", code: issue.code, message: issue.message };
  if (response.status === 400) return { kind: "invalid", code: issue.code, message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}
