import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type MarketingChannelSetupStatus = "SetupRequired" | "CredentialAvailable" | "Disabled";
export type MarketingChannelOperatorStatus = "Enabled" | "Disabled";
export type MarketingProviderConnectivity =
  | "NotVerified"
  | "Unsupported"
  | "VerificationPending"
  | "Verified"
  | "VerificationStale"
  | "ReconnectRequired"
  | "CredentialExpired"
  | "RateLimited"
  | "Degraded"
  | "Disabled"
  | "Unavailable";
export type MarketingCapabilityState = "Supported" | "Unsupported" | "NotVerified";
export type MarketingConfigurationCompleteness = "complete" | "partial" | "missing" | "unknown";

export type MarketingChannelCapabilities = {
  publishing?: MarketingCapabilityState;
  analytics?: MarketingCapabilityState;
  textPost?: MarketingCapabilityState;
  imagePost?: MarketingCapabilityState;
  videoPost?: MarketingCapabilityState;
  scheduling?: MarketingCapabilityState;
  metricRead?: MarketingCapabilityState;
};

export type MarketingChannel = {
  providerCode: string;
  displayName: string;
  operatorStatus: MarketingChannelOperatorStatus;
  setupStatus: MarketingChannelSetupStatus;
  credentialAvailable: boolean;
  providerConnectivity: MarketingProviderConnectivity;
  providerIdentity?: string;
  lastVerifiedAtUtc?: string;
  lastHealthCheckAtUtc?: string;
  healthFailureCode?: string;
  configurationCompleteness?: MarketingConfigurationCompleteness;
  capabilities?: MarketingChannelCapabilities;
  updatedAtUtc: string;
};

export type MarketingChannelList = {
  items: MarketingChannel[];
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
    source: string;
  };
};

export type MarketingChannelResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "not_found"; message?: string }
  | { kind: "invalid"; code?: string; message?: string }
  | { kind: "conflict"; code?: string; message?: string }
  | { kind: "unavailable"; correlationId?: string };

type Problem = {
  code?: unknown;
  title?: unknown;
  correlationId?: unknown;
};

const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const FAILURE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,95}$/;
const CONNECTIVITY_STATES = new Set<MarketingProviderConnectivity>([
  "NotVerified",
  "Unsupported",
  "VerificationPending",
  "Verified",
  "VerificationStale",
  "ReconnectRequired",
  "CredentialExpired",
  "RateLimited",
  "Degraded",
  "Disabled",
  "Unavailable",
]);
const CAPABILITY_STATES = new Set<MarketingCapabilityState>([
  "Supported",
  "Unsupported",
  "NotVerified",
]);
const COMPLETENESS_STATES = new Set<MarketingConfigurationCompleteness>([
  "complete",
  "partial",
  "missing",
  "unknown",
]);
const CAPABILITY_KEYS = [
  "publishing",
  "analytics",
  "textPost",
  "imagePost",
  "videoPost",
  "scheduling",
  "metricRead",
] as const satisfies readonly (keyof MarketingChannelCapabilities)[];

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function optionalInstant(value: unknown): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  return instant(value) ? value : null;
}

function optionalText(value: unknown, maxLength: number): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function parseCapabilities(value: unknown): MarketingChannelCapabilities | undefined | null {
  if (value === undefined || value === null) return undefined;
  const raw = record(value);
  if (!raw) return null;
  const capabilities: MarketingChannelCapabilities = {};
  for (const key of CAPABILITY_KEYS) {
    const state = raw[key];
    if (state === undefined || state === null) continue;
    if (typeof state !== "string" || !CAPABILITY_STATES.has(state as MarketingCapabilityState)) {
      return null;
    }
    capabilities[key] = state as MarketingCapabilityState;
  }
  return capabilities;
}

