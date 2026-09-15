export type ProductSignalMutationExpectation =
  | { kind: "experiment-create"; experimentKey: string }
  | {
      kind: "experiment-status";
      experimentKey: string;
      status: string;
      expectedVersion: number;
    }
  | {
      kind: "feedback-action";
      itemId: string;
      expectedStatus: string;
      action: string;
    };

export type ProductSignalMutationSuccess = {
  replayed: boolean;
  version?: number;
  status?: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nextFeedbackStatus(action: string, expectedStatus: string): string | null {
  if (action === "Acknowledge") return "Acknowledged";
  if (action === "Triage") return "Triaged";
  if (action === "Resolve") return "Resolved";
  if (action === "LinkSupport" || action === "LinkProductIssue") return expectedStatus;
  return null;
}

export function parseProductSignalMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: ProductSignalMutationExpectation,
): ProductSignalMutationSuccess | null {
  const body = record(value);
  if (!body || typeof body.replayed !== "boolean" || body.httpStatus !== httpStatus) return null;

  if (expectation.kind === "experiment-create") {
    if (
      httpStatus !== 201 ||
      body.code !== "created" ||
      body.experimentKey !== expectation.experimentKey ||
      body.status !== "Draft" ||
      body.version !== 1
    ) {
      return null;
    }
    return { replayed: body.replayed, version: 1, status: "Draft" };
  }

  if (expectation.kind === "experiment-status") {
    if (
      httpStatus !== 200 ||
      body.code !== "ok" ||
      body.experimentKey !== expectation.experimentKey ||
      body.status !== expectation.status ||
      body.version !== expectation.expectedVersion + 1
    ) {
      return null;
    }
    return {
      replayed: body.replayed,
      version: expectation.expectedVersion + 1,
      status: expectation.status,
    };
  }

  const nextStatus = nextFeedbackStatus(expectation.action, expectation.expectedStatus);
  if (
    httpStatus !== 200 ||
    body.code !== "ok" ||
    body.itemId !== expectation.itemId ||
    body.previousStatus !== expectation.expectedStatus ||
    body.action !== expectation.action ||
    nextStatus === null ||
    body.status !== nextStatus
  ) {
    return null;
  }
  return { replayed: body.replayed, status: nextStatus };
}
