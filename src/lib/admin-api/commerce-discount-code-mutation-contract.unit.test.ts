import { describe, expect, it } from "vitest";

import { parseCommerceDiscountCodeMutationSuccess } from "./commerce-discount-code-mutation-contract";

const promotionId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";
const codeId = "2ec2634f-95d9-4b0d-9a2a-3f234686c04f";
const secondCodeId = "305927da-bc3f-4d83-a38b-ab3250c39a26";

function base() {
  return { httpStatus: 200, code: "ok", promotionId, replayed: false };
}

function item(id: string, code: string) {
  return { codeId: id, code, status: "Active", maxRedemptions: null, version: 1 };
}

describe("Commerce discount-code mutation success contract", () => {
  it("accepts canonical explicit issuance bound to the requested promotion and codes", () => {
    expect(
      parseCommerceDiscountCodeMutationSuccess(
        {
          ...base(),
          httpStatus: 201,
          issuedCount: 2,
          items: [item(codeId, "SAVE10"), item(secondCodeId, "SAVE20")],
        },
        {
          kind: "issue",
          promotionId,
          expectedCount: 2,
          explicitCodes: ["SAVE20", "SAVE10"],
        },
      ),
    ).not.toBeNull();
  });

  it("accepts generated issuance when count and item contracts match", () => {
    expect(
      parseCommerceDiscountCodeMutationSuccess(
        {
          ...base(),
          httpStatus: 201,
          issuedCount: 1,
          items: [item(codeId, "VIP-ABC123")],
        },
        { kind: "issue", promotionId, expectedCount: 1, explicitCodes: null },
      ),
    ).not.toBeNull();
  });

  it("rejects issuance for another promotion or a mismatched code set/count", () => {
    const success = {
      ...base(),
      httpStatus: 201,
      issuedCount: 1,
      items: [item(codeId, "SAVE10")],
    };
    expect(
      parseCommerceDiscountCodeMutationSuccess(
        { ...success, promotionId: "4b1ccefa-618d-4caf-8b03-e607f7437dfa" },
        { kind: "issue", promotionId, expectedCount: 1, explicitCodes: ["SAVE10"] },
      ),
    ).toBeNull();
    expect(
      parseCommerceDiscountCodeMutationSuccess(success, {
        kind: "issue",
        promotionId,
        expectedCount: 1,
        explicitCodes: ["OTHER10"],
      }),
    ).toBeNull();
    expect(
      parseCommerceDiscountCodeMutationSuccess(success, {
        kind: "issue",
        promotionId,
        expectedCount: 2,
        explicitCodes: null,
      }),
    ).toBeNull();
  });

  it("accepts canonical status change and no-op version semantics", () => {
    expect(
      parseCommerceDiscountCodeMutationSuccess(
        {
          ...base(),
          codeId,
          previousStatus: "Active",
          status: "Disabled",
          version: 4,
          noop: false,
        },
        { kind: "status", promotionId, codeId, status: "Disabled", expectedVersion: 3 },
      ),
    ).not.toBeNull();
    expect(
      parseCommerceDiscountCodeMutationSuccess(
        {
          ...base(),
          codeId,
          previousStatus: "Disabled",
          status: "Disabled",
          version: 4,
          noop: true,
        },
        { kind: "status", promotionId, codeId, status: "Disabled", expectedVersion: 4 },
      ),
    ).not.toBeNull();
  });

  it.each([
    { ...base(), codeId, previousStatus: "Active", status: "Disabled", version: 3, noop: false },
    { ...base(), codeId, previousStatus: "Disabled", status: "Disabled", version: 5, noop: true },
    {
      ...base(),
      codeId: secondCodeId,
      previousStatus: "Active",
      status: "Disabled",
      version: 4,
      noop: false,
    },
    { ...base(), codeId, previousStatus: "Active", status: "Active", version: 4, noop: false },
    {
      ...base(),
      codeId,
      previousStatus: "Active",
      status: "Disabled",
      version: 4,
      noop: false,
      replayed: "false",
    },
  ])("rejects malformed or misbound status success %#", (value) => {
    expect(
      parseCommerceDiscountCodeMutationSuccess(value, {
        kind: "status",
        promotionId,
        codeId,
        status: "Disabled",
        expectedVersion: 3,
      }),
    ).toBeNull();
  });
});
