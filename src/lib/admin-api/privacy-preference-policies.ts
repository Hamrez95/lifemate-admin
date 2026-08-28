import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type PreferencePurposePolicy = {
  purpose: string;
  category: string;
  channel: string | null;
  policyVersion: string;
  defaultEnabled: boolean;
  userMutable: boolean;
  status: "Active" | "Retired";
  description: string;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type PreferencePurposePolicyPage = {
  items: PreferencePurposePolicy[];
  page: number;
  pageSize: number;
  total: number;
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type PreferencePurposePolicyResult =
  | { kind: "ok"; data: PreferencePurposePolicyPage }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

export type PreferencePurposeMutationResult =
  | { ok: true }
  | { ok: false; code: string };

const PURPOSE = /^[a-z][a-z0-9._-]{2,79}$/;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const REASON = /^[a-z0-9_.-]{3,80}$/;

function parsePage(value: unknown): PreferencePurposePolicyPage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items) || !Number.isInteger(body.page) || !Number.isInteger(body.pageSize) || !Number.isInteger(body.total)) return null;
  if (!body.freshness || typeof body.freshness !== "object" || Array.isArray(body.freshness)) return null;
  const freshness = body.freshness as Record<string, unknown>;
  if ((freshness.status !== "fresh" && freshness.status !== "stale") || typeof freshness.asOfUtc !== "string") return null;

  const items: PreferencePurposePolicy[] = [];
  for (const raw of body.items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (
      typeof item.purpose !== "string" ||
      typeof item.category !== "string" ||
      (item.channel !== null && typeof item.channel !== "string") ||
      typeof item.policyVersion !== "string" ||
      typeof item.defaultEnabled !== "boolean" ||
      typeof item.userMutable !== "boolean" ||
      (item.status !== "Active" && item.status !== "Retired") ||
      typeof item.description !== "string" ||
      typeof item.createdAtUtc !== "string" ||
      typeof item.updatedAtUtc !== "string"
    ) return null;
    items.push({
      purpose: item.purpose,
      category: item.category,
      channel: item.channel,
      policyVersion: item.policyVersion,
      defaultEnabled: item.defaultEnabled,
      userMutable: item.userMutable,
      status: item.status,
      description: item.description,
      createdAtUtc: item.createdAtUtc,
      updatedAtUtc: item.updatedAtUtc,
    });
  }
  return {
    items,
    page: Number(body.page),
    pageSize: Number(body.pageSize),
    total: Number(body.total),
    freshness: { status: freshness.status, asOfUtc: freshness.asOfUtc },
  };
}

async function getToken() {
  return getServerAdminAccessToken();
}

async function problem(response: Response): Promise<{ code?: string; correlationId?: string }> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      code: typeof body.code === "string" ? body.code : undefined,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

export async function getPreferencePurposePolicies(params = new URLSearchParams()): Promise<PreferencePurposePolicyResult> {
  const token = await getToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/privacy/preference-purposes?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parsePage(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: (await problem(response)).correlationId };
}

function idempotencyKey(input: {
  purpose: string;
  expectedUpdatedAt: string;
  description: string;
  policyVersion: string;
  status: string;
  reasonCode: string;
}) {
  return `privacy-purpose:${input.purpose}:${input.expectedUpdatedAt}:${input.policyVersion}:${input.status}:${input.reasonCode}:${input.description}`
    .replace(/[^A-Za-z0-9._:-]/g, "_")
    .slice(0, 180);
}

export async function updatePreferencePurposePolicy(input: {
  purpose: string;
  expectedUpdatedAt: string;
  description: string;
  policyVersion: string;
  status: "Active" | "Retired";
  reasonCode: string;
}): Promise<PreferencePurposeMutationResult> {
  const normalized = {
    purpose: input.purpose.trim(),
    expectedUpdatedAt: input.expectedUpdatedAt.trim(),
    description: input.description.trim(),
    policyVersion: input.policyVersion.trim(),
    status: input.status,
    reasonCode: input.reasonCode.trim().toLowerCase(),
  };
  if (
    !PURPOSE.test(normalized.purpose) ||
    !Number.isFinite(new Date(normalized.expectedUpdatedAt).getTime()) ||
    normalized.description.length < 3 ||
    normalized.description.length > 240 ||
    !VERSION.test(normalized.policyVersion) ||
    !REASON.test(normalized.reasonCode)
  ) return { ok: false, code: "privacy_preference_payload_invalid" };

  const token = await getToken();
  if (!token) return { ok: false, code: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/privacy/preference-purposes/${encodeURIComponent(normalized.purpose)}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey(normalized),
      },
      body: JSON.stringify({
        expectedUpdatedAt: normalized.expectedUpdatedAt,
        description: normalized.description,
        policyVersion: normalized.policyVersion,
        status: normalized.status,
        reasonCode: normalized.reasonCode,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, code: "unavailable" };
  }
  if (response.ok) return { ok: true };
  return { ok: false, code: (await problem(response)).code ?? `http_${response.status}` };
}
