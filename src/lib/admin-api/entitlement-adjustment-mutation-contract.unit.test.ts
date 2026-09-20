import { describe, expect, it } from "vitest";

import { parseEntitlementAdjustmentMutationSuccess } from "./entitlement-adjustment-mutation-contract";

const ACCOUNT_ID = "123e4567-e89b-42d3-a456-426614174000";
const TARGET_ID = "123e4567-e89b-42d3-a456-426614174001";
const ENTITLEMENT_ID = "123e4567-e89b-42d3-a456-426614174002";
const APPROVAL_ID = "123e4567-e89b-42d3-a456-426614174003";
const ADJUSTMENT_ID = "123e4567-e89b-42d3-a456-426614174004";

const baseInput = {
  subjectAccountId: ACCOUNT_ID,
  targetType: "Product",
  targetId: TARGET_ID,
  entitlementId: ENTITLEMENT_ID,
  expectedEntitlementVersion: 3,
  operation: "Extend",
  scheduleMode: "AddDays",
  scheduleAmount: 30,
  exactExpiresAtUtc: null,
  referenceAtUtc: "2026-09-19T12:00:00.000Z",
  reason: "  approved support correction  ",
  confirmed: false,
  approvalRequestId: APPROVAL_ID,
  approvalExpectedVersion: 2,
} as const;

const normalized = {
  ...baseInput,
  reason: "approved support correction",
};

describe("manual entitlement mutation success contract", () => {
  it("binds preview success to the exact normalized request and delta", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      before: { entitlementId: ENTITLEMENT_ID },
      delta: {
        operation: "Extend",
        targetType: "Product",
        targetId: TARGET_ID,
        scheduleMode: "AddDays",
        scheduleAmount: 30,
        exactExpiresAtUtc: null,
        referenceAtUtc: "2026-09-19T12:00:00.000Z",
      },
      after: { entitlementId: ENTITLEMENT_ID, status: "Active", version: 4 },
      normalized,
    };

    expect(
      parseEntitlementAdjustmentMutationSuccess(body, 200, {
        kind: "preview",
        input: baseInput,
      }),
    ).toEqual(body);
    expect(
      parseEntitlementAdjustmentMutationSuccess(
        { ...body, normalized: { ...normalized, targetId: ACCOUNT_ID } },
        200,
        { kind: "preview", input: baseInput },
      ),
    ).toBeNull();
  });

  it("binds approval request success to Pending version 1 and normalized request", () => {
    const body = {
      httpStatus: 201,
      code: "ok",
      id: APPROVAL_ID,
      requestType: "manual_entitlement_adjustment",
      status: "Pending",
      version: 1,
      expiresAtUtc: "2026-09-19T13:00:00.000Z",
      replayed: false,
      normalized,
    };

    expect(
      parseEntitlementAdjustmentMutationSuccess(body, 201, {
        kind: "request",
        input: baseInput,
      }),
    ).toEqual(body);
    expect(
      parseEntitlementAdjustmentMutationSuccess({ ...body, status: "Approved" }, 201, {
        kind: "request",
        input: baseInput,
      }),
    ).toBeNull();
    expect(
      parseEntitlementAdjustmentMutationSuccess(body, 200, {
        kind: "request",
        input: baseInput,
      }),
    ).toBeNull();
  });

  it("binds non-grant execute success to exact operation and entitlement version", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      adjustmentId: ADJUSTMENT_ID,
      operation: "Extend",
      affectedEntitlementIds: [ENTITLEMENT_ID],
      before: { entitlementId: ENTITLEMENT_ID, version: 3 },
      after: { entitlementId: ENTITLEMENT_ID, status: "Active", version: 4 },
      abuseDecisionId: APPROVAL_ID,
      replayed: false,
    };

    expect(
      parseEntitlementAdjustmentMutationSuccess(body, 200, {
        kind: "execute",
        input: baseInput,
      }),
    ).toEqual(body);
    expect(
      parseEntitlementAdjustmentMutationSuccess(
        { ...body, affectedEntitlementIds: [TARGET_ID] },
        200,
        { kind: "execute", input: baseInput },
      ),
    ).toBeNull();
    expect(
      parseEntitlementAdjustmentMutationSuccess(
        { ...body, after: { ...body.after, version: 3 } },
        200,
        { kind: "execute", input: baseInput },
      ),
    ).toBeNull();
  });

  it("binds grant execute success to subject/target and active state", () => {
    const grantInput = {
      ...baseInput,
      entitlementId: null,
      expectedEntitlementVersion: null,
      operation: "Grant",
      approvalRequestId: null,
      approvalExpectedVersion: null,
    } as const;
    const newEntitlementId = "123e4567-e89b-42d3-a456-426614174005";
    const body = {
      httpStatus: 200,
      code: "ok",
      adjustmentId: ADJUSTMENT_ID,
      operation: "Grant",
      affectedEntitlementIds: [newEntitlementId],
      before: {
        subjectAccountId: ACCOUNT_ID,
        targetType: "Product",
        targetId: TARGET_ID,
        entitlementId: null,
      },
      after: { status: "Active", affectedEntitlementIds: [newEntitlementId] },
      replayed: true,
    };

    expect(
      parseEntitlementAdjustmentMutationSuccess(body, 200, {
        kind: "execute",
        input: grantInput,
      }),
    ).toEqual(body);
    expect(
      parseEntitlementAdjustmentMutationSuccess(
        { ...body, before: { ...body.before, targetId: ACCOUNT_ID } },
        200,
        { kind: "execute", input: grantInput },
      ),
    ).toBeNull();
  });

  it("fails closed on malformed envelopes", () => {
    expect(
      parseEntitlementAdjustmentMutationSuccess(null, 200, {
        kind: "execute",
        input: baseInput,
      }),
    ).toBeNull();
    expect(
      parseEntitlementAdjustmentMutationSuccess(
        {
          httpStatus: 200,
          code: "accepted",
          adjustmentId: ADJUSTMENT_ID,
          operation: "Extend",
          affectedEntitlementIds: [ENTITLEMENT_ID],
          before: {},
          after: { entitlementId: ENTITLEMENT_ID, status: "Active", version: 4 },
          replayed: false,
        },
        200,
        { kind: "execute", input: baseInput },
      ),
    ).toBeNull();
  });
});
