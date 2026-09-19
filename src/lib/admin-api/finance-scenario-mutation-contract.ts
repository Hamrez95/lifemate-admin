export type FinanceScenarioMutationExpectation =
  { kind: "create" } | { kind: "update"; scenarioId: string; expectedVersion: number };

export type FinanceScenarioMutationSuccess = {
  scenarioId: string;
  version: number;
  updatedAtUtc: string;
  replayed: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function exactUuid(value: string, expected: string): boolean {
  return UUID.test(expected) && value.toLowerCase() === expected.toLowerCase();
}

export function parseFinanceScenarioMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: FinanceScenarioMutationExpectation,
): FinanceScenarioMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    typeof body.scenarioId !== "string" ||
    !UUID.test(body.scenarioId) ||
    !Number.isSafeInteger(body.version) ||
    !instant(body.updatedAtUtc) ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  if (expected.kind === "create") {
    if (httpStatus !== 201 || body.version !== 1) return null;
  } else {
    const nextVersion = expected.expectedVersion + 1;
    if (
      httpStatus !== 200 ||
      !Number.isSafeInteger(nextVersion) ||
      !exactUuid(body.scenarioId, expected.scenarioId) ||
      body.version !== nextVersion
    ) {
      return null;
    }
  }

  return {
    scenarioId: body.scenarioId,
    version: Number(body.version),
    updatedAtUtc: body.updatedAtUtc,
    replayed: body.replayed,
  };
}
