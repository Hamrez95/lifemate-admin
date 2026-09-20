import { describe, expect, it } from "vitest";

import { parseCommercePlanFeatureMutationSuccess } from "./commerce-plan-feature-mutation-contract";

const planId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";
const featureId = "2ec2634f-95d9-4b0d-9a2a-3f234686c04f";
const otherPlanId = "305927da-bc3f-4d83-a38b-ab3250c39a26";

function legacySuccess(input: {
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

function routeSuccess(input: { assigned: boolean; version: number; replayed?: boolean }) {
  return {
    planId,
    featureId,
    assigned: input.assigned,
    version: input.version,
    replayed: input.replayed ?? false,
  };
}

describe("Commerce plan-feature mutation success contract", () => {
  it("preserves canonical legacy body-envelope parsing", () => {
    expect(
      parseCommercePlanFeatureMutationSuccess(
        legacySuccess({ httpStatus: 201, assigned: true, version: 1 }),
        { planId, featureId, assigned: true, expectedVersion: 0 },
      ),
    ).not.toBeNull();

    expect(
      parseCommercePlanFeatureMutationSuccess(
        legacySuccess({ httpStatus: 200, assigned: false, version: 6 }),
        { planId, featureId, assigned: false, expectedVersion: 5 },
      ),
    ).not.toBeNull();
  });

  it("accepts route success without stripped internal envelope fields", () => {
    const create = routeSuccess({ assigned: true, version: 1 });
    expect(
      parseCommercePlanFeatureMutationSuccess(create, 201, {
        planId,
        featureId,
        assigned: true,
        expectedVersion: 0,
      }),
    ).toEqual(create);

    const update = routeSuccess({ assigned: false, version: 6, replayed: true });
    expect(
      parseCommercePlanFeatureMutationSuccess(update, 200, {
        planId,
        featureId,
        assigned: false,
        expectedVersion: 5,
      }),
    ).toEqual(update);
  });

  it("fails closed on outer HTTP mismatch", () => {
    expect(
      parseCommercePlanFeatureMutationSuccess(routeSuccess({ assigned: true, version: 1 }), 200, {
        planId,
        featureId,
        assigned: true,
        expectedVersion: 0,
      }),
    ).toBeNull();
    expect(
      parseCommercePlanFeatureMutationSuccess(routeSuccess({ assigned: false, version: 6 }), 201, {
        planId,
        featureId,
        assigned: false,
        expectedVersion: 5,
      }),
    ).toBeNull();
  });

  it("binds exact plan, feature, assignment and next version", () => {
    const expected = { planId, featureId, assigned: true, expectedVersion: 2 };
    const body = routeSuccess({ assigned: true, version: 3, replayed: true });

    expect(parseCommercePlanFeatureMutationSuccess(body, 200, expected)).toEqual(body);
    expect(
      parseCommercePlanFeatureMutationSuccess({ ...body, planId: otherPlanId }, 200, expected),
    ).toBeNull();
    expect(
      parseCommercePlanFeatureMutationSuccess({ ...body, assigned: false }, 200, expected),
    ).toBeNull();
    expect(
      parseCommercePlanFeatureMutationSuccess({ ...body, version: 4 }, 200, expected),
    ).toBeNull();
    expect(
      parseCommercePlanFeatureMutationSuccess({ ...body, replayed: "true" }, 200, expected),
    ).toBeNull();
  });

  it.each([
    legacySuccess({ httpStatus: 200, assigned: true, version: 1 }),
    legacySuccess({ httpStatus: 201, assigned: true, version: 2 }),
    legacySuccess({ httpStatus: 200, assigned: false, version: 4 }),
    {
      ...legacySuccess({ httpStatus: 200, assigned: true, version: 3 }),
      featureId: "4b1ccefa-618d-4caf-8b03-e607f7437dfa",
    },
  ])("rejects malformed legacy success %#", (value) => {
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
