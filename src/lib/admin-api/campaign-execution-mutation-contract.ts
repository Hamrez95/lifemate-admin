export type CampaignExecutionMutationExpectation =
  | { kind: "prepare"; smsProvider: string | null }
  | { kind: "confirm"; executionId: string; expectedVersion: number }
  | {
      kind: "schedule";
      executionId: string;
      expectedVersion: number;
      scheduledAtUtc: string;
    }
  | { kind: "cancel"; executionId: string; expectedVersion: number };

export type CampaignExecutionMutationSuccess = {
  httpStatus: 200 | 201;
  code: "ok";
  executionId: string;
  status: "ApprovalPending" | "Prepared" | "Scheduled" | "Cancelled";
  version: number;
  createdAtUtc?: string;
  scheduledAtUtc?: string;
  requiresSecondConfirmation?: boolean;
  smsProvider?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nextVersion(expectedVersion: number): number | null {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return null;
  const value = expectedVersion + 1;
  return Number.isSafeInteger(value) ? value : null;
}

function exactExecution(body: Record<string, unknown>, executionId: string): boolean {
  return (
    typeof body.executionId === "string" &&
    UUID_PATTERN.test(body.executionId) &&
    body.executionId.toLowerCase() === executionId.toLowerCase()
  );
}

function canonicalEnvelope(
  body: Record<string, unknown>,
  httpStatus: number,
  expectedHttpStatus: 200 | 201,
): boolean {
  return (
    httpStatus === expectedHttpStatus &&
    body.httpStatus === expectedHttpStatus &&
    body.code === "ok" &&
    typeof body.executionId === "string" &&
    UUID_PATTERN.test(body.executionId) &&
    Number.isSafeInteger(body.version) &&
    Number(body.version) >= 1
  );
}

function sameInstant(actual: unknown, expected: string): boolean {
  if (!instant(actual)) return false;
  const expectedMs = Date.parse(expected);
  return !Number.isNaN(expectedMs) && Date.parse(actual) === expectedMs;
}

export function parseCampaignExecutionMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: CampaignExecutionMutationExpectation,
): CampaignExecutionMutationSuccess | null {
  const body = record(value);
  if (!body) return null;

  if (expected.kind === "prepare") {
    if (!canonicalEnvelope(body, httpStatus, 201)) return null;
    if (body.status !== "Prepared" && body.status !== "ApprovalPending") return null;
    if (typeof body.requiresSecondConfirmation !== "boolean") return null;
    if (body.requiresSecondConfirmation !== (body.status === "ApprovalPending")) return null;
    if (!instant(body.createdAtUtc)) return null;
    if (expected.smsProvider === null) {
      if (body.smsProvider !== null) return null;
    } else if (
      typeof body.smsProvider !== "string" ||
      body.smsProvider.toLowerCase() !== expected.smsProvider.toLowerCase()
    ) {
      return null;
    }
    return body as unknown as CampaignExecutionMutationSuccess;
  }

  if (!canonicalEnvelope(body, httpStatus, 200)) return null;
  if (!exactExecution(body, expected.executionId)) return null;
  const version = nextVersion(expected.expectedVersion);
  if (version === null || body.version !== version) return null;

  if (expected.kind === "confirm") {
    return body.status === "Prepared"
      ? (body as unknown as CampaignExecutionMutationSuccess)
      : null;
  }

  if (expected.kind === "schedule") {
    if (body.status !== "Scheduled") return null;
    if (!sameInstant(body.scheduledAtUtc, expected.scheduledAtUtc)) return null;
    return body as unknown as CampaignExecutionMutationSuccess;
  }

  return body.status === "Cancelled" ? (body as unknown as CampaignExecutionMutationSuccess) : null;
}
