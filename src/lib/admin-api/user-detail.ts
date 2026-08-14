import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type UserDetailSectionState = "ready" | "empty" | "forbidden" | "unavailable";

export type UserDetailSection<T> = {
  state: UserDetailSectionState;
  data?: T;
};

export type UserDetailResponse = {
  account: UserDetailSection<{
    id: string;
    status: string;
    createdAtUtc: string;
  }>;
  person: UserDetailSection<{
    id: string;
    displayName: string | null;
    locale: string | null;
    timeZone: string | null;
  }>;
  products: UserDetailSection<
    Array<{
      applicationCode: string;
      applicationName: string;
      status: string;
      enrolledAtUtc: string;
      lastActiveAtUtc: string | null;
    }>
  >;
  commerce: UserDetailSection<{
    subscriptions: Array<{
      id: string;
      productCode: string;
      productName: string;
      planCode: string;
      planName: string;
      status: string;
      startsAtUtc: string;
      currentPeriodEndUtc: string | null;
    }>;
    entitlements: Array<{
      id: string;
      featureCode: string;
      source: string;
      status: string;
      startsAtUtc: string;
      expiresAtUtc: string | null;
    }>;
  }>;
  relationships: UserDetailSection<
    Array<{
      direction: "Incoming" | "Outgoing";
      relationshipType: string;
      status: string;
      count: number;
    }>
  >;
  adminActivity: UserDetailSection<{
    total: number;
    latest: Array<{
      id: string;
      action: string;
      result: string;
      occurredAtUtc: string;
    }>;
  }>;
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
  };
};

export type UserDetailResult =
  | { kind: "ok"; data: UserDetailResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasSectionState(value: unknown): value is UserDetailSectionState {
  return value === "ready" || value === "empty" || value === "forbidden" || value === "unavailable";
}

function isSection(value: unknown): value is UserDetailSection<unknown> {
  if (!value || typeof value !== "object") return false;
  return hasSectionState((value as Record<string, unknown>).state);
}

function parseResponse(value: unknown): UserDetailResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!isSection(body.account) || !isSection(body.person) || !isSection(body.products)) return null;
  if (!isSection(body.commerce) || !isSection(body.relationships) || !isSection(body.adminActivity))
    return null;
  if (!body.freshness || typeof body.freshness !== "object") return null;

  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (typeof freshness.asOfUtc !== "string") return null;

  const account = body.account as UserDetailResponse["account"];
  if (account.state !== "ready" || !account.data) return null;
  if (!UUID_PATTERN.test(account.data.id) || typeof account.data.status !== "string") return null;
  if (typeof account.data.createdAtUtc !== "string") return null;

  return body as unknown as UserDetailResponse;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getUserDetail(accountId: string): Promise<UserDetailResult> {
  if (!UUID_PATTERN.test(accountId)) return { kind: "not_found" };

  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return { kind: "unauthenticated" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/users/${accountId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
