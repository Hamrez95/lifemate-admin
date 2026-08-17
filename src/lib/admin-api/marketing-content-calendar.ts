import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

import type { MarketingCampaignResult } from "./marketing-campaigns";

export const marketingCalendarTimezones = ["Asia/Tehran", "UTC"] as const;
export type MarketingCalendarTimezone = (typeof marketingCalendarTimezones)[number];

export const marketingCalendarPublishStatuses = [
  "Scheduled",
  "Queued",
  "Processing",
  "Published",
  "Failed",
  "OutcomeUnknown",
  "Cancelled",
] as const;
export type MarketingCalendarPublishStatus = (typeof marketingCalendarPublishStatuses)[number];

export type MarketingCalendarItem = {
  executionId: string;
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  providerCode: string;
  contentRevision: number;
  approvalState: string | null;
  publishStatus: MarketingCalendarPublishStatus;
  scheduledForUtc: string | null;
  scheduleTimezone: string | null;
  requestedAtUtc: string;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  cancelledAtUtc: string | null;
  failureCode: string | null;
  providerPostRef: string | null;
  retryOfExecutionId: string | null;
  providerConnectivity: "NotVerified";
};

export type MarketingApprovalQueueItem = {
  campaignId: string;
  campaignName: string;
  campaignStatus: string;
  providerCode: string | null;
  contentRevision: number;
  approvalState: "Pending" | "Approved" | "Revoked";
  updatedAtUtc: string;
  approvedAtUtc: string | null;
  publishTextPreview: string;
  channel: {
    operatorStatus: "Enabled" | "Disabled";
    setupStatus: "SetupRequired" | "CredentialAvailable" | "Disabled";
    credentialAvailable: boolean;
    providerConnectivity: "NotVerified";
  } | null;
};

export type MarketingContentCalendarReport = {
  query: {
    from: string;
    to: string;
    timezone: MarketingCalendarTimezone;
    status: MarketingCalendarPublishStatus | null;
  };
  items: MarketingCalendarItem[];
  approvalQueue: MarketingApprovalQueueItem[];
  freshness: {
    status: "fresh";
    asOfUtc: string;
    source: string;
  };
};

export type MarketingSchedulePayload = {
  scheduledLocal: string;
  timezone: MarketingCalendarTimezone;
  reason: string;
};

export type MarketingCalendarMutation = {
  campaignId: string;
  executionId: string;
  publishStatus: MarketingCalendarPublishStatus;
  scheduledForUtc?: string;
  scheduleTimezone?: string;
  retryOfExecutionId?: string;
  providerConnectivity?: "NotVerified";
  replayed: boolean;
};

type Problem = { code?: unknown; title?: unknown; correlationId?: unknown };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
const STATUS_SET = new Set<string>(marketingCalendarPublishStatuses);
const TIMEZONE_SET = new Set<string>(marketingCalendarTimezones);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nullableInstant(value: unknown): value is string | null {
  return value === null || instant(value);
}

