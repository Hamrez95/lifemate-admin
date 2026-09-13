import { parseCommercePaymentMutationSuccess } from "./commerce-payment-mutation-contract";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;

export type DiscountCodeMutationExpectation =
  | {
      kind: "issue";
      promotionId: string;
      expectedCount: number;
      explicitCodes: string[] | null;
    }
  | {
      kind: "status";
      promotionId: string;
      codeId: string;
      status: "Active" | "Disabled";
      expectedVersion: number;
    };

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameUuid(value: unknown, expected: string): value is string {
  return (
    typeof value === "string" && UUID.test(value) && value.toLowerCase() === expected.toLowerCase()
  );
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function parseIssuedItem(value: unknown): Record<string, unknown> | null {
  const item = record(value);
  if (!item) return null;
  if (typeof item.codeId !== "string" || !UUID.test(item.codeId)) return null;
  if (typeof item.code !== "string" || !CODE.test(item.code)) return null;
  if (item.status !== "Active") return null;
  if (!(item.maxRedemptions === null || positiveInteger(item.maxRedemptions))) return null;
  if (!positiveInteger(item.version)) return null;
  return item;
}

export function parseCommerceDiscountCodeMutationSuccess(
  value: unknown,
  expectation: DiscountCodeMutationExpectation,
): Record<string, unknown> | null {
  const generic = parseCommercePaymentMutationSuccess(value);
  const body = record(value);
  if (!generic || generic.code !== "ok" || !body) return null;
  if (!sameUuid(body.promotionId, expectation.promotionId)) return null;

  if (expectation.kind === "issue") {
    if (
      !Number.isSafeInteger(body.issuedCount) ||
      Number(body.issuedCount) !== expectation.expectedCount ||
      expectation.expectedCount < 1 ||
      expectation.expectedCount > 50 ||
      !Array.isArray(body.items) ||
      body.items.length !== expectation.expectedCount
    ) {
      return null;
    }

    const items = body.items.map(parseIssuedItem);
    if (items.some((item) => item === null)) return null;
    const validItems = items as Record<string, unknown>[];
    const codes = validItems.map((item) => item.code as string);
    const codeIds = validItems.map((item) => (item.codeId as string).toLowerCase());
    if (new Set(codes).size !== codes.length || new Set(codeIds).size !== codeIds.length)
      return null;

    if (expectation.explicitCodes) {
      const expected = [...expectation.explicitCodes].map((code) => code.toUpperCase()).sort();
      const actual = [...codes].sort();
      if (
        expected.length !== actual.length ||
        expected.some((code, index) => code !== actual[index])
      ) {
        return null;
      }
    }
  } else {
    if (!sameUuid(body.codeId, expectation.codeId)) return null;
    if (body.status !== expectation.status) return null;
    if (body.previousStatus !== "Active" && body.previousStatus !== "Disabled") return null;
    if (typeof body.noop !== "boolean" || !positiveInteger(body.version)) return null;

    const version = Number(body.version);
    if (body.noop) {
      if (body.previousStatus !== expectation.status || version !== expectation.expectedVersion)
        return null;
    } else if (
      body.previousStatus === expectation.status ||
      version !== expectation.expectedVersion + 1
    ) {
      return null;
    }
  }

  return body;
}
