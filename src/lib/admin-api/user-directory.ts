import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type UserDirectoryItem = {
  accountId: string;
  personId: string | null;
  displayName: string | null;
  username: string | null;
  status: string;
  applicationCodes: string[];
  createdAtUtc: string;
  lastActiveAtUtc: string | null;
};

export type UserDirectoryFreshness = {
  status: "fresh" | "stale";
  asOfUtc: string;
};

export type UserDirectoryResponse = {
  items: UserDirectoryItem[];
  page: number;
  pageSize: number;
  total: number;
  freshness: UserDirectoryFreshness;
};

export type UserDirectoryResult =
  | { kind: "ok"; data: UserDirectoryResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseDirectoryResponse(value: unknown): UserDirectoryResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items)) return null;
  if (typeof body.page !== "number" || typeof body.pageSize !== "number") return null;
  if (typeof body.total !== "number" || body.total < 0) return null;
  if (!body.freshness || typeof body.freshness !== "object") return null;

  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "stale") return null;
  if (typeof freshness.asOfUtc !== "string") return null;

  const items: UserDirectoryItem[] = [];
  for (const rawItem of body.items) {
    if (!rawItem || typeof rawItem !== "object") return null;
    const item = rawItem as Record<string, unknown>;
    if (typeof item.accountId !== "string" || typeof item.status !== "string") return null;
    if (item.personId !== null && typeof item.personId !== "string") return null;
    if (item.displayName !== null && typeof item.displayName !== "string") return null;
    if (
      item.username !== null &&
      item.username !== undefined &&
      typeof item.username !== "string"
    ) {
      return null;
    }
    if (!isStringArray(item.applicationCodes)) return null;
    if (typeof item.createdAtUtc !== "string") return null;
    if (item.lastActiveAtUtc !== null && typeof item.lastActiveAtUtc !== "string") return null;

    items.push({
      accountId: item.accountId,
      personId: item.personId,
      displayName: item.displayName,
      username: typeof item.username === "string" ? item.username : null,
      status: item.status,
      applicationCodes: item.applicationCodes,
      createdAtUtc: item.createdAtUtc,
      lastActiveAtUtc: item.lastActiveAtUtc,
    });
  }

  return {
    items,
    page: body.page,
    pageSize: body.pageSize,
    total: body.total,
    freshness: {
      status: freshness.status,
      asOfUtc: freshness.asOfUtc,
    },
  };
}

async function parseCorrelationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getUserDirectory(params: URLSearchParams): Promise<UserDirectoryResult> {
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
    response = await fetch(`${config.adminApiUrl}/api/v1/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseDirectoryResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }

  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };

  return {
    kind: "unavailable",
    correlationId: await parseCorrelationId(response),
  };
}
