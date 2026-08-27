import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type GrowthRewardRule = {
  id: string;
  code: string;
  triggerKind: "Referral" | "Advocacy" | "Gift" | "Campaign";
  rewardKind: "Discount" | "GiftEntitlement" | "RaffleEligibility" | "CharityImpact";
  rewardConfig: Record<string, unknown>;
  maxIssuesPerAccount: number | null;
  status: "Draft" | "Active" | "Paused" | "Retired";
  version: number;
  updatedAtUtc: string;
};

export type GrowthRewardSource = {
  id: string;
  kind: "Referral" | "Advocacy";
  status: string;
  version: number;
  occurredAtUtc: string;
  platformCode?: string;
  evidenceType?: string;
  evidenceSource?: string;
};

export type GrowthRewardEvent = {
  id: string;
  sourceKind: string;
  sourceId: string;
  rewardKind: string;
  status: string;
  version: number;
  createdAtUtc: string;
  approvalRequestId: string | null;
};

export type GrowthRewardsSnapshot = {
  rules: GrowthRewardRule[] | null;
  referrals: GrowthRewardSource[] | null;
  advocacy: GrowthRewardSource[] | null;
  events: GrowthRewardEvent[] | null;
  access: "ready" | "forbidden" | "unavailable";
  asOfUtc: string;
};

export type GrowthRewardMutationResult =
  | { kind: "ok"; replayed?: boolean }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "unavailable"; message?: string; correlationId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, max = 1000): string | null {
  return typeof value === "string" && value.trim() && value.length <= max ? value : null;
}

function integer(value: unknown, min = 0): number | null {
  return Number.isInteger(value) && Number(value) >= min ? Number(value) : null;
}

