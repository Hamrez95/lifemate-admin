export type FinanceCashState = "ready" | "partial" | "unavailable" | "currency_required";
export type FinanceSourceState = "ready" | "unavailable";
export type FinanceRunwayState = "ready" | "unavailable" | "not_burning";
export type FinanceScenario = "Base" | "Upside" | "Downside";

export type FinanceBurnSeriesPoint = {
  month: string;
  revenueMinor: string;
  expenseMinor: string;
  netBurnMinor: string;
};

export type FinanceActualCashPlanning = {
  state: FinanceSourceState;
  burn: null | {
    monthCount: number;
    revenueMinor: string;
    grossBurnMinor: string;
    netBurnMinor: string;
    averageGrossBurnMinor: string;
    averageNetBurnMinor: string;
    series: FinanceBurnSeriesPoint[];
  };
  source: null | {
    kind: "canonical";
    label: string;
    definitionVersion: number;
  };
  freshness: { status: "fresh" | "unavailable"; asOfUtc: string | null };
  reason: string | null;
};

export type FinanceCashBalance = {
  state: FinanceSourceState;
  balanceMinor: string | null;
  asOfDate: string | null;
  source: null | {
    kind: "canonical";
    label: string;
    sourceKind: string;
    observedAtUtc: string;
  };
  freshness: { status: "fresh" | "stale" | "unavailable"; asOfUtc: string | null };
  reason: string | null;
};

export type FinanceRunway = {
  state: FinanceRunwayState;
  trailingMonthsBasisPoints: string | null;
  formula: string;
  reason: string | null;
};

export type FinanceForecastAssumption = {
  scenario: FinanceScenario;
  code: string;
  label: string;
  value: string;
};

export type FinanceForecastScenario = {
  scenario: FinanceScenario;
  months: Array<{
    month: string;
    revenueMinor: string;
    expenseMinor: string;
    netBurnMinor: string;
  }>;
  projectedCash: {
    openingCashMinor: string | null;
    endingCashMinor: string | null;
    depletionMonth: string | null;
    runwayState: "depletes_within_horizon" | "beyond_horizon" | "unavailable";
    series: Array<{ month: string; projectedEndingCashMinor: string }>;
  };
};

export type FinanceCashForecast = {
  state: FinanceSourceState;
  plan: null | {
    code: string;
    version: number;
    label: string;
    forecastStartMonth: string;
    requestedHorizonMonths?: number;
    declaredHorizonMonths: number;
    approvedAtUtc: string;
    sourceKind: string;
  };
  assumptions: FinanceForecastAssumption[];
  scenarios: FinanceForecastScenario[];
  reason: string | null;
};

export type FinanceCashResponse = {
  state: FinanceCashState;
  query: { from: string; to: string; currency: string | null; horizonMonths: number };
  currency: string | null;
  minorUnitExponent: number | null;
  availableCurrencies: string[];
  actual: FinanceActualCashPlanning | null;
  cash: FinanceCashBalance | null;
  runway: FinanceRunway | null;
  forecast: FinanceCashForecast | null;
  reason: string | null;
  generatedAtUtc: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
const INTEGER = /^-?\d+$/;
const TIMESTAMP = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function integer(value: unknown): value is string {
  return typeof value === "string" && INTEGER.test(value);
}

function nullableInteger(value: unknown): value is string | null {
  return value === null || integer(value);
}

function timestampOrNull(value: unknown): value is string | null {
  return value === null || TIMESTAMP(value);
}

function validExponent(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6);
}

