import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type CampaignExecutionStatus =
  | "Prepared"
  | "Confirmed"
  | "Scheduled"
  | "Processing"
  | "Completed"
  | "Cancelled"
  | "Failed";

export type CampaignExecution = {
  id: string;
  campaignId: string;
  audienceSnapshotId: string;
  campaignUpdatedAtUtc: string | null;
  status: CampaignExecutionStatus;
  audienceCount: number;
  eligibleSmsCount: number;
  eligiblePushCount: number;
  optedOutSmsCount: number;
  optedOutPushCount: number;
  estimatedSmsCostMinor: string | null;
  estimatedSmsCostCurrency: string | null;
  smsProvider: string | null;
  requiresSecondConfirmation: boolean;
  confirmed: boolean;
  confirmedAtUtc: string | null;
  scheduledAtUtc: string | null;
  version: number;
  createdAtUtc: string | null;
  updatedAtUtc: string | null;
};

export type CampaignExecutionList = {
  items: CampaignExecution[];
  total: number;
  privacy: { recipientIdentifiersExposed: false; messageBodiesExposed: false };
  freshness: { status: "fresh"; asOfUtc: string };
};

export type CampaignExecutionResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

type Problem = { code?: unknown; title?: unknown; message?: unknown; correlationId?: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set<CampaignExecutionStatus>([
  "Prepared",
  "Confirmed",
  "Scheduled",
  "Processing",
  "Completed",
  "Cancelled",
  "Failed",
]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
}

function nonNegative(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function parseExecution(value: unknown): CampaignExecution | null {
  const row = record(value);
  if (!row) return null;
  if (
    typeof row.id !== "string" ||
    !UUID.test(row.id) ||
    typeof row.campaignId !== "string" ||
    !UUID.test(row.campaignId) ||
    typeof row.audienceSnapshotId !== "string" ||
    !UUID.test(row.audienceSnapshotId) ||
    !instant(row.campaignUpdatedAtUtc) ||
    typeof row.status !== "string" ||
    !statuses.has(row.status as CampaignExecutionStatus) ||
    !nonNegative(row.audienceCount) ||
    !nonNegative(row.eligibleSmsCount) ||
    !nonNegative(row.eligiblePushCount) ||
    !nonNegative(row.optedOutSmsCount) ||
    !nonNegative(row.optedOutPushCount) ||
    (row.estimatedSmsCostMinor !== null && typeof row.estimatedSmsCostMinor !== "string") ||
    (row.estimatedSmsCostCurrency !== null && typeof row.estimatedSmsCostCurrency !== "string") ||
    (row.smsProvider !== null && typeof row.smsProvider !== "string") ||
    typeof row.requiresSecondConfirmation !== "boolean" ||
    typeof row.confirmed !== "boolean" ||
    !instant(row.confirmedAtUtc) ||
    !instant(row.scheduledAtUtc) ||
    !Number.isSafeInteger(row.version) ||
    Number(row.version) < 1 ||
    !instant(row.createdAtUtc) ||
    !instant(row.updatedAtUtc)
  ) {
    return null;
  }
  return row as CampaignExecution;
}

async function bearer(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claims, error } = await supabase.auth.getClaims();
  if (error || !claims?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function failed<T>(response: Response, value: unknown): CampaignExecutionResult<T> {
  const body = (record(value) ?? {}) as Problem;
  const message =
    typeof body.title === "string"
      ? body.title
      : typeof body.message === "string"
        ? body.message
        : undefined;
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
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return { response, body: await response.json().catch(() => null) };
  } catch {
    return { response: new Response(null, { status: 503 }), body: null };
  }
}

export async function getCampaignExecutions(
  campaignId: string,
): Promise<CampaignExecutionResult<CampaignExecutionList>> {
  if (!UUID.test(campaignId)) return { kind: "invalid", code: "campaign_id_invalid" };
  const result = await request(`/api/v1/marketing/campaigns/${campaignId}/executions`);
  if (!result) return { kind: "unauthenticated" };
  if (!result.response.ok) return failed(result.response, result.body);
  const body = record(result.body);
  if (!body || !Array.isArray(body.items) || !nonNegative(body.total)) return { kind: "unavailable" };
  const items = body.items.map(parseExecution);
  const privacy = record(body.privacy);
  const freshness = record(body.freshness);
  if (
    items.some((item) => !item) ||
    !privacy ||
    privacy.recipientIdentifiersExposed !== false ||
    privacy.messageBodiesExposed !== false ||
    !freshness ||
    freshness.status !== "fresh" ||
    typeof freshness.asOfUtc !== "string" ||
    Number.isNaN(Date.parse(freshness.asOfUtc))
  ) {
    return { kind: "unavailable" };
  }
  return {
    kind: "ok",
    data: {
      items: items as CampaignExecution[],
      total: Number(body.total),
      privacy: { recipientIdentifiersExposed: false, messageBodiesExposed: false },
      freshness: { status: "fresh", asOfUtc: freshness.asOfUtc },
    },
  };
}

async function mutate(
  path: string,
  payload: Record<string, unknown>,
): Promise<CampaignExecutionResult<Record<string, unknown>>> {
  const result = await request(path, { method: "POST", body: JSON.stringify(payload) });
  if (!result) return { kind: "unauthenticated" };
  if (!result.response.ok) return failed(result.response, result.body);
  const body = record(result.body);
  return body ? { kind: "ok", data: body } : { kind: "unavailable" };
}

export async function prepareCampaignExecution(payload: {
  campaignId: string;
  audienceSnapshotId: string;
  campaignUpdatedAtUtc: string;
  channels: Array<"SMS" | "Push">;
  smsProvider: string | null;
  smsCurrency: string | null;
}) {
  return mutate("/api/v1/marketing/campaign-executions/prepare", payload);
}

export async function confirmCampaignExecution(executionId: string, expectedVersion: number) {
  return mutate(`/api/v1/marketing/campaign-executions/${executionId}/confirm`, { expectedVersion });
}

export async function scheduleCampaignExecution(
  executionId: string,
  expectedVersion: number,
  scheduledAtUtc: string,
) {
  return mutate(`/api/v1/marketing/campaign-executions/${executionId}/schedule`, {
    expectedVersion,
    scheduledAtUtc,
  });
}

export async function cancelCampaignExecution(
  executionId: string,
  expectedVersion: number,
  reason: string,
) {
  return mutate(`/api/v1/marketing/campaign-executions/${executionId}/cancel`, {
    expectedVersion,
    reason,
  });
}
