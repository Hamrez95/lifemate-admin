import { describe, expect, it } from "vitest";

import {
  classifyEntitlementConflict,
  classifyEntitlementForbidden,
  parseEntitlementAdjustmentSuccess,
} from "@/src/lib/admin-api/entitlement-adjustments-contract";

describe("manual entitlement adjustment contract", () => {
  it("accepts only explicit successful canonical envelopes", () => {
    expect(
      parseEntitlementAdjustmentSuccess({
        httpStatus: 200,
        code: "ok",
        adjustmentId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toMatchObject({ httpStatus: 200, code: "ok" });
    expect(parseEntitlementAdjustmentSuccess({ code: "ok" })).toBeNull();
    expect(parseEntitlementAdjustmentSuccess({ httpStatus: 409, code: "ok" })).toBeNull();
    expect(parseEntitlementAdjustmentSuccess({ httpStatus: 200 })).toBeNull();
    expect(parseEntitlementAdjustmentSuccess([])).toBeNull();
  });

  it("distinguishes stale state, approval and idempotency conflicts", () => {
    expect(classifyEntitlementConflict("idempotency_conflict")).toBe("idempotency");
    expect(classifyEntitlementConflict("entitlement_version_conflict")).toBe("entitlement_version");
    expect(classifyEntitlementConflict("entitlement_adjust_approval_required")).toBe(
      "approval_required",
    );
    expect(classifyEntitlementConflict("entitlement_adjust_approval_policy_mismatch")).toBe(
      "approval_policy",
    );
    expect(classifyEntitlementConflict("entitlement_adjustment_conflict")).toBe("state_changed");
    expect(classifyEntitlementConflict("future_conflict_code")).toBe("other");
  });

  it("distinguishes AAL2, abuse and permission denials", () => {
    expect(classifyEntitlementForbidden("assurance_level_2_required")).toBe("aal2_required");
    expect(classifyEntitlementForbidden("entitlement_adjust_abuse_denied")).toBe("abuse_denied");
    expect(classifyEntitlementForbidden("entitlement_adjust_permission_denied")).toBe(
      "permission_denied",
    );
    expect(classifyEntitlementForbidden("future_forbidden_code")).toBe("other");
  });
});
