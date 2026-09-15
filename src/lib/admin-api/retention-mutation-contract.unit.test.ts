import { describe, expect, it } from "vitest";

import { parseRetentionMutationSuccess } from "./retention-mutation-contract";

const id = "123e4567-e89b-42d3-a456-426614174000";

describe("retention mutation success contract", () => {
  it("accepts canonical policy activation success", () => {
    expect(
      parseRetentionMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          id,
          dataCategory: "support.tickets",
          purposeCode: "default",
          policyVersion: 3,
          replayed: false,
        },
        200,
        { kind: "policy", dataCategory: "support.tickets", purposeCode: "default" },
      ),
    ).toEqual({ replayed: false });
  });

  it("accepts canonical hold create and release success", () => {
    expect(
      parseRetentionMutationSuccess(
        { httpStatus: 201, code: "ok", id, replayed: false },
        201,
        { kind: "hold-create" },
      ),
    ).toEqual({ replayed: false });

    expect(
      parseRetentionMutationSuccess(
        { httpStatus: 200, code: "ok", id, replayed: true },
        200,
        { kind: "hold-release", holdId: id },
      ),
    ).toEqual({ replayed: true });
  });

  it.each([
    [
      {
        httpStatus: 201,
        code: "ok",
        id,
        dataCategory: "support.tickets",
        purposeCode: "default",
        policyVersion: 3,
        replayed: false,
      },
      201,
      { kind: "policy", dataCategory: "support.tickets", purposeCode: "default" } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        id,
        dataCategory: "wrong.category",
        purposeCode: "default",
        policyVersion: 3,
        replayed: false,
      },
      200,
      { kind: "policy", dataCategory: "support.tickets", purposeCode: "default" } as const,
    ],
    [
      {
        httpStatus: 200,
        code: "ok",
        id,
        dataCategory: "support.tickets",
        purposeCode: "default",
        policyVersion: 0,
        replayed: false,
      },
      200,
      { kind: "policy", dataCategory: "support.tickets", purposeCode: "default" } as const,
    ],
    [
      { httpStatus: 200, code: "ok", id, replayed: false },
      200,
      { kind: "hold-create" } as const,
    ],
    [
      { httpStatus: 200, code: "ok", id: "123e4567-e89b-42d3-a456-426614174001", replayed: false },
      200,
      { kind: "hold-release", holdId: id } as const,
    ],
    [
      { httpStatus: 200, code: "ok", id, replayed: "false" },
      200,
      { kind: "hold-release", holdId: id } as const,
    ],
  ])("rejects malformed or misbound retention success %#", (value, status, expectation) => {
    expect(parseRetentionMutationSuccess(value, status, expectation)).toBeNull();
  });
});
