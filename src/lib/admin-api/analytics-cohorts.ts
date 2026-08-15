import {
  getAnalyticsCatalog,
  type AnalyticsCatalog,
  type AnalyticsEventDefinition,
} from "@/src/lib/admin-api/analytics-catalog";
import {
  getKpiValues,
  type AnalyticsKpiValuesResponse,
  type KpiValue,
} from "@/src/lib/admin-api/analytics-kpis";

export const COHORT_DEFINITION_VERSION = 1;
export const COHORT_SUPPRESSION_THRESHOLD = 20;
export const COHORT_MAX_DAYS = 180;
export const RETENTION_WINDOWS = [1, 7, 30] as const;

export type CohortProduct = "wellmate" | "caremate" | "women_health" | null;
export type CohortState = "ready" | "partial" | "unavailable" | "suppressed";

export type CohortQuery = {
  from: string;
  to: string;
  product: CohortProduct;
};

export type RetentionCell = {
  day: (typeof RETENTION_WINDOWS)[number];
  state: CohortState;
  retained: number | null;
  rate: number | null;
  reason: string | null;
};

export type CohortRow = {
  cohortDate: string;
  size: number | null;
  sourceState: "ready" | "partial";
  suppressed: boolean;
  retention: RetentionCell[];
};

export type CohortDefinition = {
  version: number;
  eventTaxonomyVersion: number;
  kpiDictionaryVersion: number;
  timezone: "Asia/Tehran";
  acquisitionEvent: "account_created";
  activationEvent: "profile_completed";
  activationWindowDays: 7;
  retentionEvent: "app_opened";
  retentionWindows: readonly [1, 7, 30];
  suppressionThreshold: number;
};

export type AnalyticsCohortReport = {
  query: CohortQuery;
  definition: CohortDefinition;
  acquisition: {
    state: "partial" | "unavailable";
    total: number | null;
    source: string;
    asOfUtc: string | null;
    reason: string | null;
  };
  activation: {
    state: "unavailable";
    rate: null;
    reason: string;
  };
  retention: {
    state: "unavailable";
    cohorts: CohortRow[];
    reason: string;
  };
  channels: {
    state: "unavailable";
    items: [];
    reason: string;
  };
  churnReturn: {
    state: "unavailable";
    churnRate: null;
    returnRate: null;
    reason: string;
  };
  generatedAtUtc: string;
};

export type AnalyticsCohortResult =
  | { kind: "ok"; data: AnalyticsCohortReport }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message: string }
  | { kind: "unavailable"; correlationId?: string };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PRODUCTS = new Set(["wellmate", "caremate", "women_health"]);

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

export function parseCohortQuery(params: URLSearchParams, now = new Date()): CohortQuery {
  const today = tehranDate(now);
  const to = params.get("to")?.trim() || today;
  const from = params.get("from")?.trim() || shiftDate(to, -59);
  const rawProduct = params.get("product")?.trim().toLowerCase() || "";

  if (!validDate(from) || !validDate(to)) {
    throw new Error("Cohort date filter is invalid.");
  }
  if (rawProduct && !PRODUCTS.has(rawProduct)) {
    throw new Error("Cohort product filter is invalid.");
  }

  const fromMs = Date.parse(`${from}T00:00:00.000Z`);
  const toMs = Date.parse(`${to}T00:00:00.000Z`);
  const daySpan = Math.floor((toMs - fromMs) / 86_400_000) + 1;
  if (daySpan < 1 || daySpan > COHORT_MAX_DAYS) {
    throw new Error(`Cohort date range must contain between 1 and ${COHORT_MAX_DAYS} days.`);
  }

  return {
    from,
    to,
    product: rawProduct ? (rawProduct as Exclude<CohortProduct, null>) : null,
  };
}

function event(catalog: AnalyticsCatalog, name: string): AnalyticsEventDefinition | undefined {
  return catalog.events.find((item) => item.name === name);
}

function value(values: AnalyticsKpiValuesResponse, name: string): KpiValue | undefined {
  return values.values.find((item) => item.name === name);
}

function unavailableRetention(reason: string): RetentionCell[] {
  return RETENTION_WINDOWS.map((day) => ({
    day,
    state: "unavailable" as const,
    retained: null,
    rate: null,
    reason,
  }));
}

function suppressedRetention(): RetentionCell[] {
  return RETENTION_WINDOWS.map((day) => ({
    day,
    state: "suppressed" as const,
    retained: null,
    rate: null,
    reason: `Cohort size is below the privacy threshold of ${COHORT_SUPPRESSION_THRESHOLD}.`,
  }));
}

