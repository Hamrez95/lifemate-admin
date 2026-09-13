import { describe, expect, it } from "vitest";

import { parseStaffMutationSuccess } from "./staff-action-mutation-contract";

const accountId = "123e4567-e89b-42d3-a456-426614174000";
const otherAccountId = "305927da-bc3f-4d83-a38b-ab3250c39a26";

describe("staff mutation success contract", () => {
  it("accepts canonical membership activation without a synthetic action field", () => {
    expect(
      parseStaffMutationSuccess(
        {
          httpStatus: 201,
          code: "ok",
          accountId,
          previousStatus: null,
          status: "Active",
          noop: false,
          replayed: false,
        },
        201,
        { accountId, action: "activate", roleCode: null },
      ),
    ).toEqual({
      accountId,
      action: "activate",
      roleCode: null,
      status: "Active",
      previousStatus: null,
      noop: false,
      replayed: false,
    });
  });

  it("binds membership success to the requested target state", () => {
    expect(
      parseStaffMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          accountId,
          previousStatus: "Active",
          status: "Disabled",
          noop: false,
          replayed: true,
        },
        200,
        { accountId, action: "disable", roleCode: null },
      ),
    ).not.toBeNull();

    expect(
      parseStaffMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          accountId,
          previousStatus: "Active",
          status: "Active",
          noop: false,
          replayed: false,
        },
        200,
        { accountId, action: "disable", roleCode: null },
      ),
    ).toBeNull();
  });

  it("binds role success to account, action and role", () => {
    expect(
      parseStaffMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          accountId,
          roleCode: "support",
          action: "assign",
          noop: false,
          replayed: false,
        },
        200,
        { accountId, action: "assign", roleCode: "support" },
      ),
    ).toEqual({
      accountId,
      action: "assign",
      roleCode: "support",
      status: null,
      previousStatus: null,
      noop: false,
      replayed: false,
    });
  });

  it.each([
    [
      {
        httpStatus: 200,
        code: "ok",
        accountId: otherAccountId,
        roleCode: "support",
        action: "assign",
        noop: false,
        replayed: false,
      },
      200,
      { accountId, action: "assign", roleCode: "support" } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        accountId,
        roleCode: "support",
        action: "revoke",
        noop: false,
        replayed: false,
      },
      200,
      { accountId, action: "assign", roleCode: "support" } as const,
    ],
    [
      {
        httpStatus: 201,
        code: "ok",
        accountId,
        roleCode: "support",
        action: "assign",
        noop: false,
        replayed: false,
      },
      201,
      { accountId, action: "assign", roleCode: "support" } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        accountId,
        previousStatus: "Active",
        status: "Disabled",
        noop: false,
        replayed: "false",
      },
      200,
      { accountId, action: "disable", roleCode: null } as const,
    ],
  ])("rejects malformed or misbound staff success %#", (value, status, expectation) => {
    expect(parseStaffMutationSuccess(value, status, expectation)).toBeNull();
  });
});
