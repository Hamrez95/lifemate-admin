import { parseCommercePaymentMutationSuccess } from "./commerce-payment-mutation-contract";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PlanFeatureMutationExpectation = {
  planId: string;
  featureId: string;
  assigned: boolean;
  expectedVersion: number;
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

function validateRouteBody(
  value: unknown,
  expectation: PlanFeatureMutationExpectation,
): Record<string, unknown> | null {
  const body = record(value);
  if (
    !body ||
    !sameUuid(body.planId, expectation.planId) ||
    !sameUuid(body.featureId, expectation.featureId) ||
    body.assigned !== expectation.assigned ||
    !Number.isSafeInteger(body.version) ||
    typeof body.replayed !== "boolean" ||
    !Number.isSafeInteger(expectation.expectedVersion) ||
    expectation.expectedVersion < 0 ||
    Number(body.version) !== expectation.expectedVersion + 1
  ) {
    return null;
  }
  return body;
}

export function parseCommercePlanFeatureMutationSuccess(
  value: unknown,
  expectation: PlanFeatureMutationExpectation,
): Record<string, unknown> | null;
export function parseCommercePlanFeatureMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: PlanFeatureMutationExpectation,
): Record<string, unknown> | null;
export function parseCommercePlanFeatureMutationSuccess(
  value: unknown,
  arg2: number | PlanFeatureMutationExpectation,
  arg3?: PlanFeatureMutationExpectation,
): Record<string, unknown> | null {
  if (typeof arg2 === "number") {
    const expectation = arg3;
    if (!expectation) return null;
    const body = validateRouteBody(value, expectation);
    if (!body) return null;
    const expectedHttpStatus = expectation.expectedVersion === 0 ? 201 : 200;
    return arg2 === expectedHttpStatus ? body : null;
  }

  const generic = parseCommercePaymentMutationSuccess(value);
  const body = validateRouteBody(value, arg2);
  if (!generic || generic.code !== "ok" || !body) return null;
  const expectedHttpStatus = arg2.expectedVersion === 0 ? 201 : 200;
  return body.httpStatus === expectedHttpStatus ? body : null;
}
