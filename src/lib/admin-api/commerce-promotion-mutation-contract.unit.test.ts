import { describe, expect, it } from "vitest";

import { parseCommercePromotionMutationSuccess } from "./commerce-promotion-mutation-contract";

const promotionId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";
const discountCodeId = "2ec2634f-95d9-4b0d-9a2a-3f234686c04f";

function base() {
  return { httpStatus: 200, code: "ok", promotionId, replayed: false };
}

describe("Commerce promotion mutation success contract", () => {
  it("accepts canonical create success", () => {
    expect(
      parseCommercePromotionMutationSuccess(
        {
          ...base(),
          httpStatus: 201,
          discountCodeId,
          promotionStatus: "Draft",
          codeStatus: "Active",
        },
        { kind: "create" },
      ),
    ).not.toBeNull();
  });

  it("binds update success to the requested promotion", () => {
    expect(
      parseCommercePromotionMutationSuccess(
        { ...base(), discountCodeId, status: "Paused", codeStatus: "Disabled" },
        { kind: "update", promotionId },
      ),
    ).not.toBeNull();
    expect(
      parseCommercePromotionMutationSuccess(
        {
          ...base(),
          promotionId: "305927da-bc3f-4d83-a38b-ab3250c39a26",
          discountCodeId,
          status: "Paused",
          codeStatus: "Disabled",
        },
        { kind: "update", promotionId },
      ),
    ).toBeNull();
  });

  it("binds lifecycle success to the requested promotion and target status", () => {
    expect(
      parseCommercePromotionMutationSuccess(
        { ...base(), previousStatus: "Draft", status: "Active", noop: false },
        { kind: "status", promotionId, status: "Active" },
      ),
    ).not.toBeNull();
    expect(
      parseCommercePromotionMutationSuccess(
        { ...base(), previousStatus: "Active", status: "Paused", noop: false },
        { kind: "status", promotionId, status: "Active" },
      ),
    ).toBeNull();
  });

  it.each([
    null,
    {},
    { ...base(), replayed: "false" },
    {
      ...base(),
      code: "unexpected",
      discountCodeId,
      promotionStatus: "Draft",
      codeStatus: "Active",
    },
    { ...base(), discountCodeId: "bad", promotionStatus: "Draft", codeStatus: "Active" },
  ])("rejects malformed create success %#", (value) => {
    expect(parseCommercePromotionMutationSuccess(value, { kind: "create" })).toBeNull();
  });
});