function date(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

function parseRule(value: unknown): GrowthRewardRule | null {
  const row = record(value);
  if (!row) return null;
  const id = uuid(row.id);
  const code = text(row.code, 80);
  const triggerKind = text(row.trigger_kind, 24);
  const rewardKind = text(row.reward_kind, 32);
  const rewardConfig = record(row.reward_config);
  const status = text(row.status, 16);
  const version = integer(row.version, 1);
  const updatedAtUtc = date(row.updated_at_utc);
  const maxIssuesPerAccount =
    row.max_issues_per_account === null ? null : integer(row.max_issues_per_account, 1);
  if (
    !id ||
    !code ||
    !["Referral", "Advocacy", "Gift", "Campaign"].includes(triggerKind ?? "") ||
    !["Discount", "GiftEntitlement", "RaffleEligibility", "CharityImpact"].includes(
      rewardKind ?? "",
    ) ||
    !rewardConfig ||
    !["Draft", "Active", "Paused", "Retired"].includes(status ?? "") ||
    version === null ||
    !updatedAtUtc ||
    (row.max_issues_per_account !== null && maxIssuesPerAccount === null)
  ) {
    return null;
  }
  return {
    id,
    code,
    triggerKind: triggerKind as GrowthRewardRule["triggerKind"],
    rewardKind: rewardKind as GrowthRewardRule["rewardKind"],
    rewardConfig,
    maxIssuesPerAccount,
    status: status as GrowthRewardRule["status"],
    version,
    updatedAtUtc,
  };
}

function parseSource(kind: "Referral" | "Advocacy", value: unknown): GrowthRewardSource | null {
  const row = record(value);
  if (!row) return null;
  const id = uuid(row.id);
  const status = text(row.status, 32);
  const version = integer(row.version, 1);
  const occurredAtUtc = date(kind === "Referral" ? row.attributed_at_utc : row.created_at_utc);
  if (!id || !status || version === null || !occurredAtUtc) return null;
  if (kind === "Referral") return { id, kind, status, version, occurredAtUtc };
  const platformCode = text(row.platform_code, 64);
  const evidenceType = text(row.evidence_type, 64);
  const evidenceSource = text(row.evidence_source, 256);
  if (!platformCode || !evidenceType || !evidenceSource) return null;
  return { id, kind, status, version, occurredAtUtc, platformCode, evidenceType, evidenceSource };
}

function parseEvent(value: unknown): GrowthRewardEvent | null {
  const row = record(value);
  if (!row) return null;
  const id = uuid(row.id);
  const sourceKind = text(row.source_kind, 24);
  const sourceId = uuid(row.source_id);
  const rewardKind = text(row.reward_kind, 32);
  const status = text(row.status, 32);
  const version = integer(row.version, 1);
  const createdAtUtc = date(row.created_at_utc);
  const approvalRequestId = row.approval_request_id === null ? null : uuid(row.approval_request_id);
  if (
    !id ||
    !sourceKind ||
    !sourceId ||
    !rewardKind ||
    !status ||
    version === null ||
    !createdAtUtc ||
    (row.approval_request_id !== null && !approvalRequestId)
  ) {
    return null;
  }
  return {
    id,
    sourceKind,
    sourceId,
    rewardKind,
    status,
    version,
    createdAtUtc,
    approvalRequestId,
  };
}

async function api(path: string, init: RequestInit = {}): Promise<Response | null> {
  const accessToken = await getServerAdminAccessToken();
  if (!accessToken) return null;
  const config = getPublicRuntimeConfig();
  try {
    return await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
}

async function list<T>(path: string, parser: (value: unknown) => T | null) {
  const response = await api(path);
  if (!response) return { state: "unavailable" as const };
  if (response.status === 401 || response.status === 403) return { state: "forbidden" as const };
  if (!response.ok) return { state: "unavailable" as const };
  const body = record(await response.json().catch(() => null));
  if (!body || !Array.isArray(body.items)) return { state: "unavailable" as const };
  const items = body.items.map(parser);
  if (items.some((item) => item === null)) return { state: "unavailable" as const };
  return { state: "ready" as const, items: items as T[] };
}

export async function getGrowthRewardsSnapshot(): Promise<GrowthRewardsSnapshot> {
  const [rules, referrals, advocacy, events] = await Promise.all([
    list("/api/v1/commerce/rewards/rules?limit=100", parseRule),
    list("/api/v1/commerce/rewards/sources/Referral?limit=100", (item) =>
      parseSource("Referral", item),
    ),
    list("/api/v1/commerce/rewards/sources/Advocacy?limit=100", (item) =>
      parseSource("Advocacy", item),
    ),
    list("/api/v1/commerce/rewards/events?limit=100", parseEvent),
  ]);
  const states = [rules.state, referrals.state, advocacy.state, events.state];
  const access = states.every((state) => state === "ready")
    ? "ready"
    : states.every((state) => state === "forbidden")
      ? "forbidden"
      : "unavailable";
  return {
    rules: rules.state === "ready" ? rules.items : null,
    referrals: referrals.state === "ready" ? referrals.items : null,
    advocacy: advocacy.state === "ready" ? advocacy.items : null,
    events: events.state === "ready" ? events.items : null,
    access,
    asOfUtc: new Date().toISOString(),
  };
}

async function mutation(path: string, body: Record<string, unknown>, idempotencyKey: string) {
  const response = await api(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
  if (!response) return { kind: "unauthenticated" } as GrowthRewardMutationResult;
  const payload = record(await response.json().catch(() => null));
  const message = payload
    ? typeof payload.detail === "string"
      ? payload.detail
      : typeof payload.message === "string"
        ? payload.message
        : undefined
    : undefined;
  const correlationId =
    payload && typeof payload.correlationId === "string" ? payload.correlationId : undefined;
  if (response.ok)
    return {
      kind: "ok",
      replayed: payload && typeof payload.replayed === "boolean" ? payload.replayed : undefined,
    } as GrowthRewardMutationResult;
  if (response.status === 401) return { kind: "unauthenticated" } as GrowthRewardMutationResult;
  if (response.status === 403) return { kind: "forbidden" } as GrowthRewardMutationResult;
  if (response.status === 409) return { kind: "conflict", message } as GrowthRewardMutationResult;
  if (response.status >= 400 && response.status < 500)
    return { kind: "invalid", message } as GrowthRewardMutationResult;
  return { kind: "unavailable", message, correlationId } as GrowthRewardMutationResult;
}

export async function upsertGrowthRewardRule(
  body: Record<string, unknown>,
  idempotencyKey: string,
) {
  return await mutation("/api/v1/commerce/rewards/rules", body, idempotencyKey);
}

export async function reviewGrowthRewardSource(
  kind: "Referral" | "Advocacy",
  sourceId: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
) {
  return await mutation(
    `/api/v1/commerce/rewards/sources/${kind}/${sourceId}/review`,
    body,
    idempotencyKey,
  );
}
