export type FeedbackAction =
  "Acknowledge" | "Triage" | "Resolve" | "LinkSupport" | "LinkProductIssue";

export type FeedbackStatus = "Submitted" | "Acknowledged" | "Triaged" | "Resolved";

export type FeedbackActionExpectation = {
  itemId: string;
  expectedStatus: string;
  action: string;
};

export type FeedbackActionSuccess = {
  itemId: string;
  previousStatus: FeedbackStatus;
  status: FeedbackStatus;
  action: FeedbackAction;
  replayed: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set<FeedbackAction>([
  "Acknowledge",
  "Triage",
  "Resolve",
  "LinkSupport",
  "LinkProductIssue",
]);
const STATUSES = new Set<FeedbackStatus>(["Submitted", "Acknowledged", "Triaged", "Resolved"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function canonicalExpectation(
  expected: FeedbackActionExpectation,
): { itemId: string; expectedStatus: FeedbackStatus; action: FeedbackAction } | null {
  if (
    !UUID.test(expected.itemId) ||
    !STATUSES.has(expected.expectedStatus as FeedbackStatus) ||
    !ACTIONS.has(expected.action as FeedbackAction)
  ) {
    return null;
  }
  return {
    itemId: expected.itemId,
    expectedStatus: expected.expectedStatus as FeedbackStatus,
    action: expected.action as FeedbackAction,
  };
}

function targetStatus(expected: {
  expectedStatus: FeedbackStatus;
  action: FeedbackAction;
}): FeedbackStatus {
  if (expected.action === "Acknowledge") return "Acknowledged";
  if (expected.action === "Triage") return "Triaged";
  if (expected.action === "Resolve") return "Resolved";
  return expected.expectedStatus;
}

export function parseFeedbackActionSuccess(
  value: unknown,
  httpStatus: number,
  expectedInput: FeedbackActionExpectation,
): FeedbackActionSuccess | null {
  const expected = canonicalExpectation(expectedInput);
  const body = record(value);
  if (!expected || !body) return null;

  const target = targetStatus(expected);
  if (
    httpStatus !== 200 ||
    body.httpStatus !== 200 ||
    body.code !== "ok" ||
    typeof body.itemId !== "string" ||
    !UUID.test(body.itemId) ||
    body.itemId.toLowerCase() !== expected.itemId.toLowerCase() ||
    body.previousStatus !== expected.expectedStatus ||
    body.status !== target ||
    body.action !== expected.action ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  return {
    itemId: body.itemId,
    previousStatus: expected.expectedStatus,
    status: target,
    action: expected.action,
    replayed: body.replayed,
  };
}
