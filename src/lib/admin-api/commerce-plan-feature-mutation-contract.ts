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
    typeof value === "string" && UUID.test(value) && value.toLowerCase() === expected.toLowerCase()
  );
}

export function parseCommercePlanFeatureMutationSuccess(
  value: unknown,
  expectation: PlanFeatureMutationExpectation,
): Record<string, unknown> | null {
  const generic = parseCommercePaymentMutationSuccess(value);
  const body = record(value);
  if (!generic || generic.code !== "ok" || !body) return null;
  if (!sameUuid(body.planId, expectation.planId)) return null;
  if (!sameUuid(body.featureId, expectation.featureId)) return null;
  if (body.assigned !== expectation.assigned) return null;
  if (!Number.isSafeInteger(body.version)) return null;
  if (!Number.isSafeInteger(expectation.expectedVersion) || expectation.expectedVersion < 0) return null;

  const expectedHttpStatus = expectation.expectedVersion === 0 ? 201 : 200;
  if (body.httpStatus !== expectedHttpStatus) return null;
  if (Number(body.version) !== expectation.expectedVersion + 1) return null;

  return body;
}
