import { describe, expect, it } from "vitest";

import { parseCommercePlanFeatureMutationSuccess } from "./commerce-plan-feature-mutation-contract";

const planId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";
const featureId = "2ec2634f-95d9-4b0d-9a2a-3f234686c04f";

function success(input: {
  httpStatus: number;
  assigned: boolean;
  version: number;
  replayed?: boolean;
}) {
  return {
    httpStatus: input.httpStatus,
    code: "ok",
    planId,
    featureId,
    assigned: input.assigned,
    version: input.version,
    replayed: input.replayed ?? false,
  };
}

describe("Commerce plan-feature mutation success contract", () => {
  it("accepts canonical first assignment at version one", () => {
    expect(
      parseCommercePlanFeatureMutationSuccess(
        success({ httpStatus: 201, assigned: true, version: 1 }),
        { planId, featureId, assigned: true, expectedVersion: 0 },
      ),
    ).not.toBeNull();
  });

  it("accepts canonical existing assignment write at exactly next version", () => {
    expect(
      parseCommercePlanFeatureMutationSuccess(
        success({ httpStatus: 200, assigned: false, version: 6 }),
        { planId, featureId, assigned: false, expectedVersion: 5 },
      ),
    ).not.toBeNull();
  });

  it("accepts a canonical idempotent replay", () => {
    expect(
      parseCommercePlanFeatureMutationSuccess(
        success({ httpStatus: 200, assigned: true, version: 3, replayed: true }),
        { planId, featureId, assigned: true, expectedVersion: 2 },
      ),
    ).not.toBeNull();
  });

  it.each([
    success({ httpStatus: 200, assigned: true, version: 1 }),
    success({ httpStatus: 201, assigned: true, version: 2 }),
    success({ httpStatus: 200, assigned: false, version: 4 }),
    { ...success({ httpStatus: 200, assigned: true, version: 3 }), assigned: false },
    {
      ...success({ httpStatus: 200, assigned: true, version: 3 }),
      planId: "305927da-bc3f-4d83-a38b-ab3250c39a26",
    },
    {
      ...success({ httpStatus: 200, assigned: true, version: 3 }),
      featureId: "4b1ccefa-618d-4caf-8b03-e607f7437dfa",
    },
    { ...success({ httpStatus: 200, assigned: true, version: 3 }), replayed: "false" },
  ])("rejects malformed or misbound success %#", (value) => {
    expect(
      parseCommercePlanFeatureMutationSuccess(value, {
        planId,
        featureId,
        assigned: true,
        expectedVersion: 2,
      }),
    ).toBeNull();
  });
});
