export type FinanceBudgetState = "ready" | "unavailable" | "currency_required";
export type FinanceFavorability = "favorable" | "unfavorable" | "on_budget";
export type FinanceEntryKind = "Revenue" | "Expense";

export type FinanceVariance = {
  budgetMinor: string;
  actualMinor: string;
  varianceMinor: string;
  varianceBasisPoints: string | null;
  favorability: FinanceFavorability;
};

export type FinanceBudgetCategory = {
  kind: FinanceEntryKind;
  code: string;
  label: string;
  budgetMinor: string | null;
  actualMinor: string;
  varianceMinor: string | null;
  varianceBasisPoints: string | null;
  favorability: FinanceFavorability | null;
};

export type FinanceBudgetComparison = {
  totals: {
    revenue: FinanceVariance;
    expense: FinanceVariance;
    net: FinanceVariance;
  };
  categories: FinanceBudgetCategory[];
};

export type FinanceBudgetSource = {
  kind: "canonical";
  label: string;
  code: string;
  version: number;
  approvedAtUtc: string;
};

export type FinanceActualSource = {
  kind: "canonical";
  label: string;
  definitionVersion: number;
};

export type FinanceBudgetResponse = {
  state: FinanceBudgetState;
  query: { from: string; to: string; currency: string | null };
  currency: string | null;
  minorUnitExponent: number | null;
  availableCurrencies: string[];
  comparison: FinanceBudgetComparison | null;
  budgetSource: FinanceBudgetSource | null;
  actualSource: FinanceActualSource | null;
  freshness: { status: "fresh" | "unavailable"; asOfUtc: string | null };
  reason: string | null;
  generatedAtUtc: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
const INTEGER = /^-?\d+$/;
const FAVORABILITY = new Set<FinanceFavorability>([
  "favorable",
  "unfavorable",
  "on_budget",
]);
const STATE = new Set<FinanceBudgetState>(["ready", "unavailable", "currency_required"]);

function integer(value: unknown): value is string {
  return typeof value === "string" && INTEGER.test(value);
}

function nullableInteger(value: unknown): value is string | null {
  return value === null || integer(value);
}

function timestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function timestampOrNull(value: unknown): value is string | null {
  return value === null || timestamp(value);
}

function minorUnitExponent(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6);
}

function favorability(value: unknown): value is FinanceFavorability {
  return typeof value === "string" && FAVORABILITY.has(value as FinanceFavorability);
}

function expectedFavorability(
  kind: FinanceEntryKind | "Net",
  actual: bigint,
  budget: bigint,
): FinanceFavorability {
  if (actual === budget) return "on_budget";
  if (kind === "Expense") return actual < budget ? "favorable" : "unfavorable";
  return actual > budget ? "favorable" : "unfavorable";
}

function expectedBasisPoints(actual: bigint, budget: bigint): string | null {
  if (budget <= 0n) return null;
  return (((actual - budget) * 10_000n) / budget).toString();
}

function parseVariance(value: unknown, kind: FinanceEntryKind | "Net"): FinanceVariance | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!integer(row.budgetMinor) || !integer(row.actualMinor) || !integer(row.varianceMinor)) {
    return null;
  }
  if (!nullableInteger(row.varianceBasisPoints) || !favorability(row.favorability)) return null;

  const budget = BigInt(row.budgetMinor);
  const actual = BigInt(row.actualMinor);
  if (BigInt(row.varianceMinor) !== actual - budget) return null;
  if (row.varianceBasisPoints !== expectedBasisPoints(actual, budget)) return null;
  if (row.favorability !== expectedFavorability(kind, actual, budget)) return null;

  return row as unknown as FinanceVariance;
}

function parseCategory(value: unknown): FinanceBudgetCategory | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (row.kind !== "Revenue" && row.kind !== "Expense") return null;
  if (typeof row.code !== "string" || typeof row.label !== "string") return null;
  if (!nullableInteger(row.budgetMinor) || !integer(row.actualMinor)) return null;
  if (!nullableInteger(row.varianceMinor) || !nullableInteger(row.varianceBasisPoints)) return null;
  if (row.favorability !== null && !favorability(row.favorability)) return null;

  if (row.budgetMinor === null) {
    if (row.varianceMinor !== null || row.varianceBasisPoints !== null || row.favorability !== null) {
      return null;
    }
    return row as unknown as FinanceBudgetCategory;
  }

  if (row.varianceMinor === null || row.favorability === null) return null;
  const budget = BigInt(row.budgetMinor);
  const actual = BigInt(row.actualMinor);
  if (BigInt(row.varianceMinor) !== actual - budget) return null;
  if (row.varianceBasisPoints !== expectedBasisPoints(actual, budget)) return null;
  if (row.favorability !== expectedFavorability(row.kind, actual, budget)) return null;
  return row as unknown as FinanceBudgetCategory;
}