function parseChannel(value: unknown): MarketingChannel | null {
  const item = record(value);
  if (!item) return null;
  if (
    typeof item.providerCode !== "string" ||
    !PROVIDER_PATTERN.test(item.providerCode) ||
    typeof item.displayName !== "string" ||
    !item.displayName.trim() ||
    item.displayName.length > 120 ||
    (item.operatorStatus !== "Enabled" && item.operatorStatus !== "Disabled") ||
    !["SetupRequired", "CredentialAvailable", "Disabled"].includes(String(item.setupStatus)) ||
    typeof item.credentialAvailable !== "boolean" ||
    typeof item.providerConnectivity !== "string" ||
    !CONNECTIVITY_STATES.has(item.providerConnectivity as MarketingProviderConnectivity) ||
    !instant(item.updatedAtUtc)
  ) {
    return null;
  }

  const providerIdentity = optionalText(item.providerIdentity, 160);
  const lastVerifiedAtUtc = optionalInstant(item.lastVerifiedAtUtc);
  const lastHealthCheckAtUtc = optionalInstant(item.lastHealthCheckAtUtc);
  const capabilities = parseCapabilities(item.capabilities);
  if (
    providerIdentity === null ||
    lastVerifiedAtUtc === null ||
    lastHealthCheckAtUtc === null ||
    capabilities === null
  ) {
    return null;
  }

  let healthFailureCode: string | undefined;
  if (item.healthFailureCode !== undefined && item.healthFailureCode !== null) {
    if (
      typeof item.healthFailureCode !== "string" ||
      !FAILURE_CODE_PATTERN.test(item.healthFailureCode)
    ) {
      return null;
    }
    healthFailureCode = item.healthFailureCode;
  }

  let configurationCompleteness: MarketingConfigurationCompleteness | undefined;
  if (item.configurationCompleteness !== undefined && item.configurationCompleteness !== null) {
    if (
      typeof item.configurationCompleteness !== "string" ||
      !COMPLETENESS_STATES.has(item.configurationCompleteness as MarketingConfigurationCompleteness)
    ) {
      return null;
    }
    configurationCompleteness =
      item.configurationCompleteness as MarketingConfigurationCompleteness;
  }

  return {
    providerCode: item.providerCode,
    displayName: item.displayName.trim(),
    operatorStatus: item.operatorStatus,
    setupStatus: item.setupStatus as MarketingChannelSetupStatus,
    credentialAvailable: item.credentialAvailable,
    providerConnectivity: item.providerConnectivity as MarketingProviderConnectivity,
    providerIdentity,
    lastVerifiedAtUtc,
    lastHealthCheckAtUtc,
    healthFailureCode,
    configurationCompleteness,
    capabilities,
    updatedAtUtc: item.updatedAtUtc,
  };
}

function parseList(value: unknown): MarketingChannelList | null {
  const body = record(value);
  if (!body || !Array.isArray(body.items)) return null;
  const items = body.items.map(parseChannel);
  if (items.some((item) => !item)) return null;
  const freshness = record(body.freshness);
  if (
    !freshness ||
    (freshness.status !== "fresh" && freshness.status !== "stale") ||
    !instant(freshness.asOfUtc) ||
    typeof freshness.source !== "string"
  ) {
    return null;
  }
  return {
    items: items as MarketingChannel[],
    freshness: {
      status: freshness.status,
      asOfUtc: freshness.asOfUtc,
      source: freshness.source,
    },
  };
}

async function token(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request(path: string, init?: RequestInit) {
  const bearer = await token();
  if (!bearer) return null;
  const config = getPublicRuntimeConfig();
  try {
    const response = await fetch(`${config.adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${bearer}`,
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

function failed<T>(response: Response, body: Problem): MarketingChannelResult<T> {
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

export async function getMarketingChannels(): Promise<
  MarketingChannelResult<MarketingChannelList>
> {
  const result = await request("/api/v1/marketing/channels");
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok) {
    const parsed = parseList(result.body);
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  return failed(result.response, record(result.body) ?? {});
}

export async function setMarketingChannelStatus(
  providerCode: string,
  enabled: boolean,
  reason: string,
  idempotencyKey: string,
): Promise<MarketingChannelResult<Record<string, unknown>>> {
  if (!PROVIDER_PATTERN.test(providerCode) || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { kind: "invalid" };
  }
  const result = await request(`/api/v1/marketing/channels/${providerCode}/actions/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ enabled, reason }),
  });
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok && record(result.body)) {
    return { kind: "ok", data: result.body as Record<string, unknown> };
  }
  return failed(result.response, record(result.body) ?? {});
}
