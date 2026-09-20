import type { EntitlementAdjustmentSuccess } from "./entitlement-adjustments-contract";

export type EntitlementAdjustmentMutationInput = {
  subjectAccountId: string;
  targetType: "Product" | "Offer";
  targetId: string;
  entitlementId: string | null;
  expectedEntitlementVersion: number | null;
  operation: "Grant" | "Extend" | "Reduce" | "Revoke";
  scheduleMode: "ExactExpiry" | "AddDays" | "AddMonths" | "Immediate";
  scheduleAmount: number | null;
  exactExpiresAtUtc: string | null;
  referenceAtUtc: string;
  reason: string;
  confirmed: boolean;
  approvalRequestId: string | null;
  approvalExpectedVersion: number | null;
};

export type EntitlementAdjustmentMutationExpectation = {
  kind: "preview" | "request" | "execute";
  input: EntitlementAdjustmentMutationInput;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function sameNullableUuid(value: unknown, expected: string | null): boolean {
  return expected === null ? value === null : sameUuid(value, expected);
}

function normalizedInstant(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function sameNullableInstant(value: unknown, expected: string | null): boolean {
  if (expected === null) return value === null;
  return normalizedInstant(value) === normalizedInstant(expected);
}

function normalizedMatches(value: unknown, expected: EntitlementAdjustmentMutationInput): boolean {
  const item = record(value);
  if (!item) return false;

  return (
    sameUuid(item.subjectAccountId, expected.subjectAccountId) &&
    item.targetType === expected.targetType &&
    sameUuid(item.targetId, expected.targetId) &&
    sameNullableUuid(item.entitlementId, expected.entitlementId) &&
    item.expectedEntitlementVersion === expected.expectedEntitlementVersion &&
    item.operation === expected.operation &&
    item.scheduleMode === expected.scheduleMode &&
    item.scheduleAmount === expected.scheduleAmount &&
    sameNullableInstant(item.exactExpiresAtUtc, expected.exactExpiresAtUtc) &&
    normalizedInstant(item.referenceAtUtc) === normalizedInstant(expected.referenceAtUtc) &&
    item.reason === expected.reason.trim() &&
    item.confirmed === expected.confirmed &&
    sameNullableUuid(item.approvalRequestId, expected.approvalRequestId) &&
    item.approvalExpectedVersion === expected.approvalExpectedVersion
  );
}

function validAffectedIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && UUID.test(item))
  );
}

export function parseEntitlementAdjustmentMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: EntitlementAdjustmentMutationExpectation,
): EntitlementAdjustmentSuccess | null {
  const body = record(value);
  if (!body) return null;

  if (expected.kind === "preview") {
    const before = record(body.before);
    const delta = record(body.delta);
    const after = record(body.after);
    if (
      httpStatus !== 200 ||
      body.httpStatus !== 200 ||
      body.code !== "ok" ||
      !before ||
      !delta ||
      !after ||
      !normalizedMatches(body.normalized, expected.input) ||
      delta.operation !== expected.input.operation ||
      delta.targetType !== expected.input.targetType ||
      !sameUuid(delta.targetId, expected.input.targetId) ||
      delta.scheduleMode !== expected.input.scheduleMode ||
      delta.scheduleAmount !== expected.input.scheduleAmount ||
      !sameNullableInstant(delta.exactExpiresAtUtc, expected.input.exactExpiresAtUtc) ||
      normalizedInstant(delta.referenceAtUtc) !== normalizedInstant(expected.input.referenceAtUtc)
    ) {
      return null;
    }
    return body as EntitlementAdjustmentSuccess;
  }

  if (expected.kind === "request") {
    if (
      httpStatus !== 201 ||
      body.httpStatus !== 201 ||
      body.code !== "ok" ||
      typeof body.id !== "string" ||
      !UUID.test(body.id) ||
      body.requestType !== "manual_entitlement_adjustment" ||
      body.status !== "Pending" ||
      body.version !== 1 ||
      normalizedInstant(body.expiresAtUtc) === null ||
      typeof body.replayed !== "boolean" ||
      !normalizedMatches(body.normalized, expected.input)
    ) {
      return null;
    }
    return body as EntitlementAdjustmentSuccess;
  }

  const before = record(body.before);
  const after = record(body.after);
  if (
    httpStatus !== 200 ||
    body.httpStatus !== 200 ||
    body.code !== "ok" ||
    typeof body.adjustmentId !== "string" ||
    !UUID.test(body.adjustmentId) ||
    body.operation !== expected.input.operation ||
    !validAffectedIds(body.affectedEntitlementIds) ||
    !before ||
    !after ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  const affected = body.affectedEntitlementIds as string[];
  if (expected.input.operation === "Grant") {
    if (
      before.subjectAccountId !== expected.input.subjectAccountId ||
      before.targetType !== expected.input.targetType ||
      !sameUuid(before.targetId, expected.input.targetId) ||
      before.entitlementId !== null ||
      after.status !== "Active"
    ) {
      return null;
    }
  } else {
    if (
      expected.input.entitlementId === null ||
      affected.length !== 1 ||
      !sameUuid(affected[0], expected.input.entitlementId) ||
      !sameUuid(after.entitlementId, expected.input.entitlementId) ||
      after.status !== (expected.input.operation === "Revoke" ? "Revoked" : "Active") ||
      !Number.isSafeInteger(after.version) ||
      after.version !== Number(expected.input.expectedEntitlementVersion) + 1
    ) {
      return null;
    }
  }

  return body as EntitlementAdjustmentSuccess;
}
