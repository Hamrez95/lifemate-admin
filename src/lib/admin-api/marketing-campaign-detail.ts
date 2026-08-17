import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

import type { MarketingCampaign, MarketingCampaignResult } from "./marketing-campaigns";

export type CampaignApprovalState = "Pending" | "Approved" | "Revoked";
export type CampaignPublishStatus =
  "Scheduled" | "Queued" | "Processing" | "Published" | "Failed" | "OutcomeUnknown" | "Cancelled";

export type MarketingCampaignContent = {
  brief: string | null;
  audienceSummary: string | null;
  publishText: string | null;
  assetRefs: string[];
  contentRevision: number;
  approvalState: CampaignApprovalState;
  approvedRevision: number | null;
  approvedByAdminAccountId: string | null;
  approvedAtUtc: string | null;
  updatedAtUtc: string | null;
};

export type MarketingCampaignFunnel = {
  availability: "Available" | "Unavailable";
  source: string;
  asOfUtc: string | null;
  metrics: {
    impressions: number | null;
    clicks: number | null;
    landingViews: number | null;
    conversions: number | null;
  };
};

export type MarketingCampaignChannel = {
  providerCode: string;
  displayName: string;
  operatorStatus: "Enabled" | "Disabled";
  setupStatus: "SetupRequired" | "CredentialAvailable" | "Disabled";
  credentialAvailable: boolean;
  providerConnectivity: "NotVerified";
  updatedAtUtc: string;
};

export type MarketingCampaignPublishExecution = {
  id: string;
  providerCode: string;
  contentRevision: number;
  status: CampaignPublishStatus;
  requestedByAdminAccountId: string;
  requestedAtUtc: string;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  providerPostRef: string | null;
  failureCode: string | null;
};

export type MarketingCampaignDetail = {
  campaign: MarketingCampaign;
  content: MarketingCampaignContent;
  funnel: MarketingCampaignFunnel;
  channel: MarketingCampaignChannel | null;
  publishHistory: MarketingCampaignPublishExecution[];
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
    source: string;
  };
};

export type MarketingCampaignContentPayload = {
  brief: string | null;
  audienceSummary: string | null;
  publishText: string | null;
  assetRefs: string[];
  reason: string;
};

