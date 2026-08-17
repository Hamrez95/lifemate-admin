import { getPublicRuntimeConfig } from "../runtime-config";
import { createServerSupabaseClient } from "../supabase/server";

export type FinanceProfitLossState = "ready" | "unavailable" | "currency_required";

export type FinanceCategory = {
  code: string;
  label: string;
  kind: "Revenue" | "Expense";
  amountMinor: string;
};

export type FinanceSeriesPoint = {
  month: string;
  revenueMinor: string;
  expenseMinor: string;
  netResultMinor: string;
};

export type FinanceActual = {
  revenueMinor: string;
  expenseMinor: string;
  netResultMinor: string;
  categories: FinanceCategory[];
  series: FinanceSeriesPoint[];
};

export type FinanceProfitLossResponse = {
  state: FinanceProfitLossState;
  query: { from: string; to: string; currency: string | null };
  currency: string | null;
  minorUnitExponent: number | null;
  availableCurrencies: string[];
  actual: FinanceActual | null;
  forecast: { state: "unavailable"; reason: string };
  source: { kind: "canonical"; label: string; definitionVersion: number };
  freshness: { status: "fresh" | "unavailable"; asOfUtc: string | null };
  reason: string | null;
  generatedAtUtc: string;
};

export type FinanceProfitLossResult =
  | { kind: "ok"; data: FinanceProfitLossResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
const INTEGER = /^-?\d+$/;
const STATE = new Set<FinanceProfitLossState>(["ready", "unavailable", "currency_required"]);

function stringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function timestampOrNull(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
}

function amount(value: unknown): value is string {
  return typeof value === "string" && INTEGER.test(value);
}

function minorUnitExponent(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6);
}

function parseCategory(value: unknown): FinanceCategory | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.code !== "string" || typeof row.label !== "string") return null;
  if (row.kind !== "Revenue" && row.kind !== "Expense") return null;
  if (!amount(row.amountMinor)) return null;
  return row as unknown as FinanceCategory;
}

function parseSeries(value: unknown): FinanceSeriesPoint | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.month !== "string" || !/^\d{4}-\d{2}$/.test(row.month)) return null;
  if (!amount(row.revenueMinor) || !amount(row.expenseMinor) || !amount(row.netResultMinor)) {
    return null;
  }
  return row as unknown as FinanceSeriesPoint;
}

function parseActual(value: unknown): FinanceActual | null {
  if (!value || typeof value !== "object") return null;
  const actual = value as Record<string, unknown>;
  if (
    !amount(actual.revenueMinor) ||
    !amount(actual.expenseMinor) ||
    !amount(actual.netResultMinor)
  ) {
    return null;
  }
  if (!Array.isArray(actual.categories) || !Array.isArray(actual.series)) return null;
  const categories = actual.categories.map(parseCategory);
  const series = actual.series.map(parseSeries);
  if (categories.some((item) => item === null) || series.some((item) => item === null)) return null;
  return {
    revenueMinor: actual.revenueMinor,
    expenseMinor: actual.expenseMinor,
    netResultMinor: actual.netResultMinor,
    categories: categories as FinanceCategory[],
    series: series as FinanceSeriesPoint[],
  };
}

export function parseFinanceProfitLossResponse(value: unknown): FinanceProfitLossResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.state !== "string" || !STATE.has(body.state as FinanceProfitLossState))
    return null;
  if (!body.query || typeof body.query !== "object") return null;
  const query = body.query as Record<string, unknown>;
  if (typeof query.from !== "string" || !DATE.test(query.from)) return null;
  if (typeof query.to !== "string" || !DATE.test(query.to)) return null;
  if (
    query.currency !== null &&
    (typeof query.currency !== "string" || !CURRENCY.test(query.currency))
  )
    return null;
  if (!stringOrNull(body.currency) || (body.currency !== null && !CURRENCY.test(body.currency)))
    return null;
  if (!minorUnitExponent(body.minorUnitExponent)) return null;
  if (body.currency === null && body.minorUnitExponent !== null) return null;
  if (body.currency !== null && body.minorUnitExponent === null) return null;
  if (
    !Array.isArray(body.availableCurrencies) ||
    !body.availableCurrencies.every((item) => typeof item === "string" && CURRENCY.test(item))
  )
    return null;

  const actual = body.actual === null ? null : parseActual(body.actual);
  if (body.actual !== null && !actual) return null;
  if (body.state === "ready" && !actual) return null;

  if (!body.forecast || typeof body.forecast !== "object") return null;
  const forecast = body.forecast as Record<string, unknown>;
  if (forecast.state !== "unavailable" || typeof forecast.reason !== "string") return null;

  if (!body.source || typeof body.source !== "object") return null;
  const source = body.source as Record<string, unknown>;
  if (
    source.kind !== "canonical" ||
    typeof source.label !== "string" ||
    !Number.isInteger(source.definitionVersion)
  )
    return null;

  if (!body.freshness || typeof body.freshness !== "object") return null;
  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "unavailable") return null;
  if (!timestampOrNull(freshness.asOfUtc)) return null;
  if (!stringOrNull(body.reason)) return null;
  if (typeof body.generatedAtUtc !== "string" || Number.isNaN(Date.parse(body.generatedAtUtc)))
    return null;

  return {
    state: body.state as FinanceProfitLossState,
    query: query as FinanceProfitLossResponse["query"],
    currency: body.currency,
    minorUnitExponent: body.minorUnitExponent,
    availableCurrencies: body.availableCurrencies as string[],
    actual,
    forecast: forecast as FinanceProfitLossResponse["forecast"],
    source: source as FinanceProfitLossResponse["source"],
    freshness: freshness as FinanceProfitLossResponse["freshness"],
    reason: body.reason,
    generatedAtUtc: body.generatedAtUtc,
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

export async function getFinanceProfitLoss(
  params: URLSearchParams,
): Promise<FinanceProfitLossResult> {
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
    response = await fetch(
      `${config.adminApiUrl}/api/v1/finance/profit-loss?${params.toString()}`,
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
    const parsed = parseFinanceProfitLossResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
