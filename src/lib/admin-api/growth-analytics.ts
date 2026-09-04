import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type GrowthWindow = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type GrowthMetricState = "ready" | "partial" | "unavailable";
export type GrowthMetricAvailability =
  "ready" | "partial" | "not_enough_data" | "not_instrumented" | "delayed" | "unavailable";
export type GrowthStage =
  "acquisition" | "activation" | "engagement" | "monetization" | "retention";

export type GrowthMetric = {
  key: string;
  stage: GrowthStage;
  definitionVersion: number;
  state: GrowthMetricState;
  availability?: GrowthMetricAvailability;
  value: number | string | null;
  unit: "count" | "rate" | "minor_currency";
  source: string;
  freshness: { status: GrowthMetricState; asOfUtc: string };
  numerator?: number | null;
  denominator?: number | null;
  reason?: string;
};

export type GrowthActivityCoverage = {
  event: string;
  definitionVersion: number;
  scope: string;
  unit: string;
  firstEventAtUtc: string | null;
  latestEventAtUtc: string | null;
  timezone: string;
  note: string;
};

export type GrowthAnalyticsResponse = {
  definitionVersion: number;
  query: {
    from: string;
    to: string;
    window: GrowthWindow;
    product: string | null;
  };
  current: GrowthMetric[];
  previous: {
    range: { from: string; to: string };
    metrics: GrowthMetric[];
  };
  policy: {
    accountScoped: string[];
    personScoped: string[];
    noFabrication: true;
  };
  activityCoverage?: GrowthActivityCoverage;
  freshness: { asOfUtc: string; timezone: string };
};

export type GrowthAnalyticsResult =
  | { kind: "ok"; data: GrowthAnalyticsResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

const WINDOWS = new Set<GrowthWindow>(["daily", "weekly", "monthly", "quarterly", "yearly"]);
const STAGES = new Set<GrowthStage>([
  "acquisition",
  "activation",
  "engagement",
  "monetization",
  "retention",
]);
const STATES = new Set<GrowthMetricState>(["ready", "partial", "unavailable"]);
const AVAILABILITY = new Set<GrowthMetricAvailability>([
  "ready",
  "partial",
  "not_enough_data",
  "not_instrumented",
  "delayed",
  "unavailable",
]);
const UNITS = new Set<GrowthMetric["unit"]>(["count", "rate", "minor_currency"]);

function nullableNumber(value: unknown): value is number | null | undefined {
  return (
    value === undefined || value === null || (typeof value === "number" && Number.isFinite(value))
  );
}

function parseMetric(value: unknown): GrowthMetric | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.key !== "string" ||
    !STAGES.has(item.stage as GrowthStage) ||
    typeof item.definitionVersion !== "number" ||
    !Number.isInteger(item.definitionVersion) ||
    item.definitionVersion < 1 ||
    !STATES.has(item.state as GrowthMetricState) ||
    (item.availability !== undefined &&
      !AVAILABILITY.has(item.availability as GrowthMetricAvailability)) ||
    !UNITS.has(item.unit as GrowthMetric["unit"]) ||
    typeof item.source !== "string" ||
    (item.value !== null && typeof item.value !== "number" && typeof item.value !== "string") ||
    !nullableNumber(item.numerator) ||
    !nullableNumber(item.denominator) ||
    !item.freshness ||
    typeof item.freshness !== "object"
  ) {
    return null;
  }
  if (typeof item.value === "number" && !Number.isFinite(item.value)) return null;
  if (item.reason !== undefined && typeof item.reason !== "string") return null;
  const freshness = item.freshness as Record<string, unknown>;
  if (!STATES.has(freshness.status as GrowthMetricState) || typeof freshness.asOfUtc !== "string") {
    return null;
  }
  return item as unknown as GrowthMetric;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseActivityCoverage(value: unknown): GrowthActivityCoverage | null {
  if (!value || typeof value !== "object") return null;
  const coverage = value as Record<string, unknown>;
  if (
    typeof coverage.event !== "string" ||
    typeof coverage.definitionVersion !== "number" ||
    !Number.isInteger(coverage.definitionVersion) ||
    coverage.definitionVersion < 1 ||
    typeof coverage.scope !== "string" ||
    typeof coverage.unit !== "string" ||
    (coverage.firstEventAtUtc !== null && typeof coverage.firstEventAtUtc !== "string") ||
    (coverage.latestEventAtUtc !== null && typeof coverage.latestEventAtUtc !== "string") ||
    typeof coverage.timezone !== "string" ||
    typeof coverage.note !== "string"
  ) {
    return null;
  }
  return coverage as unknown as GrowthActivityCoverage;
}

export function parseGrowthAnalyticsResponse(value: unknown): GrowthAnalyticsResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.definitionVersion !== "number" ||
    !Number.isInteger(body.definitionVersion) ||
    !body.query ||
    typeof body.query !== "object" ||
    !Array.isArray(body.current) ||
    !body.previous ||
    typeof body.previous !== "object" ||
    !body.policy ||
    typeof body.policy !== "object" ||
    !body.freshness ||
    typeof body.freshness !== "object"
  ) {
    return null;
  }

  const query = body.query as Record<string, unknown>;
  if (
    typeof query.from !== "string" ||
    typeof query.to !== "string" ||
    !WINDOWS.has(query.window as GrowthWindow) ||
    (query.product !== null && typeof query.product !== "string")
  ) {
    return null;
  }

  const previous = body.previous as Record<string, unknown>;
  if (!previous.range || typeof previous.range !== "object" || !Array.isArray(previous.metrics)) {
    return null;
  }
  const previousRange = previous.range as Record<string, unknown>;
  if (typeof previousRange.from !== "string" || typeof previousRange.to !== "string") return null;

  if (!body.current.every((item) => parseMetric(item) !== null)) return null;
  if (!previous.metrics.every((item) => parseMetric(item) !== null)) return null;

  const policy = body.policy as Record<string, unknown>;
  if (
    !stringArray(policy.accountScoped) ||
    !stringArray(policy.personScoped) ||
    policy.noFabrication !== true
  ) {
    return null;
  }

  if (
    body.activityCoverage !== undefined &&
    parseActivityCoverage(body.activityCoverage) === null
  ) {
    return null;
  }

  const freshness = body.freshness as Record<string, unknown>;
  if (typeof freshness.asOfUtc !== "string" || typeof freshness.timezone !== "string") return null;

  return body as unknown as GrowthAnalyticsResponse;
}

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getGrowthAnalytics(params: URLSearchParams): Promise<GrowthAnalyticsResult> {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  const query = params.toString();
  const url = `${config.adminApiUrl}/api/v1/analytics/growth${query ? `?${query}` : ""}`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseGrowthAnalyticsResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) {
    return { kind: "invalid", correlationId: await correlationId(response) };
  }
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
