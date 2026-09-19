import { describe, expect, it } from "vitest";

import { parseUserAccountActionSuccess } from "./user-actions";

const accountId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";

function suspendSuccess() {
  return {
    httpStatus: 200,
    code: "ok",
    accountId,
    action: "suspend",
    previousStatus: "Active",
    status: "Disabled",
    replayed: false,
  };
}

describe("User 360 account action success contract", () => {
  it("accepts canonical suspend success only as Active to Disabled", () => {
    expect(parseUserAccountActionSuccess(suspendSuccess(), 200, { accountId, action: "suspend" }))
      .toEqual({
        accountId,
        action: "suspend",
        previousStatus: "Active",
        status: "Disabled",
        replayed: false,
      });
  });

  it("accepts canonical restore success only as Disabled to Active", () => {
    const body = {
      ...suspendSuccess(),
      action: "restore",
      previousStatus: "Disabled",
      status: "Active",
      replayed: true,
    };
    expect(parseUserAccountActionSuccess(body, 200, { accountId, action: "restore" })?.replayed)
      .toBe(true);
  });

  it("rejects wrong identity, action, target state or envelope", () => {
    const expected = { accountId, action: "suspend" } as const;
    expect(
      parseUserAccountActionSuccess(
        { ...suspendSuccess(), accountId: "2ec2634f-95d9-4b0d-9a2a-3f234686c04f" },
        200,
        expected,
      ),
    ).toBeNull();
    expect(
      parseUserAccountActionSuccess({ ...suspendSuccess(), action: "restore" }, 200, expected),
    ).toBeNull();
    expect(
      parseUserAccountActionSuccess({ ...suspendSuccess(), status: "Suspended" }, 200, expected),
    ).toBeNull();
    expect(
      parseUserAccountActionSuccess({ ...suspendSuccess(), code: "accepted" }, 200, expected),
    ).toBeNull();
    expect(parseUserAccountActionSuccess(suspendSuccess(), 201, expected)).toBeNull();
  });

  it("rejects malformed successful payloads", () => {
    expect(
      parseUserAccountActionSuccess(
        { ...suspendSuccess(), replayed: "false" },
        200,
        { accountId, action: "suspend" },
      ),
    ).toBeNull();
    expect(
      parseUserAccountActionSuccess(null, 200, { accountId, action: "suspend" }),
    ).toBeNull();
  });
});
