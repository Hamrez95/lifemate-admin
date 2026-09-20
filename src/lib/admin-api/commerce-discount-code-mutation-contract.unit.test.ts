import { describe, expect, it } from "vitest";

import {
  parseCommerceDiscountCodeMutationSuccess,
  parseDiscountCodeMutationSuccess,
} from "./commerce-discount-code-mutation-contract";

const PROMOTION_ID = "123e4567-e89b-42d3-a456-426614174000";
const CODE_ID = "123e4567-e89b-42d3-a456-426614174001";
const CODE_ID_2 = "123e4567-e89b-42d3-a456-426614174002";

describe("discount-code mutation success contract", () => {
  it("preserves the server-action parser contract", () => {
    const body = {
      httpStatus: 201,
      code: "ok",
      promotionId: PROMOTION_ID,
      issuedCount: 2,
      items: [
        {
          codeId: CODE_ID,
          code: "WELCOME-10",
          status: "Active",
          maxRedemptions: 5,
          version: 1,
        },
        {
          codeId: CODE_ID_2,
          code: "WELCOME-20",
          status: "Active",
          maxRedemptions: 5,
          version: 1,
        },
      ],
      replayed: false,
    };

    expect(
      parseCommerceDiscountCodeMutationSuccess(body, {
        kind: "issue",
        promotionId: PROMOTION_ID,
        expectedCount: 2,
        explicitCodes: ["WELCOME-10", "WELCOME-20"],
      }),
    ).toEqual(body);
  });

  it("binds explicit issuance to outer HTTP and requested max redemptions", () => {
    const body = {
      httpStatus: 201,
      code: "ok",
      promotionId: PROMOTION_ID,
      issuedCount: 2,
      items: [
        {
          codeId: CODE_ID,
          code: "WELCOME-10",
          status: "Active",
          maxRedemptions: 5,
          version: 1,
        },
        {
          codeId: CODE_ID_2,
          code: "WELCOME-20",
          status: "Active",
          maxRedemptions: 5,
          version: 1,
        },
      ],
      replayed: false,
    };
    const expected = {
      kind: "issue",
      promotionId: PROMOTION_ID,
      codes: [" welcome-10 ", "WELCOME-20"],
      generateCount: null,
      prefix: null,
      maxRedemptions: 5,
    } as const;

    expect(parseDiscountCodeMutationSuccess(body, 201, expected)).toEqual(body);
    expect(parseDiscountCodeMutationSuccess(body, 200, expected)).toBeNull();
    expect(
      parseDiscountCodeMutationSuccess(
        {
          ...body,
          items: [{ ...body.items[0], maxRedemptions: 4 }, body.items[1]],
        },
        201,
        expected,
      ),
    ).toBeNull();
  });

  it("binds generated issuance to requested count and prefix", () => {
    const body = {
      httpStatus: 201,
      code: "ok",
      promotionId: PROMOTION_ID,
      issuedCount: 1,
      items: [
        {
          codeId: CODE_ID,
          code: "FALL-ABC123",
          status: "Active",
          maxRedemptions: null,
          version: 1,
        },
      ],
      replayed: true,
    };
    const expected = {
      kind: "issue",
      promotionId: PROMOTION_ID,
      codes: null,
      generateCount: 1,
      prefix: "FALL",
      maxRedemptions: null,
    } as const;

    expect(parseDiscountCodeMutationSuccess(body, 201, expected)).toEqual(body);
    expect(
      parseDiscountCodeMutationSuccess(
        {
          ...body,
          items: [{ ...body.items[0], code: "OTHER-ABC123" }],
        },
        201,
        expected,
      ),
    ).toBeNull();
  });

  it("binds status mutation to exact target and next version", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      promotionId: PROMOTION_ID,
      codeId: CODE_ID,
      previousStatus: "Active",
      status: "Disabled",
      version: 4,
      noop: false,
      replayed: false,
    };
    const expected = {
      kind: "status",
      promotionId: PROMOTION_ID,
      codeId: CODE_ID,
      status: "Disabled",
      expectedVersion: 3,
    } as const;

    expect(parseDiscountCodeMutationSuccess(body, 200, expected)).toEqual(body);
    expect(parseDiscountCodeMutationSuccess({ ...body, version: 3 }, 200, expected)).toBeNull();
  });

  it("binds canonical no-op without version increment", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      promotionId: PROMOTION_ID,
      codeId: CODE_ID,
      previousStatus: "Disabled",
      status: "Disabled",
      version: 3,
      noop: true,
      replayed: true,
    };

    expect(
      parseDiscountCodeMutationSuccess(body, 200, {
        kind: "status",
        promotionId: PROMOTION_ID,
        codeId: CODE_ID,
        status: "Disabled",
        expectedVersion: 3,
      }),
    ).toEqual(body);
  });
});
