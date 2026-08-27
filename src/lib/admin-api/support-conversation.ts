import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type SupportConversationMessage = {
  messageId: string;
  ticketId: string;
  senderKind: "User" | "Staff";
  senderAccountId: string;
  senderDisplayName: string | null;
  body: string;
  createdAtUtc: string;
};

export type SupportConversationEscalation = {
  escalationId: string;
  status: string;
  safeReason: string;
  targetRoleCode: string;
  targetRoleName: string;
  createdAtUtc: string;
};

export type SupportConversationLink = {
  linkId: string;
  linkKind: "ProductIssue" | "EngineeringIssue" | "Incident" | "Other";
  referenceCode: string;
  createdAtUtc: string;
};

type ReadResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

export type ConversationMutationResult =
  | { kind: "ok"; replayed: boolean }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const LINK_KINDS = new Set(["ProductIssue", "EngineeringIssue", "Incident", "Other"]);

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function problem(
  response: Response,
): Promise<{ code?: string; message?: string; correlationId?: string }> {
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

async function requestJson(path: string, init?: RequestInit): Promise<ReadResult<unknown>> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
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

function nullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseMessages(
  value: unknown,
): { items: SupportConversationMessage[]; freshness: string } | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items) || !body.freshness || typeof body.freshness !== "object")
    return null;
  const freshness = body.freshness as Record<string, unknown>;
  if (typeof freshness.asOfUtc !== "string") return null;
  const items: SupportConversationMessage[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object") return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.messageId !== "string" || !UUID_PATTERN.test(row.messageId)) return null;
    if (typeof row.ticketId !== "string" || !UUID_PATTERN.test(row.ticketId)) return null;
    if (row.senderKind !== "User" && row.senderKind !== "Staff") return null;
    if (typeof row.senderAccountId !== "string" || !UUID_PATTERN.test(row.senderAccountId))
      return null;
    if (
      !nullableString(row.senderDisplayName) ||
      typeof row.body !== "string" ||
      typeof row.createdAtUtc !== "string"
    )
      return null;
    items.push(row as unknown as SupportConversationMessage);
  }
  return { items, freshness: freshness.asOfUtc };
}

export async function getSupportConversation(
  ticketId: string,
): Promise<ReadResult<{ items: SupportConversationMessage[]; freshness: string }>> {
  if (!UUID_PATTERN.test(ticketId)) return { kind: "not_found" };
  const result = await requestJson(`/api/v1/support/tickets/${ticketId}/conversation?limit=100`);
  if (result.kind !== "ok") return result;
  const parsed = parseMessages(result.data);
  return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
}

export async function getSupportConversationOperations(
  ticketId: string,
): Promise<
  ReadResult<{
    escalations: SupportConversationEscalation[];
    links: SupportConversationLink[];
    freshness: string;
  }>
> {
  if (!UUID_PATTERN.test(ticketId)) return { kind: "not_found" };
  const result = await requestJson(`/api/v1/support/tickets/${ticketId}/conversation/operations`);
  if (result.kind !== "ok") return result;
  const body = result.data as Record<string, unknown>;
  if (
    !Array.isArray(body.escalations) ||
    !Array.isArray(body.links) ||
    !body.freshness ||
    typeof body.freshness !== "object"
  )
    return { kind: "unavailable" };
  const freshness = body.freshness as Record<string, unknown>;
  if (typeof freshness.asOfUtc !== "string") return { kind: "unavailable" };
  const escalations: SupportConversationEscalation[] = [];
  for (const raw of body.escalations) {
    if (!raw || typeof raw !== "object") return { kind: "unavailable" };
    const row = raw as Record<string, unknown>;
    if (
      typeof row.escalationId !== "string" ||
      !UUID_PATTERN.test(row.escalationId) ||
      typeof row.status !== "string" ||
      typeof row.safeReason !== "string" ||
      typeof row.targetRoleCode !== "string" ||
      typeof row.targetRoleName !== "string" ||
      typeof row.createdAtUtc !== "string"
    )
      return { kind: "unavailable" };
    escalations.push(row as unknown as SupportConversationEscalation);
  }
  const links: SupportConversationLink[] = [];
  for (const raw of body.links) {
    if (!raw || typeof raw !== "object") return { kind: "unavailable" };
    const row = raw as Record<string, unknown>;
    if (
      typeof row.linkId !== "string" ||
      !UUID_PATTERN.test(row.linkId) ||
      typeof row.linkKind !== "string" ||
      !LINK_KINDS.has(row.linkKind) ||
      typeof row.referenceCode !== "string" ||
      typeof row.createdAtUtc !== "string"
    )
      return { kind: "unavailable" };
    links.push(row as unknown as SupportConversationLink);
  }
  return { kind: "ok", data: { escalations, links, freshness: freshness.asOfUtc } };
}

async function mutate(
  ticketId: string,
  suffix: string,
  payload: Record<string, unknown>,
  idempotencyKey: string,
): Promise<ConversationMutationResult> {
  if (!UUID_PATTERN.test(ticketId)) return { kind: "not_found" };
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey))
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/support/tickets/${ticketId}/conversation/${suffix}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const body = (await response.json()) as Record<string, unknown>;
    return { kind: "ok", replayed: body.replayed === true };
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

export function sendSupportConversationMessage(input: {
  ticketId: string;
  body: string;
  clientMessageId: string;
  idempotencyKey: string;
}) {
  return mutate(
    input.ticketId,
    "messages",
    { body: input.body, clientMessageId: input.clientMessageId },
    input.idempotencyKey,
  );
}

export function escalateSupportConversation(input: {
  ticketId: string;
  targetRoleCode: string;
  safeReason: string;
  idempotencyKey: string;
}) {
  return mutate(
    input.ticketId,
    "escalations",
    { targetRoleCode: input.targetRoleCode, safeReason: input.safeReason },
    input.idempotencyKey,
  );
}

export function linkSupportConversationReference(input: {
  ticketId: string;
  linkKind: SupportConversationLink["linkKind"];
  referenceCode: string;
  idempotencyKey: string;
}) {
  return mutate(
    input.ticketId,
    "links",
    { linkKind: input.linkKind, referenceCode: input.referenceCode },
    input.idempotencyKey,
  );
}
