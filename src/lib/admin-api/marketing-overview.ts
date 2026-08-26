import { getKpiValues, type KpiValue } from "./analytics-kpis";
import {
  getMarketingAttribution,
  type MarketingAttributionResponse,
} from "./marketing-attribution";

export type MarketingOverviewState = "ready" | "partial" | "unavailable" | "not_instrumented";

export type MarketingOverviewReport = {
  query: { from: string; to: string; product: string | null };
  acquisition: {
    state: MarketingOverviewState;
    total: number | null;
    series: Array<{ date: string; value: number }>;
    source: string;
    asOfUtc: string | null;
    reason: string | null;
  };
  attribution: MarketingAttributionResponse | null;
  attributionReason: string | null;
  generatedAtUtc: string;
};

export type MarketingOverviewResult =
  | { kind: "ok"; data: MarketingOverviewReport }
  | { kind: "invalid"; message: string }
  | { kind: "unavailable"; correlationId?: string };

const PRODUCT_SET = new Set(["wellmate", "caremate", "women_health"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 180;

function tehranDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseMarketingOverviewQuery(
  params: URLSearchParams,
  now = new Date(),
): MarketingOverviewReport["query"] {
  const today = tehranDate(now);
  const to = params.get("to")?.trim() || today;
  const from = params.get("from")?.trim() || shiftDate(to, -29);
  const rawProduct = params.get("product")?.trim().toLowerCase() || "";

  if (!validDate(from) || !validDate(to)) throw new Error("Marketing date filter is invalid.");
  if (rawProduct && !PRODUCT_SET.has(rawProduct))
    throw new Error("Marketing product filter is invalid.");

  const fromMs = Date.parse(`${from}T00:00:00.000Z`);
  const toMs = Date.parse(`${to}T00:00:00.000Z`);
  const days = Math.floor((toMs - fromMs) / 86_400_000) + 1;
  if (days < 1 || days > MAX_DAYS) {
    throw new Error(`Marketing date range must contain between 1 and ${MAX_DAYS} days.`);
  }

  return { from, to, product: rawProduct || null };
}

function accountsCreated(values: readonly KpiValue[]): KpiValue | undefined {
  return values.find((item) => item.name === "accounts_created");
}

export async function getMarketingOverview(
  params: URLSearchParams,
  permissions: readonly string[],
  now = new Date(),
): Promise<MarketingOverviewResult> {
  let query: MarketingOverviewReport["query"];
  try {
    query = parseMarketingOverviewQuery(params, now);
  } catch (error) {
    return {
      kind: "invalid",
      message: error instanceof Error ? error.message : "Invalid marketing filter.",
    };
  }

  const generatedAtUtc = now.toISOString();
  const upstream = new URLSearchParams({ from: query.from, to: query.to });
  if (query.product) upstream.set("product", query.product);

  const hasAnalytics = permissions.includes("analytics.read");
  let acquisition: MarketingOverviewReport["acquisition"] = {
    state: "unavailable",
    total: null,
    series: [],
    source: "LifeMate Analytics / account_created",
    asOfUtc: null,
    reason:
      "این مدیر analytics.read ندارد؛ Marketing Overview درباره وجود یا مقدار داده Analytics حدس نمی‌زند.",
  };

  if (hasAnalytics) {
    const result = await getKpiValues(upstream);
    if (result.kind === "ok") {
      const value = accountsCreated(result.data.values);
      acquisition = value
        ? {
            state:
              value.state === "ready"
                ? "ready"
                : value.state === "partial"
                  ? "partial"
                  : "unavailable",
            total: value.state === "unavailable" ? null : value.value,
            series: value.state === "unavailable" ? [] : (value.series ?? []),
            source: value.source,
            asOfUtc: value.freshness.asOfUtc,
            reason: value.reason ?? null,
          }
        : {
            state: "unavailable",
            total: null,
            series: [],
            source: "LifeMate Analytics / account_created",
            asOfUtc: result.data.generatedAtUtc,
            reason: "KPI canonical account_created در پاسخ موجود نبود.",
          };
    } else if (result.kind === "unavailable") {
      return { kind: "unavailable", correlationId: result.correlationId };
    }
  }

  const attributionResult = await getMarketingAttribution(upstream);
  if (attributionResult.kind === "unauthenticated") {
    return { kind: "unavailable", correlationId: "unauthenticated" };
  }
  if (attributionResult.kind === "invalid") {
    return { kind: "invalid", message: "Marketing attribution filter is invalid." };
  }

  const attribution = attributionResult.kind === "ok" ? attributionResult.data : null;
  const attributionReason = attribution
    ? null
    : attributionResult.kind === "forbidden"
      ? "دسترسی marketing.read برای attribution مجاز نیست."
      : "مدل canonical attribution در حال حاضر قابل دسترسی نیست؛ هیچ مقدار جایگزین یا تخمینی ساخته نمی‌شود.";

  return {
    kind: "ok",
    data: {
      query,
      acquisition,
      attribution,
      attributionReason,
      generatedAtUtc,
    },
  };
}
