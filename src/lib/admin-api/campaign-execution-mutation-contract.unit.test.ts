import { describe, expect, it } from "vitest";

import { parseCampaignExecutionMutationSuccess } from "./campaign-execution-mutation-contract";

const EXECUTION_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_EXECUTION_ID = "123e4567-e89b-42d3-a456-426614174001";

function confirmSuccess() {
  return {
    httpStatus: 200,
    code: "ok",
    executionId: EXECUTION_ID,
    status: "Prepared",
    version: 8,
  };
}

describe("campaign execution mutation success contract", () => {
  it("accepts canonical prepare and binds second-confirmation/provider state", () => {
    const body = {
      httpStatus: 201,
      code: "ok",
      executionId: EXECUTION_ID,
      status: "ApprovalPending",
      version: 1,
      createdAtUtc: "2026-09-16T14:00:00.000Z",
      requiresSecondConfirmation: true,
      smsProvider: "kavenegar",
    };

    expect(
      parseCampaignExecutionMutationSuccess(body, 201, {
        kind: "prepare",
        smsProvider: "kavenegar",
      }),
    ).toEqual(body);
    expect(
      parseCampaignExecutionMutationSuccess(
        { ...body, status: "Prepared" },
        201,
        { kind: "prepare", smsProvider: "kavenegar" },
      ),
    ).toBeNull();
    expect(
      parseCampaignExecutionMutationSuccess(
        { ...body, smsProvider: "other-provider" },
        201,
        { kind: "prepare", smsProvider: "kavenegar" },
      ),
    ).toBeNull();
    expect(
      parseCampaignExecutionMutationSuccess(
        { ...body, createdAtUtc: "invalid" },
        201,
        { kind: "prepare", smsProvider: "kavenegar" },
      ),
    ).toBeNull();
  });

  it("binds confirm success to exact execution, target status and next version", () => {
    const body = confirmSuccess();
    const expected = { kind: "confirm", executionId: EXECUTION_ID, expectedVersion: 7 } as const;

    expect(parseCampaignExecutionMutationSuccess(body, 200, expected)).toEqual(body);
    expect(
      parseCampaignExecutionMutationSuccess(
        { ...body, executionId: OTHER_EXECUTION_ID },
        200,
        expected,
      ),
    ).toBeNull();
    expect(
      parseCampaignExecutionMutationSuccess({ ...body, status: "Scheduled" }, 200, expected),
    ).toBeNull();
    expect(
      parseCampaignExecutionMutationSuccess({ ...body, version: 7 }, 200, expected),
    ).toBeNull();
  });

  it("binds schedule success to exact time and incremented version", () => {
    const scheduledAtUtc = "2026-09-17T09:30:00.000Z";
    const body = {
      httpStatus: 200,
      code: "ok",
      executionId: EXECUTION_ID,
      status: "Scheduled",
      scheduledAtUtc,
      version: 4,
    };
    const expected = {
      kind: "schedule",
      executionId: EXECUTION_ID,
      expectedVersion: 3,
      scheduledAtUtc,
    } as const;

    expect(parseCampaignExecutionMutationSuccess(body, 200, expected)).toEqual(body);
    expect(
      parseCampaignExecutionMutationSuccess(
        { ...body, scheduledAtUtc: "2026-09-17T09:31:00.000Z" },
        200,
        expected,
      ),
    ).toBeNull();
  });

  it("binds cancel success to exact execution, cancelled state and next version", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      executionId: EXECUTION_ID,
      status: "Cancelled",
      version: 6,
    };
    const expected = { kind: "cancel", executionId: EXECUTION_ID, expectedVersion: 5 } as const;

    expect(parseCampaignExecutionMutationSuccess(body, 200, expected)).toEqual(body);
    expect(
      parseCampaignExecutionMutationSuccess({ ...body, status: "Prepared" }, 200, expected),
    ).toBeNull();
  });

  it("fails closed on non-canonical HTTP/body envelopes", () => {
    const body = confirmSuccess();
    const expected = { kind: "confirm", executionId: EXECUTION_ID, expectedVersion: 7 } as const;

    expect(parseCampaignExecutionMutationSuccess(body, 201, expected)).toBeNull();
    expect(
      parseCampaignExecutionMutationSuccess({ ...body, httpStatus: 201 }, 200, expected),
    ).toBeNull();
    expect(
      parseCampaignExecutionMutationSuccess({ ...body, code: "accepted" }, 200, expected),
    ).toBeNull();
    expect(parseCampaignExecutionMutationSuccess(null, 200, expected)).toBeNull();
  });
});
