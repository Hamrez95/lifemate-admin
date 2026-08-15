import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

export type SearchDomain = "users" | "support" | "commerce" | "campaigns";

export type SearchItem = {
  id: string;
  domain: SearchDomain;
  kind: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  badge: string | null;
  href: string;
};

export type SearchGroup = {
  domain: SearchDomain;
  availability: "ready" | "unavailable";
  items: SearchItem[];
  total: number | null;
  page: number;
  pageSize: number;
  unavailableReason?: "not_instrumented";
};

export type GlobalSearchData = {
  groups: SearchGroup[];
  page: number;
  pageSize: number;
  freshness: { status: "fresh" | "stale"; asOfUtc: string };
};

export type GlobalSearchResult =
  | { kind: "ok"; data: GlobalSearchData }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "unavailable"; correlationId?: string };

const DOMAINS = new Set<SearchDomain>(["users", "support", "commerce", "campaigns"]);
const SAFE_HREF = /^\/(users|support|commerce)(\/|\?|$)/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= max ? value : null;
}

function nullableText(value: unknown, max: number): string | null | undefined {
  if (value === null) return null;
  return text(value, max) ?? undefined;
}

function positiveInteger(value: unknown, max = 100_000): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= max
    ? Number(value)
    : null;
}

function parseItem(value: unknown, domain: SearchDomain): SearchItem | null {
  const item = record(value);
  if (!item || item.domain !== domain) return null;
  const id = text(item.id, 128);
  const kind = text(item.kind, 64);
  const title = text(item.title, 240);
  const subtitle = nullableText(item.subtitle, 320);
  const status = nullableText(item.status, 80);
  const badge = nullableText(item.badge, 80);
  const href = text(item.href, 320);
  if (
    !id ||
    !kind ||
    !title ||
    subtitle === undefined ||
    status === undefined ||
    badge === undefined
  ) {
    return null;
  }
  if (!href || !SAFE_HREF.test(href) || href.includes("//")) return null;
  return { id, domain, kind, title, subtitle, status, badge, href };
}

function parseGroup(value: unknown): SearchGroup | null {
  const group = record(value);
  if (!group || typeof group.domain !== "string" || !DOMAINS.has(group.domain as SearchDomain)) {
    return null;
  }
  const domain = group.domain as SearchDomain;
  if (group.availability !== "ready" && group.availability !== "unavailable") return null;
  if (!Array.isArray(group.items)) return null;
  const items = group.items.map((item) => parseItem(item, domain));
  if (items.some((item) => item === null)) return null;
  const page = positiveInteger(group.page, 1000);
  const pageSize = positiveInteger(group.pageSize, 10);
  if (page === null || page < 1 || pageSize === null || pageSize < 1) return null;
  if (group.availability === "unavailable") {
    if (
      group.total !== null ||
      group.unavailableReason !== "not_instrumented" ||
      items.length > 0
    ) {
      return null;
    }
    return {
      domain,
      availability: "unavailable",
      items: [],
      total: null,
      page,
      pageSize,
      unavailableReason: "not_instrumented",
    };
  }
  const total = positiveInteger(group.total);
  if (total === null) return null;
  return {
    domain,
    availability: "ready",
    items: items as SearchItem[],
    total,
    page,
    pageSize,
  };
}

function parseData(value: unknown): GlobalSearchData | null {
  const body = record(value);
  if (!body || !Array.isArray(body.groups)) return null;
  const groups = body.groups.map(parseGroup);
  if (groups.some((group) => group === null)) return null;
  const page = positiveInteger(body.page, 1000);
  const pageSize = positiveInteger(body.pageSize, 10);
  const freshness = record(body.freshness);
  if (
    page === null ||
    page < 1 ||
    pageSize === null ||
    pageSize < 1 ||
    !freshness ||
    (freshness.status !== "fresh" && freshness.status !== "stale") ||
    !text(freshness.asOfUtc, 64) ||
    Number.isNaN(Date.parse(String(freshness.asOfUtc)))
  ) {
    return null;
  }
  return {
    groups: groups as SearchGroup[],
    page,
    pageSize,
    freshness: {
      status: freshness.status,
      asOfUtc: String(freshness.asOfUtc),
    },
  };
}

async function token(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error } = await supabase.auth.getClaims();
  if (error || !claimsData?.claims?.sub) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function problem(response: Response): Promise<{ message?: string; correlationId?: string }> {
  try {
    const body = record(await response.json());
    return {
      message: typeof body?.title === "string" ? body.title : undefined,
      correlationId: typeof body?.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

export async function searchCommandCenter(params: URLSearchParams): Promise<GlobalSearchResult> {
  const accessToken = await token();
  if (!accessToken) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseData(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 429) {
    const raw = Number(response.headers.get("retry-after") ?? "60");
    return {
      kind: "rate_limited",
      retryAfterSeconds: Number.isFinite(raw) && raw > 0 ? Math.ceil(raw) : 60,
    };
  }
  const issue = await problem(response);
  if (response.status === 400) return { kind: "invalid", message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}
