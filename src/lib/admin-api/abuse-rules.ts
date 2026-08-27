import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type AbuseRule = {
  id: string;
  code: string;
  contextCode: string;
  displayName: string;
  ruleKind: "VelocityLimit" | "UsageCap" | "Cooldown" | "DuplicateKey" | "EvidenceRequired";
  subjectScope: "Account" | "VerifiedPhone";
  enforcementAction: "Allow" | "Deny" | "RequireApproval";
  windowSeconds: number | null;
  maxCount: number | null;
  cooldownSeconds: number | null;
  evidenceCode: string | null;
  approvalRequestType: string | null;
  priority: number;
  status: string;
  version: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type AbuseDecision = {
  id: string;
  contextCode: string;
  finalAction: "Allow" | "Deny" | "RequireApproval";
  matchedRuleIds: string[];
  reasonCodes: string[];
  approvalRequestType: string | null;
  ruleSetHash: string;
  evaluatedAtUtc: string;
};

export type AbuseWorkspaceData = {
  rules: AbuseRule[];
  decisions: AbuseDecision[];
  privacy: { subjectIdentifiersExposed: false; rawContactValuesExposed: false };
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type AbuseReadResult =
  | { kind: "ok"; data: AbuseWorkspaceData }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

export type AbuseMutationResult =
  | { kind: "ok"; replayed: boolean }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "unavailable"; correlationId?: string; message?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[a-z][a-z0-9._-]{2,79}$/;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function integer(value: unknown): number | null {
  return Number.isInteger(value) ? Number(value) : null;
}

function iso(value: unknown): string | null {
  const candidate = text(value);
  return candidate && !Number.isNaN(Date.parse(candidate)) ? candidate : null;
}

function nullableText(value: unknown): string | null | undefined {
  if (value === null) return null;
  const candidate = text(value);
  return candidate ?? undefined;
}

function nullableInteger(value: unknown): number | null | undefined {
  if (value === null) return null;
  const candidate = integer(value);
  return candidate ?? undefined;
}

function parseRule(value: unknown): AbuseRule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const code = text(row.code);
  const contextCode = text(row.context_code ?? row.contextCode);
  const displayName = text(row.display_name ?? row.displayName);
  const ruleKind = text(row.rule_kind ?? row.ruleKind);
  const subjectScope = text(row.subject_scope ?? row.subjectScope);
  const enforcementAction = text(row.enforcement_action ?? row.enforcementAction);
  const windowSeconds = nullableInteger(row.window_seconds ?? row.windowSeconds);
  const maxCount = nullableInteger(row.max_count ?? row.maxCount);
  const cooldownSeconds = nullableInteger(row.cooldown_seconds ?? row.cooldownSeconds);
  const evidenceCode = nullableText(row.evidence_code ?? row.evidenceCode);
  const approvalRequestType = nullableText(row.approval_request_type ?? row.approvalRequestType);
  const priority = integer(row.priority);
  const status = text(row.status);
  const version = integer(row.version);
  const createdAtUtc = iso(row.created_at_utc ?? row.createdAtUtc);
  const updatedAtUtc = iso(row.updated_at_utc ?? row.updatedAtUtc);
  if (
    !id || !UUID.test(id) || !code || !KEY.test(code) || !contextCode || !KEY.test(contextCode) ||
    !displayName || !ruleKind || !["VelocityLimit", "UsageCap", "Cooldown", "DuplicateKey", "EvidenceRequired"].includes(ruleKind) ||
    !subjectScope || !["Account", "VerifiedPhone"].includes(subjectScope) ||
    !enforcementAction || !["Allow", "Deny", "RequireApproval"].includes(enforcementAction) ||
    windowSeconds === undefined || maxCount === undefined || cooldownSeconds === undefined ||
    evidenceCode === undefined || approvalRequestType === undefined || priority === null || priority < 1 ||
    !status || version === null || version < 1 || !createdAtUtc || !updatedAtUtc
  ) return null;
  return {
    id,
    code,
    contextCode,
    displayName,
    ruleKind: ruleKind as AbuseRule["ruleKind"],
    subjectScope: subjectScope as AbuseRule["subjectScope"],
    enforcementAction: enforcementAction as AbuseRule["enforcementAction"],
    windowSeconds,
    maxCount,
    cooldownSeconds,
    evidenceCode,
    approvalRequestType,
    priority,
    status,
    version,
    createdAtUtc,
    updatedAtUtc,
  };
}

function parseDecision(value: unknown): AbuseDecision | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const contextCode = text(row.context_code ?? row.contextCode);
  const finalAction = text(row.final_action ?? row.finalAction);
  const approvalRequestType = nullableText(row.approval_request_type ?? row.approvalRequestType);
  const ruleSetHash = text(row.rule_set_hash ?? row.ruleSetHash);
  const evaluatedAtUtc = iso(row.evaluated_at_utc ?? row.evaluatedAtUtc);
  const matched = row.matched_rule_ids ?? row.matchedRuleIds;
  const reasons = row.reason_codes ?? row.reasonCodes;
  if (
    !id || !UUID.test(id) || !contextCode || !KEY.test(contextCode) || !finalAction ||
    !["Allow", "Deny", "RequireApproval"].includes(finalAction) || approvalRequestType === undefined ||
    !ruleSetHash || !evaluatedAtUtc || !Array.isArray(matched) || !matched.every((item) => typeof item === "string" && UUID.test(item)) ||
    !Array.isArray(reasons) || !reasons.every((item) => typeof item === "string" && KEY.test(item))
  ) return null;
  return {
    id,
    contextCode,
    finalAction: finalAction as AbuseDecision["finalAction"],
    matchedRuleIds: matched as string[],
    reasonCodes: reasons as string[],
    approvalRequestType,
    ruleSetHash,
    evaluatedAtUtc,
  };
}

