import { describe, expect, it } from "vitest";

import { parseFeedbackActionSuccess } from "./feedback-action-mutation-contract";

const ITEM_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_ID = "123e4567-e89b-42d3-a456-426614174001";

describe("feedback action mutation success contract", () => {
  it("binds Acknowledge to Submitted -> Acknowledged", () => {
    const expected = {
      itemId: ITEM_ID,
      expectedStatus: "Submitted",
      action: "Acknowledge",
    } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      itemId: ITEM_ID,
      previousStatus: "Submitted",
      status: "Acknowledged",
      action: "Acknowledge",
      replayed: false,
    };

    expect(parseFeedbackActionSuccess(body, 200, expected)).toEqual({
      itemId: ITEM_ID,
      previousStatus: "Submitted",
      status: "Acknowledged",
      action: "Acknowledge",
      replayed: false,
    });
  });

  it("binds Triage and Resolve to their canonical next states", () => {
    expect(
      parseFeedbackActionSuccess(
        {
          httpStatus: 200,
          code: "ok",
          itemId: ITEM_ID,
          previousStatus: "Acknowledged",
          status: "Triaged",
          action: "Triage",
          replayed: true,
        },
        200,
        { itemId: ITEM_ID, expectedStatus: "Acknowledged", action: "Triage" },
      )?.status,
    ).toBe("Triaged");

    expect(
      parseFeedbackActionSuccess(
        {
          httpStatus: 200,
          code: "ok",
          itemId: ITEM_ID,
          previousStatus: "Triaged",
          status: "Resolved",
          action: "Resolve",
          replayed: false,
        },
        200,
        { itemId: ITEM_ID, expectedStatus: "Triaged", action: "Resolve" },
      )?.status,
    ).toBe("Resolved");
  });

  it("keeps status unchanged for support/product linking actions", () => {
    const base = {
      httpStatus: 200,
      code: "ok",
      itemId: ITEM_ID,
      previousStatus: "Triaged",
      status: "Triaged",
      replayed: false,
    };

    expect(
      parseFeedbackActionSuccess({ ...base, action: "LinkSupport" }, 200, {
        itemId: ITEM_ID,
        expectedStatus: "Triaged",
        action: "LinkSupport",
      })?.status,
    ).toBe("Triaged");
    expect(
      parseFeedbackActionSuccess({ ...base, action: "LinkProductIssue" }, 200, {
        itemId: ITEM_ID,
        expectedStatus: "Triaged",
        action: "LinkProductIssue",
      })?.status,
    ).toBe("Triaged");
  });

  it("fails closed on wrong identity, transition, action or envelope", () => {
    const expected = {
      itemId: ITEM_ID,
      expectedStatus: "Submitted",
      action: "Acknowledge",
    } as const;
    const body = {
      httpStatus: 200,
      code: "ok",
      itemId: ITEM_ID,
      previousStatus: "Submitted",
      status: "Acknowledged",
      action: "Acknowledge",
      replayed: false,
    };

    expect(parseFeedbackActionSuccess({ ...body, itemId: OTHER_ID }, 200, expected)).toBeNull();
    expect(parseFeedbackActionSuccess({ ...body, status: "Triaged" }, 200, expected)).toBeNull();
    expect(parseFeedbackActionSuccess({ ...body, action: "Triage" }, 200, expected)).toBeNull();
    expect(parseFeedbackActionSuccess({ ...body, code: "accepted" }, 200, expected)).toBeNull();
    expect(parseFeedbackActionSuccess(body, 201, expected)).toBeNull();
    expect(parseFeedbackActionSuccess(null, 200, expected)).toBeNull();
  });
});
