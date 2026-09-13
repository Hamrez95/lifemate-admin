const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CommerceCatalogMutationExpectation =
  | { kind: "createPlan" }
  | { kind: "updatePlan"; planId: string; status: "Active" | "Retired" }
  | { kind: "schedulePrice"; planId: string; effectiveFromUtc: string };

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

function sameInstant(value: unknown, expected: string): boolean {
  if (typeof value !== "string") return false;
  const actualTime = Date.parse(value);
  const expectedTime = Date.parse(expected);
  return !Number.isNaN(actualTime) && !Number.isNaN(expectedTime) && actualTime === expectedTime;
}

export function parseCommerceCatalogMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: CommerceCatalogMutationExpectation,
): Record<string, unknown> | null {
  const body = record(value);
  if (!body || typeof body.replayed !== "boolean") return null;

  if (expectation.kind === "createPlan") {
    if (httpStatus !== 201 || typeof body.planId !== "string" || !UUID.test(body.planId)) return null;
    if (body.status !== "Active") return null;
    return body;
  }

  if (!sameUuid(body.planId, expectation.planId)) return null;

  if (expectation.kind === "updatePlan") {
    if (httpStatus !== 200) return null;
    if (body.previousStatus !== "Active" && body.previousStatus !== "Retired") return null;
    if (body.status !== expectation.status) return null;
    return body;
  }

  if (httpStatus !== 201 || typeof body.priceId !== "string" || !UUID.test(body.priceId)) return null;
  if (!sameInstant(body.effectiveFromUtc, expectation.effectiveFromUtc)) return null;
  return body;
}
