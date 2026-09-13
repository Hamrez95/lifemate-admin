import { describe, expect, it } from "vitest";

import { parseCommerceCatalogMutationSuccess } from "./commerce-catalog-mutation-contract";

const planId = "8b82f871-baa2-4ee7-9849-ce20882fd67c";
const otherPlanId = "2ec2634f-95d9-4b0d-9a2a-3f234686c04f";
const priceId = "305927da-bc3f-4d83-a38b-ab3250c39a26";
const effectiveFromUtc = "2026-09-14T08:30:00.000Z";

describe("Commerce catalog mutation success contract", () => {
  it("accepts canonical plan creation and replay metadata", () => {
    expect(
      parseCommerceCatalogMutationSuccess(
        { planId, status: "Active", replayed: false },
        201,
        { kind: "createPlan" },
      ),
    ).not.toBeNull();
    expect(
      parseCommerceCatalogMutationSuccess(
        { planId, status: "Active", replayed: true },
        201,
        { kind: "createPlan" },
      ),
    ).not.toBeNull();
  });

  it("binds plan update success to the requested plan and target status", () => {
    expect(
      parseCommerceCatalogMutationSuccess(
        { planId, previousStatus: "Active", status: "Retired", replayed: false },
        200,
        { kind: "updatePlan", planId, status: "Retired" },
      ),
    ).not.toBeNull();
    expect(
      parseCommerceCatalogMutationSuccess(
        { planId: otherPlanId, previousStatus: "Active", status: "Retired", replayed: false },
        200,
        { kind: "updatePlan", planId, status: "Retired" },
      ),
    ).toBeNull();
    expect(
      parseCommerceCatalogMutationSuccess(
        { planId, previousStatus: "Active", status: "Active", replayed: false },
        200,
        { kind: "updatePlan", planId, status: "Retired" },
      ),
    ).toBeNull();
  });

  it("binds price scheduling to plan and the same effective instant", () => {
    expect(
      parseCommerceCatalogMutationSuccess(
        {
          priceId,
          planId,
          effectiveFromUtc: "2026-09-14T08:30:00+00:00",
          replayed: false,
        },
        201,
        { kind: "schedulePrice", planId, effectiveFromUtc },
      ),
    ).not.toBeNull();
  });

  it.each([
    [{ planId, status: "Active", replayed: false }, 200, { kind: "createPlan" } as const],
    [{ planId, status: "Draft", replayed: false }, 201, { kind: "createPlan" } as const],
    [
      { planId, previousStatus: "Unknown", status: "Retired", replayed: false },
      200,
      { kind: "updatePlan", planId, status: "Retired" } as const,
    ],
    [
      { priceId: "bad", planId, effectiveFromUtc, replayed: false },
      201,
      { kind: "schedulePrice", planId, effectiveFromUtc } as const,
    ],
    [
      { priceId, planId, effectiveFromUtc: "2026-09-14T08:31:00.000Z", replayed: false },
      201,
      { kind: "schedulePrice", planId, effectiveFromUtc } as const,
    ],
    [
      { priceId, planId, effectiveFromUtc, replayed: "false" },
      201,
      { kind: "schedulePrice", planId, effectiveFromUtc } as const,
    ],
  ])("rejects malformed or misbound catalog success %#", (value, status, expectation) => {
    expect(parseCommerceCatalogMutationSuccess(value, status, expectation)).toBeNull();
  });
});