async function authenticatedFetch(path: string, init: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const config = getPublicRuntimeConfig();
  return fetch(`${config.adminApiUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

async function read(path: string): Promise<{ kind: "ok"; value: unknown } | Exclude<AbuseReadResult, { kind: "ok" }>> {
  try {
    const response = await authenticatedFetch(path, { method: "GET" });
    if (!response || response.status === 401) return { kind: "unauthenticated" };
    if (response.status === 403) return { kind: "forbidden" };
    if (!response.ok) return { kind: "unavailable", correlationId: response.headers.get("x-correlation-id") ?? undefined };
    return { kind: "ok", value: await response.json().catch(() => null) };
  } catch {
    return { kind: "unavailable" };
  }
}

export async function getAbuseWorkspace(): Promise<AbuseReadResult> {
  const [rulesResult, decisionsResult] = await Promise.all([
    read("/api/v1/security/abuse/rules?limit=200"),
    read("/api/v1/security/abuse/decisions?limit=200"),
  ]);
  if (rulesResult.kind !== "ok") return rulesResult;
  if (decisionsResult.kind !== "ok") return decisionsResult;
  const rulesPayload = rulesResult.value as Record<string, unknown> | null;
  const decisionsPayload = decisionsResult.value as Record<string, unknown> | null;
  if (!rulesPayload || !Array.isArray(rulesPayload.items) || !decisionsPayload || !Array.isArray(decisionsPayload.items)) return { kind: "unavailable" };
  const rules = rulesPayload.items.map(parseRule);
  const decisions = decisionsPayload.items.map(parseDecision);
  const privacyValue = decisionsPayload.privacy as Record<string, unknown> | null;
  const freshnessValue = decisionsPayload.freshness as Record<string, unknown> | null;
  const asOfUtc = freshnessValue ? iso(freshnessValue.asOfUtc) : null;
  const freshnessStatus = freshnessValue?.status;
  if (
    rules.some((item) => item === null) || decisions.some((item) => item === null) ||
    !privacyValue || privacyValue.subjectIdentifiersExposed !== false || privacyValue.rawContactValuesExposed !== false ||
    (freshnessStatus !== "fresh" && freshnessStatus !== "stale") || !asOfUtc
  ) return { kind: "unavailable" };
  return {
    kind: "ok",
    data: {
      rules: rules as AbuseRule[],
      decisions: decisions as AbuseDecision[],
      privacy: { subjectIdentifiersExposed: false, rawContactValuesExposed: false },
      freshness: { status: freshnessStatus, asOfUtc },
    },
  };
}

function messageFrom(value: unknown): string | undefined {
  return value && typeof value === "object" && !Array.isArray(value) && typeof (value as Record<string, unknown>).message === "string"
    ? String((value as Record<string, unknown>).message)
    : undefined;
}

async function mutate(path: string, body: Record<string, unknown>, idempotencyKey: string): Promise<AbuseMutationResult> {
  try {
    const response = await authenticatedFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    });
    if (!response || response.status === 401) return { kind: "unauthenticated" };
    if (response.status === 403) return { kind: "forbidden" };
    const payload = await response.json().catch(() => null);
    const message = messageFrom(payload);
    if (response.status === 400) return { kind: "invalid", message };
    if (response.status === 409) return { kind: "conflict", message };
    if (!response.ok) return { kind: "unavailable", correlationId: response.headers.get("x-correlation-id") ?? undefined, message };
    const replayed = !!payload && typeof payload === "object" && !Array.isArray(payload) && (payload as Record<string, unknown>).replayed === true;
    return { kind: "ok", replayed };
  } catch {
    return { kind: "unavailable" };
  }
}

export function upsertAbuseRule(input: {
  code: string;
  contextCode: string;
  displayName: string;
  ruleKind: AbuseRule["ruleKind"];
  subjectScope: AbuseRule["subjectScope"];
  enforcementAction: AbuseRule["enforcementAction"];
  windowSeconds: number | null;
  maxCount: number | null;
  cooldownSeconds: number | null;
  evidenceCode: string | null;
  approvalRequestType: string | null;
  priority: number;
  expectedVersion: number | null;
  reason: string;
  idempotencyKey: string;
}) {
  const { idempotencyKey, ...body } = input;
  return mutate("/api/v1/security/abuse/rules", body, idempotencyKey);
}

export function retireAbuseRule(input: { ruleId: string; expectedVersion: number; reason: string; idempotencyKey: string }) {
  return mutate(
    `/api/v1/security/abuse/rules/${encodeURIComponent(input.ruleId)}/actions/retire`,
    { expectedVersion: input.expectedVersion, reason: input.reason },
    input.idempotencyKey,
  );
}
