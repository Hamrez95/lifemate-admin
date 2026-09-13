import { parseCommercePaymentMutationSuccess } from "./commerce-payment-mutation-contract";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PromotionMutationExpectation =
  | { kind: "create" }
  | { kind: "update"; promotionId: string }
  | { kind: "status"; promotionId: string; status: "Active" | "Paused" };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function uuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function parseCommercePromotionMutationSuccess(
  value: unknown,
  expectation: PromotionMutationExpectation,
): Record<string, unknown> | null {
  const generic = parseCommercePaymentMutationSuccess(value);
  const body = record(value);
  if (!generic || generic.code !== "ok" || !body || !uuid(body.promotionId)) return null;

  if (expectation.kind !== "create" && body.promotionId !== expectation.promotionId) return null;

  if (expectation.kind === "create") {
    if (!uuid(body.discountCodeId)) return null;
    if (body.promotionStatus !== "Draft" || body.codeStatus !== "Active") return null;
  } else if (expectation.kind === "update") {
    if (!uuid(body.discountCodeId)) return null;
    if (body.status !== "Draft" && body.status !== "Paused") return null;
    if (body.codeStatus !== "Active" && body.codeStatus !== "Disabled") return null;
  } else {
    if (body.status !== expectation.status) return null;
    if (typeof body.previousStatus !== "string" || body.previousStatus.length === 0) return null;
    if (typeof body.noop !== "boolean") return null;
  }

  return body;
}
