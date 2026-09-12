import { describe, expect, it } from "vitest";

import { parseGiftTestFinalizeSuccess } from "./commerce-gift-test-finalize-contract";

const giftIntentId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";

function successBody() {
  return {
    httpStatus: 200,
    code: "ok",
    giftIntentId,
    status: "PendingClaim",
    replayed: false,
  };
}

describe("Gift test finalize success contract", () => {
  it("accepts canonical success bound to the requested gift", () => {
    expect(parseGiftTestFinalizeSuccess(successBody(), giftIntentId)).toEqual({
      giftIntentId,
      status: "PendingClaim",
      replayed: false,
    });
  });

  it("accepts canonical idempotent replay", () => {
    expect(
      parseGiftTestFinalizeSuccess(
        { ...successBody(), status: "Claimed", replayed: true },
        giftIntentId,
      ),
    ).toEqual({ giftIntentId, status: "Claimed", replayed: true });
  });

  it("rejects success for another gift intent", () => {
    expect(
      parseGiftTestFinalizeSuccess(
        { ...successBody(), giftIntentId: "2ec2634f-95d9-4b0d-9a2a-3f234686c04f" },
        giftIntentId,
      ),
    ).toBeNull();
  });

  it.each([
    null,
    {},
    { httpStatus: 200, code: "ok", giftIntentId, status: "PendingClaim" },
    { ...successBody(), code: "unexpected" },
    { ...successBody(), status: "" },
    { ...successBody(), replayed: "false" },
  ])("rejects malformed successful payload %#", (value) => {
    expect(parseGiftTestFinalizeSuccess(value, giftIntentId)).toBeNull();
  });
});
