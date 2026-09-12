import { describe, expect, it } from "vitest";

import { parseUserAccountActionSuccess } from "./user-actions";

const accountId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";

function successBody() {
  return {
    accountId,
    action: "suspend",
    previousStatus: "Active",
    status: "Suspended",
    replayed: false,
  };
}

describe("User 360 account action success contract", () => {
  it("accepts a success envelope bound to the requested account and action", () => {
    expect(parseUserAccountActionSuccess(successBody(), { accountId, action: "suspend" })).toEqual(
      successBody(),
    );
  });

  it("rejects a success envelope for a different account", () => {
    expect(
      parseUserAccountActionSuccess(
        { ...successBody(), accountId: "2ec2634f-95d9-4b0d-9a2a-3f234686c04f" },
        { accountId, action: "suspend" },
      ),
    ).toBeNull();
  });

  it("rejects a success envelope for a different action", () => {
    expect(
      parseUserAccountActionSuccess(
        { ...successBody(), action: "restore" },
        { accountId, action: "suspend" },
      ),
    ).toBeNull();
  });

  it("rejects malformed successful payloads", () => {
    expect(
      parseUserAccountActionSuccess(
        { ...successBody(), replayed: "false" },
        { accountId, action: "suspend" },
      ),
    ).toBeNull();
  });
});
