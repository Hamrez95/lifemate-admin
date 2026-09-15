import "server-only";

import {
  parsePlatformControlMutationSuccess,
  type PlatformControlMutationExpectation,
  type PlatformControlMutationSuccess,
} from "@/src/lib/admin-api/platform-control-mutation-contract";
import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type PlatformControl = {
  key: string;
  kind: "FeatureFlag" | "Config";
  valueType: "Boolean" | "Integer" | "String" | "Json";
  defaultValue: unknown;
  description: string;
  failClosed: boolean;
  status: "Active" | "Retired";
  version: number;
  updatedAtUtc: string;
};

export type PlatformRule = {
  id: string;
  priority: number;
  targetType: "Global" | "Product" | "Segment" | "Percentage" | "Beta" | "Account";
  targetKey: string | null;
  rolloutBasisPoints: number | null;
  value: unknown;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  version: number;
};

type PlatformEvaluatorDefinition = {
  key: string;
  kind: PlatformControl["kind"];
  valueType: PlatformControl["valueType"];
  defaultValue: unknown;
  failClosed: boolean;
  version: number;
};

type PlatformControlDetailRaw = {
  key: string;
  definition: PlatformEvaluatorDefinition;
  rules: PlatformRule[];
  authoritative: "server";
  security: { grantsPermission: false; grantsEntitlement: false };
};

export type PlatformControlDetail = Omit<PlatformControlDetailRaw, "definition"> & {
  definition: PlatformControl;
};

export type PlatformControlHistory = {
  controlKey: string;
  controlHistory: Array<{
    version: number;
    snapshot_json: Record<string, unknown>;
    archived_at_utc: string;
  }>;
  ruleHistory: Array<{
    rule_id: string;
    version: number;
    snapshot_json: Record<string, unknown>;
    archived_at_utc: string;
  }>;
};

type Result<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