type Problem = {
  code?: unknown;
  title?: unknown;
  correlationId?: unknown;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const PUBLISH_STATUSES = new Set<CampaignPublishStatus>([
  "Scheduled",
  "Queued",
  "Processing",
  "Published",
  "Failed",
  "OutcomeUnknown",
  "Cancelled",
]);
const APPROVAL_STATES = new Set<CampaignApprovalState>(["Pending", "Approved", "Revoked"]);

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

function parseCampaign(value: unknown): MarketingCampaign | null {
  const item = record(value);
  if (!item) return null;
  const validStatus = ["Draft", "Ready", "Active", "Paused", "Completed", "Cancelled"].includes(
    String(item.status),
  );
  if (
    typeof item.id !== "string" ||
    !UUID_PATTERN.test(item.id) ||
    typeof item.name !== "string" ||
    !nullableText(item.objective) ||
    !nullableText(item.productCode) ||
    !nullableText(item.channelCode) ||
    !validStatus ||
    !nullableInstant(item.startsAtUtc) ||
    !nullableInstant(item.endsAtUtc) ||
    !nullableText(item.ownerAdminAccountId) ||
    !instant(item.createdAtUtc) ||
    !instant(item.updatedAtUtc)
  ) {
    return null;
  }
  if (item.productCode && !CODE_PATTERN.test(item.productCode)) return null;
  if (item.channelCode && !CODE_PATTERN.test(item.channelCode)) return null;
  if (item.ownerAdminAccountId && !UUID_PATTERN.test(item.ownerAdminAccountId)) return null;
  return item as MarketingCampaign;
}

function parseContent(value: unknown): MarketingCampaignContent | null {
  const item = record(value);
  if (!item || !Array.isArray(item.assetRefs)) return null;
  if (
    !nullableText(item.brief) ||
    !nullableText(item.audienceSummary) ||
    !nullableText(item.publishText) ||
    item.assetRefs.some((asset) => typeof asset !== "string") ||
    !nonNegativeInteger(item.contentRevision) ||
    !APPROVAL_STATES.has(item.approvalState as CampaignApprovalState) ||
    (item.approvedRevision !== null && !nonNegativeInteger(item.approvedRevision)) ||
    !nullableText(item.approvedByAdminAccountId) ||
    !nullableInstant(item.approvedAtUtc) ||
    !nullableInstant(item.updatedAtUtc)
  ) {
    return null;
  }
  if (item.approvedByAdminAccountId && !UUID_PATTERN.test(item.approvedByAdminAccountId)) {
    return null;
  }
  return item as MarketingCampaignContent;
}

function nullableMetric(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function parseFunnel(value: unknown): MarketingCampaignFunnel | null {
  const item = record(value);
  const metrics = record(item?.metrics);
  if (!item || !metrics) return null;
  if (
    (item.availability !== "Available" && item.availability !== "Unavailable") ||
    typeof item.source !== "string" ||
    !nullableInstant(item.asOfUtc) ||
    !nullableMetric(metrics.impressions) ||
    !nullableMetric(metrics.clicks) ||
    !nullableMetric(metrics.landingViews) ||
    !nullableMetric(metrics.conversions)
  ) {
    return null;
  }
  return {
    availability: item.availability,
    source: item.source,
    asOfUtc: item.asOfUtc,
    metrics: {
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      landingViews: metrics.landingViews,
      conversions: metrics.conversions,
    },
  };
}

function parseChannel(value: unknown): MarketingCampaignChannel | null {
  if (value === null) return null;
  const item = record(value);
  if (!item) return null;
  if (
    typeof item.providerCode !== "string" ||
    !CODE_PATTERN.test(item.providerCode) ||
    typeof item.displayName !== "string" ||
    (item.operatorStatus !== "Enabled" && item.operatorStatus !== "Disabled") ||
    !["SetupRequired", "CredentialAvailable", "Disabled"].includes(String(item.setupStatus)) ||
    typeof item.credentialAvailable !== "boolean" ||
    item.providerConnectivity !== "NotVerified" ||
    !instant(item.updatedAtUtc)
  ) {
    return null;
  }
  return item as MarketingCampaignChannel;
}

function parseExecution(value: unknown): MarketingCampaignPublishExecution | null {
  const item = record(value);
  if (!item) return null;
  if (
    typeof item.id !== "string" ||
    !UUID_PATTERN.test(item.id) ||
    typeof item.providerCode !== "string" ||
    !CODE_PATTERN.test(item.providerCode) ||
    !nonNegativeInteger(item.contentRevision) ||
    !PUBLISH_STATUSES.has(item.status as CampaignPublishStatus) ||
    typeof item.requestedByAdminAccountId !== "string" ||
    !UUID_PATTERN.test(item.requestedByAdminAccountId) ||
    !instant(item.requestedAtUtc) ||
    !nullableInstant(item.startedAtUtc) ||
    !nullableInstant(item.completedAtUtc) ||
    !nullableText(item.providerPostRef) ||
    !nullableText(item.failureCode)
  ) {
    return null;
  }
  return item as MarketingCampaignPublishExecution;
}

function parseDetail(value: unknown): MarketingCampaignDetail | null {
  const body = record(value);
  if (!body || !Array.isArray(body.publishHistory)) return null;
  const campaign = parseCampaign(body.campaign);
  const content = parseContent(body.content);
  const funnel = parseFunnel(body.funnel);
  const channel = parseChannel(body.channel);
  const history = body.publishHistory.map(parseExecution);
  const freshness = record(body.freshness);
  if (
    !campaign ||
    !content ||
    !funnel ||
    (body.channel !== null && !channel) ||
    history.some((item) => !item) ||
    !freshness ||
    (freshness.status !== "fresh" && freshness.status !== "stale") ||
    !instant(freshness.asOfUtc) ||
    typeof freshness.source !== "string"
  ) {
    return null;
  }
  return {
    campaign,
    content,
    funnel,
    channel,
    publishHistory: history as MarketingCampaignPublishExecution[],
    freshness: {
      status: freshness.status,
      asOfUtc: freshness.asOfUtc,
      source: freshness.source,
    },
  };
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
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
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

function validMutationTarget(campaignId: string, idempotencyKey: string): boolean {
  return UUID_PATTERN.test(campaignId) && IDEMPOTENCY_PATTERN.test(idempotencyKey);
}

export async function getMarketingCampaignDetail(
  campaignId: string,
): Promise<MarketingCampaignResult<MarketingCampaignDetail>> {
  if (!UUID_PATTERN.test(campaignId)) return { kind: "invalid" };
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}`);
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok) {
    const parsed = parseDetail(result.body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return failed(result.response, record(result.body) ?? {});
}

export async function updateMarketingCampaignContent(
  campaignId: string,
  payload: MarketingCampaignContentPayload,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<Record<string, unknown>>> {
  if (!validMutationTarget(campaignId, idempotencyKey)) return { kind: "invalid" };
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}/content`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok && record(result.body)) {
    return { kind: "ok", data: result.body as Record<string, unknown> };
  }
  return failed(result.response, record(result.body) ?? {});
}

export async function setMarketingCampaignApproval(
  campaignId: string,
  approved: boolean,
  reason: string,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<Record<string, unknown>>> {
  if (!validMutationTarget(campaignId, idempotencyKey)) return { kind: "invalid" };
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}/actions/approval`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ approved, reason }),
  });
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok && record(result.body)) {
    return { kind: "ok", data: result.body as Record<string, unknown> };
  }
  return failed(result.response, record(result.body) ?? {});
}

export async function requestMarketingCampaignPublish(
  campaignId: string,
  reason: string,
  idempotencyKey: string,
): Promise<MarketingCampaignResult<Record<string, unknown>>> {
  if (!validMutationTarget(campaignId, idempotencyKey)) return { kind: "invalid" };
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}/actions/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ reason }),
  });
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok && record(result.body)) {
    return { kind: "ok", data: result.body as Record<string, unknown> };
  }
  return failed(result.response, record(result.body) ?? {});
}
