import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import {
  privacyCreateIdempotencyKey,
  privacyPublishIdempotencyKey,
  privacyRetireIdempotencyKey,
} from "./privacy-idempotency";

export type PrivacyDirectoryKind = "documents" | "acceptances" | "consents" | "preferences";

export type PrivacyDirectoryResponse = {
  items: Record<string, unknown>[];
  page: number;
  pageSize: number;
  total: number;
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
  lifecycle?: Record<string, unknown>;
  authority?: Record<string, unknown>;
  privacy?: Record<string, unknown>;
};

export type PrivacyCoverageItem = {
  documentId: string;
  purpose: string;
  version: string;
  jurisdiction: string;
  effectiveAtUtc: string;
  acceptedCount: number;
  eligibleAccountCount: number;
  coveragePercent: number;
};

export type PrivacyCoverageResponse = {
  items: PrivacyCoverageItem[];
  eligibleAccountCount: number;
  source: string;
  asOfUtc: string;
};

export type PrivacyResult =
  | { kind: "ok"; data: PrivacyDirectoryResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

export type PrivacyCoverageResult =
  | { kind: "ok"; data: PrivacyCoverageResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

export type PrivacyMutationResult = { ok: true } | { ok: false; code: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PURPOSE = /^(legal_terms|privacy_notice)$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const JURISDICTION = /^[A-Za-z0-9*-]{1,16}$/;
const DOCUMENT_HASH = /^[0-9a-fA-F]{32,128}$/;
const REASON = /^[a-z0-9_.-]{3,80}$/;

function parseDirectory(value: unknown): PrivacyDirectoryResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items)) return null;
  if (
    !Number.isInteger(body.page) ||
    !Number.isInteger(body.pageSize) ||
    !Number.isInteger(body.total)
  ) {
    return null;
  }
  if (!body.freshness || typeof body.freshness !== "object" || Array.isArray(body.freshness)) {
    return null;
  }
  const freshness = body.freshness as Record<string, unknown>;
  if (
    (freshness.status !== "fresh" && freshness.status !== "stale") ||
    typeof freshness.asOfUtc !== "string"
  ) {
    return null;
  }
  for (const item of body.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  }
  return {
    items: body.items as Record<string, unknown>[],
    page: Number(body.page),
    pageSize: Number(body.pageSize),
    total: Number(body.total),
    freshness: {
      status: freshness.status,
      asOfUtc: freshness.asOfUtc,
    },
    lifecycle: objectOrUndefined(body.lifecycle),
    authority: objectOrUndefined(body.authority),
    privacy: objectOrUndefined(body.privacy),
  };
}

function parseCoverage(value: unknown): PrivacyCoverageResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    !Array.isArray(body.items) ||
    !Number.isInteger(body.eligibleAccountCount) ||
    typeof body.source !== "string" ||
    typeof body.asOfUtc !== "string"
  ) {
    return null;
  }
  const items: PrivacyCoverageItem[] = [];
  for (const item of body.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (
      typeof row.documentId !== "string" ||
      typeof row.purpose !== "string" ||
      typeof row.version !== "string" ||
      typeof row.jurisdiction !== "string" ||
      typeof row.effectiveAtUtc !== "string" ||
      typeof row.acceptedCount !== "number" ||
      typeof row.eligibleAccountCount !== "number" ||
      typeof row.coveragePercent !== "number"
    ) {
      return null;
    }
    items.push({
      documentId: row.documentId,
      purpose: row.purpose,
      version: row.version,
      jurisdiction: row.jurisdiction,
      effectiveAtUtc: row.effectiveAtUtc,
      acceptedCount: row.acceptedCount,
      eligibleAccountCount: row.eligibleAccountCount,
      coveragePercent: row.coveragePercent,
    });
  }
  return {
    items,
    eligibleAccountCount: Number(body.eligibleAccountCount),
    source: body.source,
    asOfUtc: body.asOfUtc,
  };
}