function parseComparison(value: unknown): FinanceBudgetComparison | null {
  if (!value || typeof value !== "object") return null;
  const comparison = value as Record<string, unknown>;
  if (!comparison.totals || typeof comparison.totals !== "object") return null;
  const totals = comparison.totals as Record<string, unknown>;
  const revenue = parseVariance(totals.revenue, "Revenue");
  const expense = parseVariance(totals.expense, "Expense");
  const net = parseVariance(totals.net, "Net");
  if (!revenue || !expense || !net || !Array.isArray(comparison.categories)) return null;

  const categories = comparison.categories.map(parseCategory);
  if (categories.some((item) => item === null)) return null;

  if (BigInt(net.budgetMinor) !== BigInt(revenue.budgetMinor) - BigInt(expense.budgetMinor)) {
    return null;
  }
  if (BigInt(net.actualMinor) !== BigInt(revenue.actualMinor) - BigInt(expense.actualMinor)) {
    return null;
  }

  return {
    totals: { revenue, expense, net },
    categories: categories as FinanceBudgetCategory[],
  };
}

function parseBudgetSource(value: unknown): FinanceBudgetSource | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (
    source.kind !== "canonical" ||
    typeof source.label !== "string" ||
    typeof source.code !== "string" ||
    !Number.isInteger(source.version) ||
    Number(source.version) < 1 ||
    !timestamp(source.approvedAtUtc)
  ) {
    return null;
  }
  return source as unknown as FinanceBudgetSource;
}

function parseActualSource(value: unknown): FinanceActualSource | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  if (
    source.kind !== "canonical" ||
    typeof source.label !== "string" ||
    !Number.isInteger(source.definitionVersion) ||
    Number(source.definitionVersion) < 1
  ) {
    return null;
  }
  return source as unknown as FinanceActualSource;
}

export function parseFinanceBudgetResponse(value: unknown): FinanceBudgetResponse | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.state !== "string" || !STATE.has(body.state as FinanceBudgetState)) return null;
  if (!body.query || typeof body.query !== "object") return null;
  const query = body.query as Record<string, unknown>;
  if (typeof query.from !== "string" || !DATE.test(query.from)) return null;
  if (typeof query.to !== "string" || !DATE.test(query.to)) return null;
  if (query.currency !== null && (typeof query.currency !== "string" || !CURRENCY.test(query.currency))) {
    return null;
  }
  if (body.currency !== null && (typeof body.currency !== "string" || !CURRENCY.test(body.currency))) {
    return null;
  }
  if (!minorUnitExponent(body.minorUnitExponent)) return null;
  if (body.currency === null && body.minorUnitExponent !== null) return null;
  if (body.currency !== null && body.minorUnitExponent === null) return null;
  if (
    !Array.isArray(body.availableCurrencies) ||
    !body.availableCurrencies.every((item) => typeof item === "string" && CURRENCY.test(item))
  ) {
    return null;
  }

  const comparison = body.comparison === null ? null : parseComparison(body.comparison);
  if (body.comparison !== null && !comparison) return null;
  const budgetSource = body.budgetSource === null ? null : parseBudgetSource(body.budgetSource);
  if (body.budgetSource !== null && !budgetSource) return null;
  const actualSource = body.actualSource === null ? null : parseActualSource(body.actualSource);
  if (body.actualSource !== null && !actualSource) return null;

  if (body.state === "ready") {
    if (!comparison || !budgetSource || !actualSource || body.currency === null) return null;
    if (!(body.availableCurrencies as string[]).includes(body.currency)) return null;
    if (query.currency !== null && query.currency !== body.currency) return null;
    if (body.reason !== null) return null;
  } else if (comparison) {
    return null;
  }
  if (
    body.state === "currency_required" &&
    (query.currency !== null || body.currency !== null || body.minorUnitExponent !== null ||
      (body.availableCurrencies as string[]).length < 2)
  ) {
    return null;
  }

  if (!body.freshness || typeof body.freshness !== "object") return null;
  const freshness = body.freshness as Record<string, unknown>;
  if (freshness.status !== "fresh" && freshness.status !== "unavailable") return null;
  if (!timestampOrNull(freshness.asOfUtc)) return null;
  if (body.reason !== null && typeof body.reason !== "string") return null;
  if (!timestamp(body.generatedAtUtc)) return null;

  return {
    state: body.state as FinanceBudgetState,
    query: query as FinanceBudgetResponse["query"],
    currency: body.currency as string | null,
    minorUnitExponent: body.minorUnitExponent as number | null,
    availableCurrencies: body.availableCurrencies as string[],
    comparison,
    budgetSource,
    actualSource,
    freshness: freshness as FinanceBudgetResponse["freshness"],
    reason: body.reason as string | null,
    generatedAtUtc: body.generatedAtUtc as string,
  };
}
