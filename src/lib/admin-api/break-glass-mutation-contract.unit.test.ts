import { describe, expect, it } from "vitest";

import { parseBreakGlassMutationSuccess } from "./break-glass-mutation-contract";

const requestId = "123e4567-e89b-42d3-a456-426614174000";

describe("break-glass mutation success contract", () => {
  it("accepts canonical create success", () => {
    expect(
      parseBreakGlassMutationSuccess(
        {
          httpStatus: 201,
          code: "ok",
          requestId,
          status: "Pending",
          version: 1,
          replayed: false,
        },
        201,
        { kind: "create" },
      ),
    ).toEqual({ requestId, status: "Pending", version: 1, replayed: false });
  });

  it.each([
    ["approve", "Approved", "2026-09-15T08:00:00.000Z"],
    ["deny", "Denied", null],
    ["revoke", "Revoked", null],
  ] as const)("accepts canonical %s success", (action, status, expiresAtUtc) => {
    expect(
      parseBreakGlassMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          requestId,
          action,
          status,
          version: 4,
          expiresAtUtc,
          replayed: true,
        },
        200,
        { kind: "action", requestId, action, expectedVersion: 3 },
      ),
    ).toEqual({ requestId, status, version: 4, replayed: true });
  });

  it.each([
    [
      {
        httpStatus: 200,
        code: "ok",
        requestId,
        status: "Pending",
        version: 1,
        replayed: false,
      },
      200,
      { kind: "create" } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        requestId: "123e4567-e89b-42d3-a456-426614174001",
        action: "approve",
        status: "Approved",
        version: 4,
        expiresAtUtc: "2026-09-15T08:00:00.000Z",
        replayed: false,
      },
      200,
      { kind: "action", requestId, action: "approve", expectedVersion: 3 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        requestId,
        action: "deny",
        status: "Denied",
        version: 4,
        expiresAtUtc: null,
        replayed: false,
      },
      200,
      { kind: "action", requestId, action: "approve", expectedVersion: 3 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        requestId,
        action: "approve",
        status: "Denied",
        version: 4,
        expiresAtUtc: "2026-09-15T08:00:00.000Z",
        replayed: false,
      },
      200,
      { kind: "action", requestId, action: "approve", expectedVersion: 3 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        requestId,
        action: "approve",
        status: "Approved",
        version: 3,
        expiresAtUtc: "2026-09-15T08:00:00.000Z",
        replayed: false,
      },
      200,
      { kind: "action", requestId, action: "approve", expectedVersion: 3 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        requestId,
        action: "approve",
        status: "Approved",
        version: 4,
        expiresAtUtc: null,
        replayed: false,
      },
      200,
      { kind: "action", requestId, action: "approve", expectedVersion: 3 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        requestId,
        action: "revoke",
        status: "Revoked",
        version: 4,
        expiresAtUtc: "2026-09-15T08:00:00.000Z",
        replayed: false,
      },
      200,
      { kind: "action", requestId, action: "revoke", expectedVersion: 3 } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        requestId,
        action: "approve",
        status: "Approved",
        version: 4,
        expiresAtUtc: "2026-09-15T08:00:00.000Z",
        replayed: "false",
      },
      200,
      { kind: "action", requestId, action: "approve", expectedVersion: 3 } as const,
    ],
  ])("rejects malformed or misbound success %#", (value, status, expectation) => {
    expect(parseBreakGlassMutationSuccess(value, status, expectation)).toBeNull();
  });
});