function parseActual(value: unknown): FinanceActualCashPlanning | null {
  const row = object(value);
  if (!row || (row.state !== "ready" && row.state !== "unavailable")) return null;
  const freshness = object(row.freshness);
  if (
    !freshness ||
    (freshness.status !== "fresh" && freshness.status !== "unavailable") ||
    !timestampOrNull(freshness.asOfUtc)
  ) {
    return null;
  }
  if (row.reason !== null && typeof row.reason !== "string") return null;

  if (row.state === "unavailable") {
    if (row.burn !== null) return null;
    return row as unknown as FinanceActualCashPlanning;
  }

  const burn = object(row.burn);
  const source = object(row.source);
  if (
    !burn ||
    !Number.isInteger(burn.monthCount) ||
    Number(burn.monthCount) < 1 ||
    !integer(burn.revenueMinor) ||
    !integer(burn.grossBurnMinor) ||
    !integer(burn.netBurnMinor) ||
    !integer(burn.averageGrossBurnMinor) ||
    !integer(burn.averageNetBurnMinor) ||
    !Array.isArray(burn.series) ||
    !source ||
    source.kind !== "canonical" ||
    typeof source.label !== "string" ||
    !Number.isInteger(source.definitionVersion) ||
    Number(source.definitionVersion) < 1 ||
    row.reason !== null
  ) {
    return null;
  }
  if (burn.series.length !== Number(burn.monthCount)) return null;
  for (const item of burn.series) {
    const point = object(item);
    if (
      !point ||
      typeof point.month !== "string" ||
      !MONTH.test(point.month) ||
      !integer(point.revenueMinor) ||
      !integer(point.expenseMinor) ||
      !integer(point.netBurnMinor) ||
      BigInt(point.netBurnMinor) !== BigInt(point.expenseMinor) - BigInt(point.revenueMinor)
    ) {
      return null;
    }
  }
  return row as unknown as FinanceActualCashPlanning;
}

function parseCash(value: unknown): FinanceCashBalance | null {
  const row = object(value);
  if (!row || (row.state !== "ready" && row.state !== "unavailable")) return null;
  const freshness = object(row.freshness);
  if (
    !freshness ||
    !["fresh", "stale", "unavailable"].includes(String(freshness.status)) ||
    !timestampOrNull(freshness.asOfUtc) ||
    (row.reason !== null && typeof row.reason !== "string")
  ) {
    return null;
  }
  if (row.state === "unavailable") {
    if (row.balanceMinor !== null || row.asOfDate !== null || row.source !== null) return null;
    return row as unknown as FinanceCashBalance;
  }
  const source = object(row.source);
  if (
    !integer(row.balanceMinor) ||
    BigInt(row.balanceMinor) < 0n ||
    typeof row.asOfDate !== "string" ||
    !DATE.test(row.asOfDate) ||
    !source ||
    source.kind !== "canonical" ||
    typeof source.label !== "string" ||
    typeof source.sourceKind !== "string" ||
    !TIMESTAMP(source.observedAtUtc)
  ) {
    return null;
  }
  return row as unknown as FinanceCashBalance;
}

function parseRunway(value: unknown): FinanceRunway | null {
  const row = object(value);
  if (!row || !["ready", "unavailable", "not_burning"].includes(String(row.state))) return null;
  if (!nullableInteger(row.trailingMonthsBasisPoints) || typeof row.formula !== "string") return null;
  if (row.reason !== null && typeof row.reason !== "string") return null;
  if (row.state === "ready" && row.trailingMonthsBasisPoints === null) return null;
  if (row.state !== "ready" && row.trailingMonthsBasisPoints !== null) return null;
  return row as unknown as FinanceRunway;
}

