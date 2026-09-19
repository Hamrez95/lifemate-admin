import { describe, expect, it } from "vitest";

import { parseAccessGrantMutationSuccess } from "./access-grant-mutation-contract";

const GRANT_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_GRANT_ID = "123e4567-e89b-42d3-a456-426614174001";

describe("access grant mutation success contract", () => {
  it("binds extend to exact grant/action/expiry and next version", () => {
    const expiresAtUtc = "2026-10-17T10:00:00.000Z";
    const expected = {
      grantId: GRANT_ID,
      action: "extend",
      expectedVersion: 4,
      expiresAtUtc,
    } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      grantId: GRANT_ID,
      action: "extend",
      status: "Active",
      version: 5,
      expiresAtUtc,
      scopeCount: 3,
      noop: false,
      replayed: false,
    };

    expect(parseAccessGrantMutationSuccess(body, 200, expected)).toEqual({
      version: 5,
      status: "Active",
      expiresAtUtc,
      scopeCount: 3,
      noop: false,
      replayed: false,
    });
    expect(
      parseAccessGrantMutationSuccess(
        { ...body, expiresAtUtc: "2026-10-18T10:00:00.000Z" },
        200,
        expected,
      ),
    ).toBeNull();
    expect(
      parseAccessGrantMutationSuccess({ ...body, noop: true, version: 4 }, 200, expected),
    ).toBeNull();
  });

  it("binds replace-scopes to requested count and noop/version semantics", () => {
    const expected = {
      grantId: GRANT_ID,
      action: "replace-scopes",
      expectedVersion: 8,
      scopes: ["profile.read", "appointments.read"],
    } as const;
    const changed = {
      httpStatus: 200,
      code: "ok",
      grantId: GRANT_ID,
      action: "replace-scopes",
      status: "Active",
      version: 9,
      expiresAtUtc: null,
      scopeCount: 2,
      noop: false,
      replayed: false,
    };

    expect(parseAccessGrantMutationSuccess(changed, 200, expected)?.version).toBe(9);
    expect(
      parseAccessGrantMutationSuccess({ ...changed, version: 8, noop: true }, 200, expected)?.noop,
    ).toBe(true);
    expect(
      parseAccessGrantMutationSuccess({ ...changed, scopeCount: 3 }, 200, expected),
    ).toBeNull();
  });

  it("binds revoke state and supports canonical no-op revoked/expired responses", () => {
    const expected = { grantId: GRANT_ID, action: "revoke", expectedVersion: 2 } as const;
    const changed = {
      httpStatus: 200,
      code: "ok",
      grantId: GRANT_ID,
      action: "revoke",
      status: "Revoked",
      version: 3,
      expiresAtUtc: null,
      scopeCount: 1,
      noop: false,
      replayed: false,
    };

    expect(parseAccessGrantMutationSuccess(changed, 200, expected)?.status).toBe("Revoked");
    expect(
      parseAccessGrantMutationSuccess(
        { ...changed, status: "Expired", version: 2, noop: true, replayed: true },
        200,
        expected,
      )?.replayed,
    ).toBe(true);
    expect(
      parseAccessGrantMutationSuccess({ ...changed, status: "Expired" }, 200, expected),
    ).toBeNull();
  });

  it("fails closed on wrong identity/action/version/envelope", () => {
    const expected = { grantId: GRANT_ID, action: "revoke", expectedVersion: 2 } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      grantId: GRANT_ID,
      action: "revoke",
      status: "Revoked",
      version: 3,
      expiresAtUtc: null,
      scopeCount: 1,
      noop: false,
      replayed: false,
    };

    expect(
      parseAccessGrantMutationSuccess({ ...body, grantId: OTHER_GRANT_ID }, 200, expected),
    ).toBeNull();
    expect(
      parseAccessGrantMutationSuccess({ ...body, action: "extend" }, 200, expected),
    ).toBeNull();
    expect(parseAccessGrantMutationSuccess({ ...body, version: 4 }, 200, expected)).toBeNull();
    expect(
      parseAccessGrantMutationSuccess({ ...body, code: "accepted" }, 200, expected),
    ).toBeNull();
    expect(parseAccessGrantMutationSuccess(body, 201, expected)).toBeNull();
    expect(parseAccessGrantMutationSuccess(null, 200, expected)).toBeNull();
  });
});
