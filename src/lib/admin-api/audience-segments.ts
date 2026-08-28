import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type SegmentOperator = "eq" | "neq" | "in" | "not_in" | "gte" | "lte" | "exists";
export type SegmentAttribute =
  | "demographic.locale"
  | "product.code"
  | "product.enrolled"
  | "subscription.status"
  | "entitlement.code"
  | "engagement.lifecycle"
  | "engagement.last_active_days";

export type SegmentRule = {
  attribute: SegmentAttribute;
  operator: SegmentOperator;
  value?: string | number | boolean | Array<string | number | boolean>;
};

export type AudienceSegment = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  ruleSet: { version: 1; match: "all" | "any"; rules: SegmentRule[] };
  ruleHash: string;
  status: "Active" | "Archived";
  version: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type SegmentPreview = {
  segmentId: string;
  segmentVersion: number;
  ruleHash: string;
  count: number | null;
  suppressed: boolean;
  minimumCohortSize: number;
  source: string;
  sourceAsOfUtc: string;
};

export type SegmentSnapshot = {
  id: string;
  segmentId: string;
  segmentVersion: number;
  ruleHash: string;
  memberCount: number | null;
  suppressed: boolean;
  minimumCohortSize: number;
  sourceAsOfUtc: string;
  createdAtUtc: string;
};

export type SegmentCapabilities = {
  supportedAttributes: string[];
  unavailableAttributes: string[];
  minimumPreviewCohort: number;
};

export type SegmentResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

type Problem = { code?: unknown; title?: unknown; correlationId?: unknown };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX = /^[0-9a-f]{64}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseRule(value: unknown): SegmentRule | null {
  const row = record(value);
  if (!row || typeof row.attribute !== "string" || typeof row.operator !== "string") return null;
  const attributes = [
    "demographic.locale",
    "product.code",
    "product.enrolled",
    "subscription.status",
    "entitlement.code",
    "engagement.lifecycle",
    "engagement.last_active_days",
  ];
  const operators = ["eq", "neq", "in", "not_in", "gte", "lte", "exists"];
  if (!attributes.includes(row.attribute) || !operators.includes(row.operator)) return null;
  return {
    attribute: row.attribute as SegmentAttribute,
    operator: row.operator as SegmentOperator,
    ...(row.value === undefined ? {} : { value: row.value as SegmentRule["value"] }),
  };
}