export function buildCohortReport(
  catalog: AnalyticsCatalog,
  values: AnalyticsKpiValuesResponse,
): AnalyticsCohortReport {
  const acquisition = value(values, "accounts_created");
  const activationEvent = event(catalog, "profile_completed");
  const retentionEvent = event(catalog, "app_opened");
  const acquisitionSeries = acquisition?.state !== "unavailable" ? (acquisition?.series ?? []) : [];

  const retentionReason =
    retentionEvent?.instrumentationState === "instrumented"
      ? "Canonical retention aggregates are not available from the current analytics read model yet."
      : "app_opened history is not instrumented, so D1/D7/D30 retention cannot be reconstructed truthfully.";

  const cohorts: CohortRow[] = acquisitionSeries.map((point) => {
    const suppressed = point.value > 0 && point.value < COHORT_SUPPRESSION_THRESHOLD;
    return {
      cohortDate: point.date,
      size: suppressed ? null : point.value,
      sourceState: acquisition?.state === "ready" ? "ready" : "partial",
      suppressed,
      retention: suppressed ? suppressedRetention() : unavailableRetention(retentionReason),
    };
  });

  const activationReason =
    activationEvent?.instrumentationState === "instrumented"
      ? "Canonical activation-window aggregates are not available from the current analytics read model yet."
      : "profile_completed is not instrumented, so activation conversion cannot be reconstructed truthfully.";

  return {
    query: values.query,
    definition: {
      version: COHORT_DEFINITION_VERSION,
      eventTaxonomyVersion: catalog.eventTaxonomyVersion,
      kpiDictionaryVersion: catalog.kpiDictionaryVersion,
      timezone: "Asia/Tehran",
      acquisitionEvent: "account_created",
      activationEvent: "profile_completed",
      activationWindowDays: 7,
      retentionEvent: "app_opened",
      retentionWindows: RETENTION_WINDOWS,
      suppressionThreshold: COHORT_SUPPRESSION_THRESHOLD,
    },
    acquisition: {
      state: acquisition?.state === "unavailable" || !acquisition ? "unavailable" : "partial",
      total: acquisition?.state === "unavailable" || !acquisition ? null : acquisition.value,
      source: acquisition?.source ?? "account_created canonical definition",
      asOfUtc: acquisition?.freshness.asOfUtc ?? null,
      reason: acquisition?.reason ?? null,
    },
    activation: {
      state: "unavailable",
      rate: null,
      reason: activationReason,
    },
    retention: {
      state: "unavailable",
      cohorts,
      reason: retentionReason,
    },
    channels: {
      state: "unavailable",
      items: [],
      reason:
        "Taxonomy v1 does not attribute account_created to an acquisition channel; channel shares are intentionally unavailable.",
    },
    churnReturn: {
      state: "unavailable",
      churnRate: null,
      returnRate: null,
      reason:
        "Historical app_opened event history is required to distinguish churn from return without guessing from a last-active snapshot.",
    },
    generatedAtUtc: values.generatedAtUtc,
  };
}

export async function getAnalyticsCohorts(
  params: URLSearchParams,
  now = new Date(),
): Promise<AnalyticsCohortResult> {
  let query: CohortQuery;
  try {
    query = parseCohortQuery(params, now);
  } catch (error) {
    return { kind: "invalid", message: error instanceof Error ? error.message : "Invalid cohort query." };
  }

  const upstream = new URLSearchParams({ from: query.from, to: query.to });
  if (query.product) upstream.set("product", query.product);

  const [catalogResult, valuesResult] = await Promise.all([
    getAnalyticsCatalog(),
    getKpiValues(upstream),
  ]);

  if (catalogResult.kind === "unauthenticated" || valuesResult.kind === "unauthenticated") {
    return { kind: "unauthenticated" };
  }
  if (catalogResult.kind === "forbidden" || valuesResult.kind === "forbidden") {
    return { kind: "forbidden" };
  }
  if (valuesResult.kind === "invalid") {
    return { kind: "invalid", message: "Analytics source rejected the selected cohort filters." };
  }
  if (catalogResult.kind !== "ok" || valuesResult.kind !== "ok") {
    return {
      kind: "unavailable",
      correlationId:
        catalogResult.kind === "unavailable"
          ? catalogResult.correlationId
          : valuesResult.kind === "unavailable"
            ? valuesResult.correlationId
            : undefined,
    };
  }

  return { kind: "ok", data: buildCohortReport(catalogResult.data, valuesResult.data) };
}