async function request(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const { adminApiUrl } = getPublicRuntimeConfig();
  try {
    return await fetch(`${adminApiUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

async function mapped<T>(
  responseOrPromise: Response | null | Promise<Response | null>,
): Promise<Result<T>> {
  const response = await responseOrPromise;
  if (response === null) return { kind: "unauthenticated" };
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    if (response.ok) return { kind: "unavailable" };
  }
  if (response.ok) return { kind: "ok", data: body as T };
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if ([400, 404, 409].includes(response.status)) {
    return {
      kind: "invalid",
      message: typeof body.message === "string" ? body.message : undefined,
    };
  }
  return {
    kind: "unavailable",
    correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
  };
}

async function mutation(
  path: string,
  method: "POST" | "PATCH",
  body: Record<string, unknown>,
  idempotencyKey: string,
  expectation: PlatformControlMutationExpectation,
): Promise<Result<PlatformControlMutationSuccess>> {
  const response = await request(path, {
    method,
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
  });
  if (response === null) return { kind: "unauthenticated" };

  const payload = (await response.json().catch(() => null)) as unknown;
  const row =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if ([400, 404, 409].includes(response.status)) {
    return {
      kind: "invalid",
      message: typeof row?.message === "string" ? row.message : undefined,
    };
  }
  if (!response.ok) {
    return {
      kind: "unavailable",
      correlationId: typeof row?.correlationId === "string" ? row.correlationId : undefined,
    };
  }

  const success = parsePlatformControlMutationSuccess(payload, response.status, expectation);
  return success ? { kind: "ok", data: success } : { kind: "unavailable" };
}

export function getPlatformControls(): Promise<
  Result<{ items: PlatformControl[]; total: number }>
> {
  return mapped(request("/api/v1/platform/controls"));
}

export async function getPlatformControl(key: string): Promise<Result<PlatformControlDetail>> {
  const [detailResult, listResult] = await Promise.all([
    mapped<PlatformControlDetailRaw>(
      request(`/api/v1/platform/controls/${encodeURIComponent(key)}`),
    ),
    getPlatformControls(),
  ]);
  if (detailResult.kind !== "ok") return detailResult;
  if (listResult.kind !== "ok") return listResult;
  const metadata = listResult.data.items.find((item) => item.key === key);
  if (!metadata) return { kind: "invalid", message: "Platform control was not found." };
  if (metadata.version !== detailResult.data.definition.version) {
    return {
      kind: "invalid",
      message: "Platform control changed while loading; refresh and retry.",
    };
  }
  return {
    kind: "ok",
    data: {
      ...detailResult.data,
      definition: metadata,
    },
  };
}

export function getPlatformControlHistory(key: string): Promise<Result<PlatformControlHistory>> {
  return mapped(request(`/api/v1/platform/controls/${encodeURIComponent(key)}/history`));
}

export function createPlatformControl(input: {
  controlKey: string;
  controlKind: "FeatureFlag" | "Config";
  valueType: PlatformControl["valueType"];
  defaultValue: unknown;
  description: string;
  failClosed: boolean;
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    "/api/v1/platform/controls",
    "POST",
    {
      controlKey: input.controlKey,
      controlKind: input.controlKind,
      valueType: input.valueType,
      defaultValue: input.defaultValue,
      description: input.description,
      failClosed: input.failClosed,
      reason: input.reason,
    },
    input.idempotencyKey,
    {
      kind: "control-create",
      controlKey: input.controlKey,
      controlKind: input.controlKind,
      valueType: input.valueType,
    },
  );
}

export function updatePlatformControl(input: {
  key: string;
  expectedVersion: number;
  defaultValue: unknown;
  description: string;
  failClosed: boolean;
  status: "Active" | "Retired";
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    `/api/v1/platform/controls/${encodeURIComponent(input.key)}`,
    "PATCH",
    {
      expectedVersion: input.expectedVersion,
      defaultValue: input.defaultValue,
      description: input.description,
      failClosed: input.failClosed,
      status: input.status,
      reason: input.reason,
    },
    input.idempotencyKey,
    {
      kind: "control-update",
      controlKey: input.key,
      expectedVersion: input.expectedVersion,
      status: input.status,
      description: input.description,
      failClosed: input.failClosed,
    },
  );
}

export function createPlatformRule(input: {
  controlKey: string;
  priority: number;
  targetType: PlatformRule["targetType"];
  targetKey: string | null;
  rolloutBasisPoints: number | null;
  value: unknown;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  status: "Active" | "Disabled" | "Retired";
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    `/api/v1/platform/controls/${encodeURIComponent(input.controlKey)}/rules`,
    "POST",
    {
      priority: input.priority,
      targetType: input.targetType,
      targetKey: input.targetKey,
      rolloutBasisPoints: input.rolloutBasisPoints,
      value: input.value,
      startsAtUtc: input.startsAtUtc,
      endsAtUtc: input.endsAtUtc,
      status: input.status,
      reason: input.reason,
    },
    input.idempotencyKey,
    {
      kind: "rule-create",
      controlKey: input.controlKey,
      priority: input.priority,
      targetType: input.targetType,
      status: input.status,
    },
  );
}

export function updatePlatformRule(input: {
  ruleId: string;
  expectedVersion: number;
  priority: number;
  targetType: PlatformRule["targetType"];
  targetKey: string | null;
  rolloutBasisPoints: number | null;
  value: unknown;
  startsAtUtc: string | null;
  endsAtUtc: string | null;
  status: "Active" | "Disabled" | "Retired";
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    `/api/v1/platform/control-rules/${encodeURIComponent(input.ruleId)}`,
    "PATCH",
    {
      expectedVersion: input.expectedVersion,
      priority: input.priority,
      targetType: input.targetType,
      targetKey: input.targetKey,
      rolloutBasisPoints: input.rolloutBasisPoints,
      value: input.value,
      startsAtUtc: input.startsAtUtc,
      endsAtUtc: input.endsAtUtc,
      status: input.status,
      reason: input.reason,
    },
    input.idempotencyKey,
    {
      kind: "rule-update",
      ruleId: input.ruleId,
      expectedVersion: input.expectedVersion,
      priority: input.priority,
      targetType: input.targetType,
      status: input.status,
    },
  );
}

export function rollbackPlatformControl(input: {
  key: string;
  expectedVersion: number;
  historyVersion: number;
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    `/api/v1/platform/controls/${encodeURIComponent(input.key)}/actions/rollback`,
    "POST",
    {
      expectedVersion: input.expectedVersion,
      historyVersion: input.historyVersion,
      reason: input.reason,
    },
    input.idempotencyKey,
    { kind: "rollback", controlKey: input.key, expectedVersion: input.expectedVersion },
  );
}

export function killSwitchPlatformControl(input: {
  key: string;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}) {
  return mutation(
    `/api/v1/platform/controls/${encodeURIComponent(input.key)}/actions/kill-switch`,
    "POST",
    { expectedVersion: input.expectedVersion, reason: input.reason },
    input.idempotencyKey,
    { kind: "kill-switch", controlKey: input.key, expectedVersion: input.expectedVersion },
  );
}
