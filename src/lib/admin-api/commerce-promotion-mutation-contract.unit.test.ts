import { describe, expect, it } from "vitest";

import { parseCommercePromotionMutationSuccess } from "./commerce-promotion-mutation-contract";

const promotionId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";
const discountCodeId = "2ec2634f-95d9-4b0d-9a2a-3f234686c04f";

function legacyBase() {
  return { httpStatus: 200, code: "ok", promotionId, replayed: false };
}

describe("Commerce promotion mutation success contract", () => {
  it("preserves canonical legacy create parsing", () => {
    expect(
      parseCommercePromotionMutationSuccess(
        {
          ...legacyBase(),
          httpStatus: 201,
          discountCodeId,
          promotionStatus: "Draft",
          codeStatus: "Active",
        },
        { kind: "create" },
      ),
    ).not.toBeNull();
  });

  it("validates route create success from outer HTTP", () => {
    const body = {
      promotionId,
      discountCodeId,
      promotionStatus: "Draft",
      codeStatus: "Active",
      replayed: false,
    };

    expect(parseCommercePromotionMutationSuccess(body, 201, { kind: "create" })).toEqual(body);
    expect(parseCommercePromotionMutationSuccess(body, 200, { kind: "create" })).toBeNull();
  });

  it("binds update success to promotion and requested code status", () => {
    const body = {
      promotionId,
      status: "Paused",
      discountCodeId,
      codeStatus: "Disabled",
      replayed: true,
    };
    const expected = {
      kind: "update",
      promotionId,
      codeStatus: "Disabled",
    } as const;

    expect(parseCommercePromotionMutationSuccess(body, 200, expected)).toEqual(body);
    expect(
      parseCommercePromotionMutationSuccess({ ...body, codeStatus: "Active" }, 200, expected),
    ).toBeNull();
    expect(
      parseCommercePromotionMutationSuccess({ ...body, status: "Active" }, 200, expected),
    ).toBeNull();
  });

  it("binds lifecycle success to target and no-op semantics", () => {
    const expected = { kind: "status", promotionId, status: "Active" } as const;

    expect(
      parseCommercePromotionMutationSuccess(
        {
          promotionId,
          previousStatus: "Draft",
          status: "Active",
          noop: false,
          replayed: false,
        },
        200,
        expected,
      ),
    ).not.toBeNull();

    expect(
      parseCommercePromotionMutationSuccess(
        {
          promotionId,
          previousStatus: "Active",
          status: "Active",
          noop: true,
          replayed: true,
        },
        200,
        expected,
      ),
    ).not.toBeNull();

    expect(
      parseCommercePromotionMutationSuccess(
        {
          promotionId,
          previousStatus: "Active",
          status: "Active",
          noop: false,
          replayed: false,
        },
        200,
        expected,
      ),
    ).toBeNull();
  });

  it("fails closed on malformed success payloads", () => {
    expect(parseCommercePromotionMutationSuccess(null, 201, { kind: "create" })).toBeNull();
    expect(
      parseCommercePromotionMutationSuccess(
        {
          promotionId,
          discountCodeId,
          promotionStatus: "Draft",
          codeStatus: "Active",
          replayed: "false",
        },
        201,
        { kind: "create" },
      ),
    ).toBeNull();
  });
});
