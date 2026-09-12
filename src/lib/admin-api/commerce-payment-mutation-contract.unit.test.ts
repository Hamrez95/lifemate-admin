import { describe, expect, it } from "vitest";

import { parseCommercePaymentMutationSuccess } from "./commerce-payment-mutation-contract";

describe("Commerce payment mutation success contract", () => {
  it("accepts a canonical success envelope", () => {
    expect(
      parseCommercePaymentMutationSuccess({
        httpStatus: 201,
        code: "ok",
        replayed: false,
        refundRequestId: "8b82f871-baa2-4ee7-9849-ce20882fd67c",
      }),
    ).toEqual({ code: "ok", replayed: false });
  });

  it("preserves replay and optional message", () => {
    expect(
      parseCommercePaymentMutationSuccess({
        httpStatus: 200,
        code: "ok",
        replayed: true,
        message: "already completed",
      }),
    ).toEqual({ code: "ok", replayed: true, message: "already completed" });
  });

  it.each([
    null,
    [],
    {},
    { httpStatus: 201, code: "ok" },
    { httpStatus: 201, code: "ok", replayed: "false" },
    { httpStatus: 500, code: "ok", replayed: false },
    { httpStatus: 201, code: "", replayed: false },
    { httpStatus: 201, code: "ok", replayed: false, message: 12 },
  ])("rejects malformed successful payload %#", (value) => {
    expect(parseCommercePaymentMutationSuccess(value)).toBeNull();
  });
});
