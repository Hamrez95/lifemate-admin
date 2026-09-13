import { describe, expect, it } from "vitest";

import { parseCustomRoleMutationSuccess } from "./custom-role-mutation-contract";

describe("custom role mutation success contract", () => {
  it("accepts canonical create success", () => {
    expect(
      parseCustomRoleMutationSuccess(
        {
          httpStatus: 201,
          code: "ok",
          roleCode: "support_ops",
          displayName: "Support Ops",
          rank: 250,
          status: "Active",
          version: 1,
          replayed: false,
        },
        201,
        {
          kind: "create",
          roleCode: "support_ops",
          displayName: "Support Ops",
          rank: 250,
        },
      ),
    ).toEqual({ replayed: false });
  });

  it("binds update success to requested role fields and next version", () => {
    expect(
      parseCustomRoleMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          roleCode: "support_ops",
          displayName: "Support Operations",
          rank: 260,
          status: "Active",
          version: 4,
          replayed: true,
        },
        200,
        {
          kind: "update",
          roleCode: "support_ops",
          displayName: "Support Operations",
          rank: 260,
          expectedVersion: 3,
        },
      ),
    ).toEqual({ replayed: true });
  });

  it("accepts both changed and noop retirement version semantics", () => {
    expect(
      parseCustomRoleMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          roleCode: "support_ops",
          status: "Disabled",
          version: 6,
          noop: false,
          replayed: false,
        },
        200,
        { kind: "retire", roleCode: "support_ops", expectedVersion: 5 },
      ),
    ).not.toBeNull();

    expect(
      parseCustomRoleMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          roleCode: "support_ops",
          status: "Disabled",
          version: 5,
          noop: true,
          replayed: true,
        },
        200,
        { kind: "retire", roleCode: "support_ops", expectedVersion: 5 },
      ),
    ).toEqual({ replayed: true });
  });

  it("binds permission success to role, permission, action and version", () => {
    expect(
      parseCustomRoleMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          roleCode: "support_ops",
          permissionCode: "support.ticket.write",
          action: "assign",
          version: 8,
          noop: false,
          replayed: false,
        },
        200,
        {
          kind: "permission",
          roleCode: "support_ops",
          permissionCode: "support.ticket.write",
          action: "assign",
          expectedVersion: 7,
        },
      ),
    ).not.toBeNull();
  });

  it.each([
    [
      {
        httpStatus: 200,
        code: "ok",
        roleCode: "support_ops",
        displayName: "Support Ops",
        rank: 250,
        status: "Active",
        version: 1,
        replayed: false,
      },
      200,
      {
        kind: "create",
        roleCode: "support_ops",
        displayName: "Support Ops",
        rank: 250,
      } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        roleCode: "support_ops",
        displayName: "Wrong",
        rank: 260,
        status: "Active",
        version: 4,
        replayed: false,
      },
      200,
      {
        kind: "update",
        roleCode: "support_ops",
        displayName: "Support Operations",
        rank: 260,
        expectedVersion: 3,
      } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        roleCode: "support_ops",
        status: "Disabled",
        version: 7,
        noop: true,
        replayed: false,
      },
      200,
      { kind: "retire", roleCode: "support_ops", expectedVersion: 7 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        roleCode: "support_ops",
        permissionCode: "support.ticket.write",
        action: "revoke",
        version: 8,
        noop: false,
        replayed: false,
      },
      200,
      {
        kind: "permission",
        roleCode: "support_ops",
        permissionCode: "support.ticket.write",
        action: "assign",
        expectedVersion: 7,
      } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        roleCode: "support_ops",
        permissionCode: "support.other",
        action: "assign",
        version: 8,
        noop: false,
        replayed: false,
      },
      200,
      {
        kind: "permission",
        roleCode: "support_ops",
        permissionCode: "support.ticket.write",
        action: "assign",
        expectedVersion: 7,
      } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        roleCode: "support_ops",
        permissionCode: "support.ticket.write",
        action: "assign",
        version: 8,
        noop: false,
        replayed: "false",
      },
      200,
      {
        kind: "permission",
        roleCode: "support_ops",
        permissionCode: "support.ticket.write",
        action: "assign",
        expectedVersion: 7,
      } as const,
    ],
  ])("rejects malformed or misbound custom-role success %#", (value, status, expectation) => {
    expect(parseCustomRoleMutationSuccess(value, status, expectation)).toBeNull();
  });
});