function nullableText(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function parseCalendarItem(value: unknown): MarketingCalendarItem | null {
  const item = record(value);
  if (!item) return null;
  if (
    typeof item.executionId !== "string" ||
    !UUID_PATTERN.test(item.executionId) ||
    typeof item.campaignId !== "string" ||
    !UUID_PATTERN.test(item.campaignId) ||
    typeof item.campaignName !== "string" ||
    typeof item.campaignStatus !== "string" ||
    typeof item.providerCode !== "string" ||
    !nonNegativeInteger(item.contentRevision) ||
    !nullableText(item.approvalState) ||
    !STATUS_SET.has(String(item.publishStatus)) ||
    !nullableInstant(item.scheduledForUtc) ||
    !nullableText(item.scheduleTimezone) ||
    !instant(item.requestedAtUtc) ||
    !nullableInstant(item.startedAtUtc) ||
    !nullableInstant(item.completedAtUtc) ||
    !nullableInstant(item.cancelledAtUtc) ||
    !nullableText(item.failureCode) ||
    !nullableText(item.providerPostRef) ||
    !nullableText(item.retryOfExecutionId) ||
    item.providerConnectivity !== "NotVerified"
  ) {
    return null;
  }
  if (item.retryOfExecutionId && !UUID_PATTERN.test(item.retryOfExecutionId)) return null;
  return item as MarketingCalendarItem;
}

function parseApproval(value: unknown): MarketingApprovalQueueItem | null {
  const item = record(value);
  const channel = item?.channel === null ? null : record(item?.channel);
  if (!item) return null;
  if (
    typeof item.campaignId !== "string" ||
    !UUID_PATTERN.test(item.campaignId) ||
    typeof item.campaignName !== "string" ||
    typeof item.campaignStatus !== "string" ||
    !nullableText(item.providerCode) ||
    !nonNegativeInteger(item.contentRevision) ||
    !["Pending", "Approved", "Revoked"].includes(String(item.approvalState)) ||
    !instant(item.updatedAtUtc) ||
    !nullableInstant(item.approvedAtUtc) ||
    typeof item.publishTextPreview !== "string"
  ) {
    return null;
  }
  if (channel) {
    if (
      !["Enabled", "Disabled"].includes(String(channel.operatorStatus)) ||
      !["SetupRequired", "CredentialAvailable", "Disabled"].includes(String(channel.setupStatus)) ||
      typeof channel.credentialAvailable !== "boolean" ||
      channel.providerConnectivity !== "NotVerified"
    ) {
      return null;
    }
  } else if (item.channel !== null) {
    return null;
  }
  return item as MarketingApprovalQueueItem;
}

function parseReport(value: unknown): MarketingContentCalendarReport | null {
  const body = record(value);
  const query = record(body?.query);
  const freshness = record(body?.freshness);
  if (
    !body ||
    !query ||
    !freshness ||
    !Array.isArray(body.items) ||
    !Array.isArray(body.approvalQueue)
  ) {
    return null;
  }
  const items = body.items.map(parseCalendarItem);
  const approvalQueue = body.approvalQueue.map(parseApproval);
  if (
    typeof query.from !== "string" ||
    !DATE_PATTERN.test(query.from) ||
    typeof query.to !== "string" ||
    !DATE_PATTERN.test(query.to) ||
    !TIMEZONE_SET.has(String(query.timezone)) ||
    (query.status !== null && !STATUS_SET.has(String(query.status))) ||
    items.some((item) => !item) ||
    approvalQueue.some((item) => !item) ||
    freshness.status !== "fresh" ||
    !instant(freshness.asOfUtc) ||
    typeof freshness.source !== "string"
  ) {
    return null;
  }
  return {
    query: {
      from: query.from,
      to: query.to,
      timezone: query.timezone as MarketingCalendarTimezone,
      status: query.status as MarketingCalendarPublishStatus | null,
    },
    items: items as MarketingCalendarItem[],
    approvalQueue: approvalQueue as MarketingApprovalQueueItem[],
    freshness: {
      status: "fresh",
      asOfUtc: freshness.asOfUtc,
      source: freshness.source,
    },
  };
}

function parseMutation(value: unknown): MarketingCalendarMutation | null {
  const body = record(value);
  if (!body) return null;
  if (
    typeof body.campaignId !== "string" ||
    !UUID_PATTERN.test(body.campaignId) ||
    typeof body.executionId !== "string" ||
    !UUID_PATTERN.test(body.executionId) ||
    !STATUS_SET.has(String(body.publishStatus)) ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }
  if (body.scheduledForUtc !== undefined && !instant(body.scheduledForUtc)) return null;
  if (body.scheduleTimezone !== undefined && typeof body.scheduleTimezone !== "string") return null;
  if (
    body.retryOfExecutionId !== undefined &&
    (typeof body.retryOfExecutionId !== "string" || !UUID_PATTERN.test(body.retryOfExecutionId))
  ) {
    return null;
  }
  if (body.providerConnectivity !== undefined && body.providerConnectivity !== "NotVerified") {
    return null;
  }
  return body as MarketingCalendarMutation;
}

async function bearer(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request(
  path: string,
  init?: RequestInit,
): Promise<{ response: Response; body: unknown } | null> {
  const token = await bearer();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  try {
    const response = await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { response, body };
  } catch {
    return { response: new Response(null, { status: 503 }), body: null };
  }
}

function failed<T>(response: Response, body: Problem): MarketingCampaignResult<T> {
  const message = typeof body.title === "string" ? body.title : undefined;
  const code = typeof body.code === "string" ? body.code : undefined;
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message };
  if (response.status === 404) return { kind: "not_found", message };
  if (response.status === 409) return { kind: "conflict", code, message };
  if (response.status === 400) return { kind: "invalid", code, message };
  return {
    kind: "unavailable",
    correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
  };
}

function validIdempotency(value: string): boolean {
  return IDEMPOTENCY_PATTERN.test(value);
}

export async function getMarketingContentCalendar(
  params: URLSearchParams,
): Promise<MarketingCampaignResult<MarketingContentCalendarReport>> {
  const result = await request(`/api/v1/marketing/content-calendar?${params.toString()}`);
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok) {
    const parsed = parseReport(result.body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return failed(result.response, record(result.body) ?? {});
}

export async function scheduleMarketingCampaignPublish(
  campaignId: string,
  payload: MarketingSchedulePayload,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<MarketingCalendarMutation>> {
  if (
    !UUID_PATTERN.test(campaignId) ||
    !validIdempotency(idempotencyKey) ||
    !LOCAL_PATTERN.test(payload.scheduledLocal) ||
    !TIMEZONE_SET.has(payload.timezone) ||
    payload.reason.length < 10 ||
    payload.reason.length > 1000
  ) {
    return { kind: "invalid" };
  }
  const result = await request(
    `/api/v1/marketing/campaigns/${campaignId}/actions/schedule-publish`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    },
  );
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok) {
    const parsed = parseMutation(result.body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return failed(result.response, record(result.body) ?? {});
}

async function executionAction(
  action: "cancel" | "retry",
  executionId: string,
  reason: string,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<MarketingCalendarMutation>> {
  if (
    !UUID_PATTERN.test(executionId) ||
    !validIdempotency(idempotencyKey) ||
    reason.length < 10 ||
    reason.length > 1000
  ) {
    return { kind: "invalid" };
  }
  const result = await request(
    `/api/v1/marketing/publish-executions/${executionId}/actions/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ reason }),
    },
  );
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok) {
    const parsed = parseMutation(result.body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return failed(result.response, record(result.body) ?? {});
}

export function cancelMarketingScheduledPublish(
  executionId: string,
  reason: string,
  idempotencyKey: string,
) {
  return executionAction("cancel", executionId, reason, idempotencyKey);
}

export function retryMarketingFailedPublish(
  executionId: string,
  reason: string,
  idempotencyKey: string,
) {
  return executionAction("retry", executionId, reason, idempotencyKey);
}
