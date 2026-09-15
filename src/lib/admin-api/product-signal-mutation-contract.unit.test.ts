import { describe, expect, it } from "vitest";

import { parseProductSignalMutationSuccess } from "./product-signal-mutation-contract";

const feedbackId = "123e4567-e89b-42d3-a456-426614174000";

describe("product signal mutation success contract", () => {
  it("accepts canonical experiment create success", () => {
    expect(
      parseProductSignalMutationSuccess(
        {
          httpStatus: 201,
          code: "created",
          experimentKey: "pricing.paywall.copy",
          status: "Draft",
          version: 1,
          replayed: false,
        },
        201,
        { kind: "experiment-create", experimentKey: "pricing.paywall.copy" },
      ),
    ).toEqual({ replayed: false, version: 1, status: "Draft" });
  });

  it("accepts canonical experiment status success and replay", () => {
    expect(
      parseProductSignalMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          experimentKey: "pricing.paywall.copy",
          status: "Running",
          version: 4,
          replayed: true,
        },
        200,
        {
          kind: "experiment-status",
          experimentKey: "pricing.paywall.copy",
          status: "Running",
          expectedVersion: 3,
        },
      ),
    ).toEqual({ replayed: true, version: 4, status: "Running" });
  });

  it.each([
    ["Acknowledge", "Submitted", "Acknowledged"],
    ["Triage", "Acknowledged", "Triaged"],
    ["Resolve", "Triaged", "Resolved"],
    ["LinkSupport", "Triaged", "Triaged"],
    ["LinkProductIssue", "Acknowledged", "Acknowledged"],
  ])("accepts canonical feedback %s success", (action, expectedStatus, status) => {
    expect(
      parseProductSignalMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          itemId: feedbackId,
          previousStatus: expectedStatus,
          status,
          action,
          replayed: false,
        },
        200,
        {
          kind: "feedback-action",
          itemId: feedbackId,
          expectedStatus,
          action,
        },
      ),
    ).toEqual({ replayed: false, status });
  });

  it("rejects malformed or misbound experiment success", () => {
    expect(
      parseProductSignalMutationSuccess(
        {
          httpStatus: 201,
          code: "created",
          experimentKey: "wrong.key",
          status: "Draft",
          version: 1,
          replayed: false,
        },
        201,
        { kind: "experiment-create", experimentKey: "pricing.paywall.copy" },
      ),
    ).toBeNull();

    expect(
      parseProductSignalMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          experimentKey: "pricing.paywall.copy",
          status: "Running",
          version: 3,
          replayed: false,
        },
        200,
        {
          kind: "experiment-status",
          experimentKey: "pricing.paywall.copy",
          status: "Running",
          expectedVersion: 3,
        },
      ),
    ).toBeNull();
  });

  it("rejects malformed or misbound feedback success", () => {
    expect(
      parseProductSignalMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          itemId: "123e4567-e89b-42d3-a456-426614174001",
          previousStatus: "Submitted",
          status: "Acknowledged",
          action: "Acknowledge",
          replayed: false,
        },
        200,
        {
          kind: "feedback-action",
          itemId: feedbackId,
          expectedStatus: "Submitted",
          action: "Acknowledge",
        },
      ),
    ).toBeNull();

    expect(
      parseProductSignalMutationSuccess(
        {
          httpStatus: 200,
          code: "ok",
          itemId: feedbackId,
          previousStatus: "Submitted",
          status: "Submitted",
          action: "Acknowledge",
          replayed: "false",
        },
        200,
        {
          kind: "feedback-action",
          itemId: feedbackId,
          expectedStatus: "Submitted",
          action: "Acknowledge",
        },
      ),
    ).toBeNull();
  });
});