function parseForecast(value: unknown, horizonMonths: number): FinanceCashForecast | null {
  const row = object(value);
  if (!row || (row.state !== "ready" && row.state !== "unavailable")) return null;
  if (!Array.isArray(row.assumptions) || !Array.isArray(row.scenarios)) return null;
  if (row.reason !== null && typeof row.reason !== "string") return null;

  const scenarios = new Set<FinanceScenario>();
  for (const item of row.assumptions) {
    const assumption = object(item);
    if (
      !assumption ||
      !["Base", "Upside", "Downside"].includes(String(assumption.scenario)) ||
      typeof assumption.code !== "string" ||
      typeof assumption.label !== "string" ||
      typeof assumption.value !== "string"
    ) {
      return null;
    }
  }
  for (const item of row.scenarios) {
    const scenario = object(item);
    const projectedCash = object(scenario?.projectedCash);
    if (
      !scenario ||
      !["Base", "Upside", "Downside"].includes(String(scenario.scenario)) ||
      !Array.isArray(scenario.months) ||
      scenario.months.length !== horizonMonths ||
      !projectedCash ||
      !nullableInteger(projectedCash.openingCashMinor) ||
      !nullableInteger(projectedCash.endingCashMinor) ||
      (projectedCash.depletionMonth !== null &&
        (typeof projectedCash.depletionMonth !== "string" || !MONTH.test(projectedCash.depletionMonth))) ||
      !["depletes_within_horizon", "beyond_horizon", "unavailable"].includes(
        String(projectedCash.runwayState),
      ) ||
      !Array.isArray(projectedCash.series)
    ) {
      return null;
    }
    const name = scenario.scenario as FinanceScenario;
    if (scenarios.has(name)) return null;
    scenarios.add(name);
    for (const month of scenario.months) {
      const point = object(month);
      if (
        !point ||
        typeof point.month !== "string" ||
        !MONTH.test(point.month) ||
        !integer(point.revenueMinor) ||
        !integer(point.expenseMinor) ||
        !integer(point.netBurnMinor) ||
        BigInt(point.netBurnMinor) !== BigInt(point.expenseMinor) - BigInt(point.revenueMinor)
      ) {
        return null;
      }
    }
  }

  if (row.state === "ready") {
    const plan = object(row.plan);
    if (
      scenarios.size !== 3 ||
      !plan ||
      typeof plan.code !== "string" ||
      !Number.isInteger(plan.version) ||
      Number(plan.version) < 1 ||
      typeof plan.label !== "string" ||
      typeof plan.forecastStartMonth !== "string" ||
      !DATE.test(plan.forecastStartMonth) ||
      !Number.isInteger(plan.declaredHorizonMonths) ||
      Number(plan.declaredHorizonMonths) < horizonMonths ||
      !TIMESTAMP(plan.approvedAtUtc) ||
      typeof plan.sourceKind !== "string"
    ) {
      return null;
    }
    const assumptions = row.assumptions as Array<Record<string, unknown>>;
    for (const scenario of ["Base", "Upside", "Downside"] as const) {
      if (!assumptions.some((item) => item.scenario === scenario)) return null;
    }
  } else if (row.scenarios.length > 0) {
    return null;
  }
  return row as unknown as FinanceCashForecast;
}

export function parseFinanceCashResponse(value: unknown): FinanceCashResponse | null {
  const body = object(value);
  if (!body || !["ready", "partial", "unavailable", "currency_required"].includes(String(body.state))) {
    return null;
  }
  const query = object(body.query);
  if (
    !query ||
    typeof query.from !== "string" ||
    !DATE.test(query.from) ||
    typeof query.to !== "string" ||
    !DATE.test(query.to) ||
    (query.currency !== null &&
      (typeof query.currency !== "string" || !CURRENCY.test(query.currency))) ||
    !Number.isInteger(query.horizonMonths) ||
    Number(query.horizonMonths) < 1 ||
    Number(query.horizonMonths) > 18 ||
    (body.currency !== null &&
      (typeof body.currency !== "string" || !CURRENCY.test(body.currency))) ||
    !validExponent(body.minorUnitExponent) ||
    !Array.isArray(body.availableCurrencies) ||
    !body.availableCurrencies.every(
      (item) => typeof item === "string" && CURRENCY.test(item),
    ) ||
    (body.reason !== null && typeof body.reason !== "string") ||
    !TIMESTAMP(body.generatedAtUtc)
  ) {
    return null;
  }
  if ((body.currency === null) !== (body.minorUnitExponent === null)) return null;

  if (body.state === "currency_required") {
    if (
      query.currency !== null ||
      body.currency !== null ||
      body.minorUnitExponent !== null ||
      body.actual !== null ||
      body.cash !== null ||
      body.runway !== null ||
      body.forecast !== null ||
      body.availableCurrencies.length < 2
    ) {
      return null;
    }
  } else {
    if (body.currency === null || !(body.availableCurrencies as string[]).includes(body.currency)) {
      return null;
    }
    if (query.currency !== null && query.currency !== body.currency) return null;
    if (!body.actual || !body.cash || !body.runway || !body.forecast) return null;
    if (!parseActual(body.actual) || !parseCash(body.cash) || !parseRunway(body.runway)) return null;
    if (!parseForecast(body.forecast, Number(query.horizonMonths))) return null;
  }

  return body as unknown as FinanceCashResponse;
}
