import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type MarketingChannelSetupStatus =
  | "SetupRequired"
  | "CredentialAvailable"
  | "Disabled";
export type MarketingChannelOperatorStatus = "Enabled" | "Disabled";

export type MarketingChannel = {
  providerCode: string;
  displayName: string;
  operatorStatus: MarketingChannelOperatorStatus;
  setupStatus: MarketingChannelSetupStatus;
  credentialAvailable: boolean;
  providerConnectivity: "NotVerified";
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

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseChannel(value: unknown): MarketingChannel | null {
  const item = record(value);
  if (!item) return null;
  if (
    typeof item.providerCode !== "string" ||
    !PROVIDER_PATTERN.test(item.providerCode) ||
    typeof item.displayName !== "string" ||
    (item.operatorStatus !== "Enabled" && item.operatorStatus !== "Disabled") ||
    !["SetupRequired", "CredentialAvailable", "Disabled"].includes(String(item.setupStatus)) ||
    typeof item.credentialAvailable !== "boolean" ||
    item.providerConnectivity !== "NotVerified" ||
    !instant(item.updatedAtUtc)
  ) {
    return null;
  }
  return item as MarketingChannel;
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
    correlationId:
      typeof body.correlationId === "string" ? body.correlationId : undefined,
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
  if (
    !PROVIDER_PATTERN.test(providerCode) ||
    !IDEMPOTENCY_PATTERN.test(idempotencyKey)
  ) {
    return { kind: "invalid" };
  }
  const result = await request(
    `/api/v1/marketing/channels/${providerCode}/actions/status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ enabled, reason }),
    },
  );
  if (!result) return { kind: "unauthenticated" };
  if (result.response.ok && record(result.body)) {
    return { kind: "ok", data: result.body as Record<string, unknown> };
  }
  return failed(result.response, record(result.body) ?? {});
}
