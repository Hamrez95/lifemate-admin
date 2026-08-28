import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

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

export type PrivacyResult =
  | { kind: "ok"; data: PrivacyDirectoryResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function retirePrivacyDocument(input: {
  documentId: string;
  expectedUpdatedAt: string;
  reasonCode: string;
}): Promise<{ ok: true } | { ok: false; code: string }> {
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
  if (response.ok) return { ok: true };
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
