import { parseCommercePaymentMutationSuccess } from "./commerce-payment-mutation-contract";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EDITABLE_STATUSES = new Set(["Draft", "Paused"]);
const LIFECYCLE_STATUSES = new Set(["Draft", "Active", "Paused"]);

export type PromotionMutationExpectation =
  | { kind: "create" }
  | {
      kind: "update";
      promotionId: string;
      codeStatus?: "Active" | "Disabled";
    }
  | {
      kind: "status";
      promotionId: string;
      status: "Active" | "Paused";
    };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function uuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function sameUuid(value: unknown, expected: string): boolean {
  return uuid(value) && UUID.test(expected) && value.toLowerCase() === expected.toLowerCase();
}

function validateBody(
  body: Record<string, unknown>,
  expectation: PromotionMutationExpectation,
): boolean {
  if (!uuid(body.promotionId) || typeof body.replayed !== "boolean") return false;

  if (expectation.kind !== "create" && !sameUuid(body.promotionId, expectation.promotionId)) {
    return false;
  }

  if (expectation.kind === "create") {
    return (
      uuid(body.discountCodeId) && body.promotionStatus === "Draft" && body.codeStatus === "Active"
    );
  }

  if (expectation.kind === "update") {
    return (
      uuid(body.discountCodeId) &&
      typeof body.status === "string" &&
      EDITABLE_STATUSES.has(body.status) &&
      (body.codeStatus === "Active" || body.codeStatus === "Disabled") &&
      (expectation.codeStatus === undefined || body.codeStatus === expectation.codeStatus)
    );
  }

  if (
    body.status !== expectation.status ||
    typeof body.previousStatus !== "string" ||
    !LIFECYCLE_STATUSES.has(body.previousStatus) ||
    typeof body.noop !== "boolean"
  ) {
    return false;
  }
  return body.noop
    ? body.previousStatus === expectation.status
    : body.previousStatus !== expectation.status;
}

export function parseCommercePromotionMutationSuccess(
  value: unknown,
  expectation: PromotionMutationExpectation,
): Record<string, unknown> | null;
export function parseCommercePromotionMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: PromotionMutationExpectation,
): Record<string, unknown> | null;
export function parseCommercePromotionMutationSuccess(
  value: unknown,
  arg2: number | PromotionMutationExpectation,
  arg3?: PromotionMutationExpectation,
): Record<string, unknown> | null {
  const body = record(value);
  if (!body) return null;

  if (typeof arg2 === "number") {
    const expectation = arg3;
    if (!expectation) return null;
    const expectedHttpStatus = expectation.kind === "create" ? 201 : 200;
    if (arg2 !== expectedHttpStatus || !validateBody(body, expectation)) return null;
    return body;
  }

  const generic = parseCommercePaymentMutationSuccess(value);
  if (!generic || generic.code !== "ok" || !validateBody(body, arg2)) return null;
  return body;
}
