import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type UserPrivacySummary = {
  accountId: string;
  legalAcceptances: Array<{
    purpose: string;
    version: string;
    jurisdiction: string;
    acceptedAtUtc: string;
  }>;
  preferences: Array<{
    purpose: string;
    category: string;
    channel: string | null;
    policyVersion: string;
    enabled: boolean;
    explicit: boolean;
    status: string;
  }>;
  consents: Array<{
    purpose: string;
    scopeKey: string;
    status: string;
  }>;
  mutableFromAdmin: false;
  asOfUtc: string;
};

export type UserPrivacySummaryResult =
  | { kind: "ok"; data: UserPrivacySummary }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseSummary(value: unknown): UserPrivacySummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.accountId !== "string" || !UUID.test(body.accountId)) return null;
  if (body.mutableFromAdmin !== false || typeof body.asOfUtc !== "string") return null;
  if (
    !Array.isArray(body.legalAcceptances) ||
    !Array.isArray(body.preferences) ||
    !Array.isArray(body.consents)
  )
    return null;

  const legalAcceptances: UserPrivacySummary["legalAcceptances"] = [];
  for (const raw of body.legalAcceptances) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (
      typeof item.purpose !== "string" ||
      typeof item.version !== "string" ||
      typeof item.jurisdiction !== "string" ||
      typeof item.acceptedAtUtc !== "string"
    )
      return null;
    legalAcceptances.push({
      purpose: item.purpose,
      version: item.version,
      jurisdiction: item.jurisdiction,
      acceptedAtUtc: item.acceptedAtUtc,
    });
  }

  const preferences: UserPrivacySummary["preferences"] = [];
  for (const raw of body.preferences) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (
      typeof item.purpose !== "string" ||
      typeof item.category !== "string" ||
      (item.channel !== null && typeof item.channel !== "string") ||
      typeof item.policyVersion !== "string" ||
      typeof item.enabled !== "boolean" ||
      typeof item.explicit !== "boolean" ||
      typeof item.status !== "string"
    )
      return null;
    preferences.push({
      purpose: item.purpose,
      category: item.category,
      channel: item.channel,
      policyVersion: item.policyVersion,
      enabled: item.enabled,
      explicit: item.explicit,
      status: item.status,
    });
  }

  const consents: UserPrivacySummary["consents"] = [];
  for (const raw of body.consents) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (
      typeof item.purpose !== "string" ||
      typeof item.scopeKey !== "string" ||
      typeof item.status !== "string"
    )
      return null;
    consents.push({ purpose: item.purpose, scopeKey: item.scopeKey, status: item.status });
  }

  return {
    accountId: body.accountId,
    legalAcceptances,
    preferences,
    consents,
    mutableFromAdmin: false,
    asOfUtc: body.asOfUtc,
  };
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getUserPrivacySummary(accountId: string): Promise<UserPrivacySummaryResult> {
  if (!UUID.test(accountId)) return { kind: "invalid" };
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/privacy/users/${accountId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseSummary(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
