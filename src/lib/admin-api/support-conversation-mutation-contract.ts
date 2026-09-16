export type SupportMessageMutationExpectation = {
  ticketId: string;
};

export type SupportMessageMutationSuccess = {
  messageId: string;
  createdAtUtc: string;
  replayed: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseSupportMessageMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: SupportMessageMutationExpectation,
): SupportMessageMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    httpStatus !== 200 ||
    typeof body.ticketId !== "string" ||
    body.ticketId.toLowerCase() !== expected.ticketId.toLowerCase() ||
    typeof body.messageId !== "string" ||
    !UUID_PATTERN.test(body.messageId) ||
    typeof body.createdAtUtc !== "string" ||
    Number.isNaN(Date.parse(body.createdAtUtc)) ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  return {
    messageId: body.messageId,
    createdAtUtc: body.createdAtUtc,
    replayed: body.replayed,
  };
}