function parseSegment(value: unknown): AudienceSegment | null {
  const row = record(value);
  if (!row || typeof row.id !== "string" || !UUID.test(row.id)) return null;
  const ruleSet = record(row.ruleSet);
  if (
    !ruleSet ||
    ruleSet.version !== 1 ||
    (ruleSet.match !== "all" && ruleSet.match !== "any") ||
    !Array.isArray(ruleSet.rules)
  )
    return null;
  const rules = ruleSet.rules.map(parseRule);
  if (rules.some((item) => !item)) return null;
  if (
    typeof row.key !== "string" ||
    typeof row.name !== "string" ||
    (row.description !== null && typeof row.description !== "string") ||
    typeof row.ruleHash !== "string" ||
    !HEX.test(row.ruleHash) ||
    (row.status !== "Active" && row.status !== "Archived") ||
    !Number.isInteger(row.version) ||
    !instant(row.createdAtUtc) ||
    !instant(row.updatedAtUtc)
  )
    return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description as string | null,
    ruleSet: { version: 1, match: ruleSet.match, rules: rules as SegmentRule[] },
    ruleHash: row.ruleHash,
    status: row.status,
    version: Number(row.version),
    createdAtUtc: row.createdAtUtc,
    updatedAtUtc: row.updatedAtUtc,
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

function failed<T>(response: Response, body: Problem): SegmentResult<T> {
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

async function api(
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
    const body = await response.json().catch(() => null);
    return { response, body };
  } catch {
    return { response: new Response(null, { status: 503 }), body: null };
  }
}

export async function getAudienceSegments(): Promise<SegmentResult<AudienceSegment[]>> {
  const result = await api("/api/v1/marketing/segments");
  if (!result) return { kind: "unauthenticated" };
  if (!result.response.ok) return failed(result.response, (record(result.body) ?? {}) as Problem);
  const body = record(result.body);
  if (!body || !Array.isArray(body.items)) return { kind: "unavailable" };
  const items = body.items.map(parseSegment);
  if (items.some((item) => !item)) return { kind: "unavailable" };
  return { kind: "ok", data: items as AudienceSegment[] };
}

export async function getSegmentCapabilities(): Promise<SegmentResult<SegmentCapabilities>> {
  const result = await api("/api/v1/marketing/segments/capabilities");
  if (!result) return { kind: "unauthenticated" };
  if (!result.response.ok) return failed(result.response, (record(result.body) ?? {}) as Problem);
  const body = record(result.body);
  if (
    !body ||
    !Array.isArray(body.supportedAttributes) ||
    !Array.isArray(body.unavailableAttributes) ||
    !Number.isInteger(body.minimumPreviewCohort)
  )
    return { kind: "unavailable" };
  return {
    kind: "ok",
    data: {
      supportedAttributes: body.supportedAttributes.filter(
        (v): v is string => typeof v === "string",
      ),
      unavailableAttributes: body.unavailableAttributes.filter(
        (v): v is string => typeof v === "string",
      ),
      minimumPreviewCohort: Number(body.minimumPreviewCohort),
    },
  };
}

export async function createAudienceSegment(
  payload: {
    key: string;
    name: string;
    description: string | null;
    rules: AudienceSegment["ruleSet"];
  },
  idempotencyKey: string,
): Promise<SegmentResult<AudienceSegment>> {
  const result = await api("/api/v1/marketing/segments", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
  });
  if (!result) return { kind: "unauthenticated" };
  if (!result.response.ok) return failed(result.response, (record(result.body) ?? {}) as Problem);
  const segment = parseSegment(result.body);
  return segment ? { kind: "ok", data: segment } : { kind: "unavailable" };
}

export async function previewAudienceSegment(id: string): Promise<SegmentResult<SegmentPreview>> {
  if (!UUID.test(id)) return { kind: "invalid", code: "segment_id_invalid" };
  const result = await api(`/api/v1/marketing/segments/${id}/preview`);
  if (!result) return { kind: "unauthenticated" };
  if (!result.response.ok) return failed(result.response, (record(result.body) ?? {}) as Problem);
  const body = record(result.body);
  if (
    !body ||
    body.segmentId !== id ||
    !Number.isInteger(body.segmentVersion) ||
    typeof body.ruleHash !== "string" ||
    !HEX.test(body.ruleHash) ||
    (body.count !== null && !Number.isInteger(body.count)) ||
    typeof body.suppressed !== "boolean" ||
    !Number.isInteger(body.minimumCohortSize) ||
    typeof body.source !== "string" ||
    !instant(body.sourceAsOfUtc)
  )
    return { kind: "unavailable" };
  return { kind: "ok", data: body as unknown as SegmentPreview };
}

export async function snapshotAudienceSegment(
  id: string,
  expectedVersion: number,
  idempotencyKey: string,
): Promise<SegmentResult<SegmentSnapshot>> {
  if (!UUID.test(id)) return { kind: "invalid", code: "segment_id_invalid" };
  const result = await api(`/api/v1/marketing/segments/${id}/snapshot`, {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ expectedVersion }),
  });
  if (!result) return { kind: "unauthenticated" };
  if (!result.response.ok) return failed(result.response, (record(result.body) ?? {}) as Problem);
  const body = record(result.body);
  if (
    !body ||
    typeof body.id !== "string" ||
    !UUID.test(body.id) ||
    body.segmentId !== id ||
    !Number.isInteger(body.segmentVersion) ||
    typeof body.ruleHash !== "string" ||
    !HEX.test(body.ruleHash) ||
    (body.memberCount !== null && !Number.isInteger(body.memberCount)) ||
    typeof body.suppressed !== "boolean" ||
    !Number.isInteger(body.minimumCohortSize) ||
    !instant(body.sourceAsOfUtc) ||
    !instant(body.createdAtUtc)
  )
    return { kind: "unavailable" };
  return { kind: "ok", data: body as unknown as SegmentSnapshot };
}
