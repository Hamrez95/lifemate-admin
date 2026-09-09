import { describe, expect, it } from "vitest";

import { parseCommerceCatalogMutationSuccess } from "./commerce-catalog-v2-mutation-contract";

describe("commerce catalog v2 mutation success contract", () => {
  it("accepts the canonical common success envelope and preserves replay truth", () => {
    expect(
      parseCommerceCatalogMutationSuccess({
        code: "ok",
        replayed: false,
        productId: "11111111-1111-4111-8111-111111111111",
        version: 2,
      }),
    ).toEqual({ code: "ok", replayed: false });

    expect(parseCommerceCatalogMutationSuccess({ code: "ok", replayed: true })).toEqual({
      code: "ok",
      replayed: true,
    });
  });

  it.each([
    null,
    [],
    {},
    { code: "ok" },
    { replayed: false },
    { code: "", replayed: false },
    { code: "ok", replayed: "false" },
  ])("rejects malformed success payload %#", (payload) => {
    expect(parseCommerceCatalogMutationSuccess(payload)).toBeNull();
  });
});
