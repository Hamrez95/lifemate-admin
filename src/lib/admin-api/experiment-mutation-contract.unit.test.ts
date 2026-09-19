import { describe, expect, it } from "vitest";

import { parseExperimentMutationSuccess } from "./experiment-mutation-contract";

describe("experiment mutation success contract", () => {
  it("binds create success to normalized key, Draft state, version 1 and HTTP 201", () => {
    const expected = { kind: "create", experimentKey: "  ONBOARDING.COPY  " } as const;
    const body = {
      httpStatus: 201,
      code: "created",
      experimentKey: "onboarding.copy",
      status: "Draft",
      version: 1,
      replayed: false,
    };

    expect(parseExperimentMutationSuccess(body, 201, expected)).toEqual({
      experimentKey: "onboarding.copy",
      status: "Draft",
      version: 1,
      replayed: false,
    });
    expect(parseExperimentMutationSuccess(body, 200, expected)).toBeNull();
    expect(parseExperimentMutationSuccess({ ...body, version: 2 }, 201, expected)).toBeNull();
    expect(
      parseExperimentMutationSuccess({ ...body, status: "Running" }, 201, expected),
    ).toBeNull();
  });

  it("binds status transition to exact key, requested status and next version", () => {
    const expected = {
      kind: "set-status",
      experimentKey: "onboarding.copy",
      status: "Running",
      expectedVersion: 3,
    } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      experimentKey: "onboarding.copy",
      status: "Running",
      version: 4,
      replayed: true,
    };

    expect(parseExperimentMutationSuccess(body, 200, expected)).toEqual({
      experimentKey: "onboarding.copy",
      status: "Running",
      version: 4,
      replayed: true,
    });
    expect(parseExperimentMutationSuccess({ ...body, status: "Paused" }, 200, expected)).toBeNull();
    expect(parseExperimentMutationSuccess({ ...body, version: 3 }, 200, expected)).toBeNull();
    expect(
      parseExperimentMutationSuccess({ ...body, experimentKey: "other.experiment" }, 200, expected),
    ).toBeNull();
  });

  it("fails closed on wrong envelopes and malformed expectations", () => {
    const expected = {
      kind: "set-status",
      experimentKey: "onboarding.copy",
      status: "Paused",
      expectedVersion: 5,
    } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      experimentKey: "onboarding.copy",
      status: "Paused",
      version: 6,
      replayed: false,
    };

    expect(parseExperimentMutationSuccess({ ...body, code: "accepted" }, 200, expected)).toBeNull();
    expect(
      parseExperimentMutationSuccess({ ...body, replayed: "false" }, 200, expected),
    ).toBeNull();
    expect(parseExperimentMutationSuccess(body, 201, expected)).toBeNull();
    expect(
      parseExperimentMutationSuccess(body, 200, {
        ...expected,
        experimentKey: "invalid key",
      }),
    ).toBeNull();
    expect(parseExperimentMutationSuccess(null, 200, expected)).toBeNull();
  });
});
