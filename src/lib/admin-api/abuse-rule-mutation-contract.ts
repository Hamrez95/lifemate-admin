const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AbuseRuleMutationExpectation =
  | { kind: "upsert"; expectedVersion: number | null }
  | { kind: "retire"; ruleId: string; expectedVersion: number };

export type AbuseRuleMutationSuccess = {
  id: string;
  version: number;
  replayed: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameUuid(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" &&
    UUID.test(value) &&
    UUID.test(expected) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

export function parseAbuseRuleMutationSuccess(
  value: unknown,
  expectation: AbuseRuleMutationExpectation,
): AbuseRuleMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    body.httpStatus !== 200 ||
    body.code !== "ok" ||
    typeof body.id !== "string" ||
    !UUID.test(body.id) ||
    !Number.isInteger(body.version) ||
    Number(body.version) < 1 ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  const expectedVersion =
    expectation.kind === "upsert" && expectation.expectedVersion === null
      ? 1
      : Number(expectation.expectedVersion) + 1;

  if (body.version !== expectedVersion) return null;

  if (expectation.kind === "retire") {
    if (!sameUuid(body.id, expectation.ruleId) || body.status !== "Retired") return null;
  }

  return {
    id: body.id,
    version: Number(body.version),
    replayed: body.replayed,
  };
}
