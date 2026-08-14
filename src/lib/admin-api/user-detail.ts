import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type UserDetailSectionState = "ready" | "empty" | "forbidden" | "unavailable";

export type UserDetailSection<T> = {
  state: UserDetailSectionState;
  data?: T;
};

export type UserAdminActivityItem = {
  id: string;
  action: string;
  result: string;
  occurredAtUtc: string;
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
    latest: UserAdminActivityItem[];
  }>;
  freshness: {
    status: "fresh" | "stale";
    asOfUtc: string;
  };
};

export type UserActivityResponse = {
  items: UserAdminActivityItem[];
  page: number;
  pageSize: number;
  total: number;
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

export type UserActivityResult =
  | { kind: "ok"; data: UserActivityResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "not_found" }
  | { kind: "unavailable"; correlationId?: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_ACTIVITY_PAGE_SIZE = 20;

function hasSectionState(value: unknown): value is UserDetailSectionState {
  return value === "ready" || value === "empty" || value === "forbidden" || value === "unavailable";
}

function isSection(value: unknown): value is UserDetailSection<unknown> {
  if (!value || typeof value !== "object") return false;
  return hasSectionState((value as Record<string, unknown>).state);
}

function isFreshness(value: unknown): value is UserDetailResponse["freshness"] {
  if (!value || typeof value !== "object") return false;
  const freshness = value as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return false;
  return typeof freshness.asOfUtc === "string";
}

function parseResponse(value: unknown): UserDetailResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!isSection(body.account) || !isSection(body.person) || !isSection(body.products)) return null;
  if (!isSection(body.commerce) || !isSection(body.relationships) || !isSection(body.adminActivity))
    return null;
  if (!isFreshness(body.freshness)) return null;

  const account = body.account as UserDetailResponse["account"];
  if (account.state !== "ready" || !account.data) return null;
  if (!UUID_PATTERN.test(account.data.id) || typeof account.data.status !== "string") return null;
  if (typeof account.data.createdAtUtc !== "string") return null;

  return body as unknown as UserDetailResponse;
}

function isActivityItem(value: unknown): value is UserAdminActivityItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.action === "string" &&
    typeof item.result === "string" &&
    typeof item.occurredAtUtc === "string"
  );
}

function parseActivityResponse(value: unknown): UserActivityResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items) || !body.items.every(isActivityItem)) return null;
  if (
    !Number.isInteger(body.page) ||
    !Number.isInteger(body.pageSize) ||
    !Number.isInteger(body.total)
  ) {
    return null;
  }
  if (!isFreshness(body.freshness)) return null;
  return body as unknown as UserActivityResponse;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

async function adminAccessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function getUserDetail(accountId: string): Promise<UserDetailResult> {
  if (!UUID_PATTERN.test(accountId)) return { kind: "not_found" };
  const token = await adminAccessToken();
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

export async function getUserActivity(
  accountId: string,
  page: number,
  pageSize = USER_ACTIVITY_PAGE_SIZE,
): Promise<UserActivityResult> {
  if (!UUID_PATTERN.test(accountId)) return { kind: "not_found" };
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  const safePageSize = Math.min(50, Math.max(5, Math.trunc(pageSize) || USER_ACTIVITY_PAGE_SIZE));
  const token = await adminAccessToken();
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  const search = new URLSearchParams({
    page: String(safePage),
    pageSize: String(safePageSize),
  });
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/users/${accountId}/activity?${search.toString()}`,
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
    const parsed = parseActivityResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 404) return { kind: "not_found" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