function objectOrUndefined(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

async function problemCorrelation(response: Response): Promise<string | undefined> {
  try {
    const value = (await response.json()) as { correlationId?: unknown };
    return typeof value.correlationId === "string" ? value.correlationId : undefined;
  } catch {
    return undefined;
  }
}

async function mutationFailure(response: Response): Promise<PrivacyMutationResult> {
  try {
    const problem = (await response.json()) as { code?: unknown };
    return {
      ok: false,
      code: typeof problem.code === "string" ? problem.code : `http_${response.status}`,
    };
  } catch {
    return { ok: false, code: `http_${response.status}` };
  }
}

export async function getPrivacyDirectory(
  kind: PrivacyDirectoryKind,
  params: URLSearchParams,
): Promise<PrivacyResult> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/privacy/${kind}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseDirectory(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: await problemCorrelation(response) };
}

export async function getPrivacyCoverage(jurisdiction: string): Promise<PrivacyCoverageResult> {
  const normalized = jurisdiction.trim().toUpperCase();
  if (!JURISDICTION.test(normalized)) return { kind: "invalid" };
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/privacy/coverage?jurisdiction=${encodeURIComponent(normalized)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseCoverage(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: await problemCorrelation(response) };
}

export async function createPrivacyDocument(input: {
  purpose: string;
  version: string;
  jurisdiction: string;
  title: string;
  documentHash: string;
  contentUri: string;
  effectiveAtUtc: string;
  reasonCode: string;
}): Promise<PrivacyMutationResult> {
  const normalized = {
    ...input,
    purpose: input.purpose.trim(),
    version: input.version.trim(),
    jurisdiction: input.jurisdiction.trim().toUpperCase(),
    title: input.title.trim(),
    documentHash: input.documentHash.trim().toLowerCase(),
    contentUri: input.contentUri.trim(),
    effectiveAtUtc: input.effectiveAtUtc.trim(),
    reasonCode: input.reasonCode.trim().toLowerCase(),
  };
  if (
    !PURPOSE.test(normalized.purpose) ||
    !VERSION.test(normalized.version) ||
    !JURISDICTION.test(normalized.jurisdiction) ||
    normalized.title.length < 3 ||
    normalized.title.length > 200 ||
    !DOCUMENT_HASH.test(normalized.documentHash) ||
    !normalized.contentUri.startsWith("https://") ||
    !Number.isFinite(new Date(normalized.effectiveAtUtc).getTime()) ||
    !REASON.test(normalized.reasonCode)
  ) {
    return { ok: false, code: "privacy_document_payload_invalid" };
  }
  const token = await getServerAdminAccessToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/privacy/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": privacyCreateIdempotencyKey(normalized),
      },
      body: JSON.stringify(normalized),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, code: "unavailable" };
  }
  return response.ok ? { ok: true } : mutationFailure(response);
}

export async function publishPrivacyDocument(input: {
  documentId: string;
  expectedUpdatedAt: string;
  reasonCode: string;
}): Promise<PrivacyMutationResult> {
  if (!UUID.test(input.documentId) || !Number.isFinite(new Date(input.expectedUpdatedAt).getTime())) {
    return { ok: false, code: "privacy_document_publish_invalid" };
  }
  const reasonCode = input.reasonCode.trim().toLowerCase();
  if (!REASON.test(reasonCode)) return { ok: false, code: "privacy_reason_invalid" };
  const normalized = { ...input, reasonCode };
  const token = await getServerAdminAccessToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/privacy/documents/${input.documentId}/publish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": privacyPublishIdempotencyKey(normalized),
        },
        body: JSON.stringify({
          expectedUpdatedAt: input.expectedUpdatedAt,
          reasonCode,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { ok: false, code: "unavailable" };
  }
  return response.ok ? { ok: true } : mutationFailure(response);
}

export async function retirePrivacyDocument(input: {
  documentId: string;
  expectedUpdatedAt: string;
  reasonCode: string;
}): Promise<PrivacyMutationResult> {
  if (!UUID.test(input.documentId)) {
    return { ok: false, code: "privacy_document_id_invalid" };
  }
  const token = await getServerAdminAccessToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/privacy/documents/${input.documentId}/retire`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Idempotency-Key": privacyRetireIdempotencyKey(input),
        },
        body: JSON.stringify({
          expectedUpdatedAt: input.expectedUpdatedAt,
          reasonCode: input.reasonCode,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { ok: false, code: "unavailable" };
  }
  return response.ok ? { ok: true } : mutationFailure(response);
}
