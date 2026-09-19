import { describe, expect, it } from "vitest";

import { parseMarketingCalendarMutationSuccess } from "./marketing-content-calendar-mutation-contract";

const CAMPAIGN_ID = "123e4567-e89b-42d3-a456-426614174000";
const EXECUTION_ID = "123e4567-e89b-42d3-a456-426614174001";
const RETRY_ID = "123e4567-e89b-42d3-a456-426614174002";

describe("marketing content calendar mutation success contract", () => {
  it("binds schedule success to campaign, local time/timezone and Scheduled state", () => {
    const body = {
      httpStatus: 202,
      code: "ok",
      campaignId: CAMPAIGN_ID,
      executionId: EXECUTION_ID,
      publishStatus: "Scheduled",
      scheduledForUtc: "2026-09-20T05:30:00.000Z",
      scheduleTimezone: "Asia/Tehran",
      providerConnectivity: "NotVerified",
      replayed: false,
    };
    const expected = {
      kind: "schedule",
      campaignId: CAMPAIGN_ID,
      scheduledLocal: "2026-09-20T09:00",
      timezone: "Asia/Tehran",
    } as const;

    expect(parseMarketingCalendarMutationSuccess(body, 202, expected)).toEqual({
      campaignId: CAMPAIGN_ID,
      executionId: EXECUTION_ID,
      publishStatus: "Scheduled",
      scheduledForUtc: body.scheduledForUtc,
      scheduleTimezone: "Asia/Tehran",
      providerConnectivity: "NotVerified",
      replayed: false,
    });
    expect(
      parseMarketingCalendarMutationSuccess({ ...body, scheduleTimezone: "UTC" }, 202, expected),
    ).toBeNull();
    expect(
      parseMarketingCalendarMutationSuccess(
        { ...body, scheduledForUtc: "2026-09-20T06:30:00.000Z" },
        202,
        expected,
      ),
    ).toBeNull();
  });

  it("binds cancel to the exact execution and Cancelled state", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      campaignId: CAMPAIGN_ID,
      executionId: EXECUTION_ID,
      publishStatus: "Cancelled",
      replayed: true,
    };
    const expected = { kind: "cancel", executionId: EXECUTION_ID } as const;

    expect(parseMarketingCalendarMutationSuccess(body, 200, expected)?.publishStatus).toBe(
      "Cancelled",
    );
    expect(
      parseMarketingCalendarMutationSuccess({ ...body, executionId: RETRY_ID }, 200, expected),
    ).toBeNull();
    expect(parseMarketingCalendarMutationSuccess(body, 202, expected)).toBeNull();
  });

  it("binds retry to the prior execution and requires a distinct queued execution", () => {
    const body = {
      httpStatus: 202,
      code: "ok",
      campaignId: CAMPAIGN_ID,
      executionId: RETRY_ID,
      retryOfExecutionId: EXECUTION_ID,
      publishStatus: "Queued",
      providerConnectivity: "NotVerified",
      replayed: false,
    };
    const expected = { kind: "retry", executionId: EXECUTION_ID } as const;

    expect(parseMarketingCalendarMutationSuccess(body, 202, expected)).toEqual({
      campaignId: CAMPAIGN_ID,
      executionId: RETRY_ID,
      retryOfExecutionId: EXECUTION_ID,
      publishStatus: "Queued",
      providerConnectivity: "NotVerified",
      replayed: false,
    });
    expect(
      parseMarketingCalendarMutationSuccess({ ...body, executionId: EXECUTION_ID }, 202, expected),
    ).toBeNull();
    expect(
      parseMarketingCalendarMutationSuccess(
        { ...body, retryOfExecutionId: RETRY_ID },
        202,
        expected,
      ),
    ).toBeNull();
  });

  it("fails closed on malformed envelopes and provider truth drift", () => {
    const expected = { kind: "retry", executionId: EXECUTION_ID } as const;
    const body = {
      httpStatus: 202,
      code: "ok",
      campaignId: CAMPAIGN_ID,
      executionId: RETRY_ID,
      retryOfExecutionId: EXECUTION_ID,
      publishStatus: "Queued",
      providerConnectivity: "NotVerified",
      replayed: false,
    };

    expect(
      parseMarketingCalendarMutationSuccess({ ...body, code: "accepted" }, 202, expected),
    ).toBeNull();
    expect(
      parseMarketingCalendarMutationSuccess(
        { ...body, providerConnectivity: "Verified" },
        202,
        expected,
      ),
    ).toBeNull();
    expect(
      parseMarketingCalendarMutationSuccess({ ...body, replayed: "false" }, 202, expected),
    ).toBeNull();
    expect(parseMarketingCalendarMutationSuccess(null, 202, expected)).toBeNull();
  });
});
