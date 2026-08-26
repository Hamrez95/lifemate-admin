export type FinanceScenarioAssumption = {
  code: string;
  label: string;
  amountMinor: string;
  classification: "BUDGET" | "FORECAST";
};

export type FinanceScenario = {
  scenarioId: string;
  scenarioKind: "BASE" | "UPSIDE" | "DOWNSIDE";
  name: string;
  currency: string;
  validFrom: string;
  validTo: string;
  version: number;
  assumptions: FinanceScenarioAssumption[];
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type FinanceScenariosResponse = {
  items: FinanceScenario[];
  semantics: {
    actualSource: "canonical_read_models_only";
    scenarioClassifications: ["BUDGET", "FORECAST"];
    scenarioKinds: ["BASE", "UPSIDE", "DOWNSIDE"];
    implicitFx: false;
    amountRepresentation: "integer_minor_units";
  };
  generatedAtUtc: string;
};

function isAssumption(value: unknown): value is FinanceScenarioAssumption {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.code === "string" &&
    typeof row.label === "string" &&
    typeof row.amountMinor === "string" &&
    /^-?\d+$/.test(row.amountMinor) &&
    (row.classification === "BUDGET" || row.classification === "FORECAST")
  );
}

function isScenario(value: unknown): value is FinanceScenario {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.scenarioId === "string" &&
    (row.scenarioKind === "BASE" ||
      row.scenarioKind === "UPSIDE" ||
      row.scenarioKind === "DOWNSIDE") &&
    typeof row.name === "string" &&
    typeof row.currency === "string" &&
    /^[A-Z]{3}$/.test(row.currency) &&
    typeof row.validFrom === "string" &&
    typeof row.validTo === "string" &&
    Number.isInteger(row.version) &&
    Number(row.version) >= 1 &&
    Array.isArray(row.assumptions) &&
    row.assumptions.every(isAssumption) &&
    typeof row.createdAtUtc === "string" &&
    typeof row.updatedAtUtc === "string"
  );
}

export function parseFinanceScenariosResponse(value: unknown): FinanceScenariosResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const semantics = body.semantics;
  if (!Array.isArray(body.items) || !body.items.every(isScenario)) return null;
  if (!semantics || typeof semantics !== "object" || Array.isArray(semantics)) return null;
  const policy = semantics as Record<string, unknown>;
  if (
    policy.actualSource !== "canonical_read_models_only" ||
    policy.implicitFx !== false ||
    policy.amountRepresentation !== "integer_minor_units" ||
    JSON.stringify(policy.scenarioClassifications) !== JSON.stringify(["BUDGET", "FORECAST"]) ||
    JSON.stringify(policy.scenarioKinds) !== JSON.stringify(["BASE", "UPSIDE", "DOWNSIDE"]) ||
    typeof body.generatedAtUtc !== "string"
  )
    return null;
  return body as FinanceScenariosResponse;
}
