export type BreakGlassMutationExpectation =
  | { kind: "create" }
  | {
      kind: "action";
      requestId: string;
      action: "approve" | "deny" | "revoke";
      expectedVersion: number;
    };

export type BreakGlassMutationSuccess = {
  requestId: string;
  status: "Pending" | "Approved" | "Denied" | "Revoked";
  version: number;
  replayed: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function positiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 1 ? Number(value) : null;
}

export function parseBreakGlassMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: BreakGlassMutationExpectation,
): BreakGlassMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    body.httpStatus !== httpStatus ||
    body.code !== "ok" ||
    !isUuid(body.requestId) ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  const version = positiveInteger(body.version);
  if (version === null) return null;

  if (expectation.kind === "create") {
    if (httpStatus !== 201 || body.status !== "Pending" || version !== 1) return null;
    return {
      requestId: body.requestId,
      status: "Pending",
      version,
      replayed: body.replayed,
    };
  }

  if (
    httpStatus !== 200 ||
    body.requestId.toLowerCase() !== expectation.requestId.toLowerCase() ||
    body.action !== expectation.action ||
    version !== expectation.expectedVersion + 1
  ) {
    return null;
  }

  const expectedStatus =
    expectation.action === "approve"
      ? "Approved"
      : expectation.action === "deny"
        ? "Denied"
        : "Revoked";
  if (body.status !== expectedStatus) return null;

  if (expectation.action === "approve") {
    if (typeof body.expiresAtUtc !== "string" || !body.expiresAtUtc.trim()) return null;
  } else if (body.expiresAtUtc !== null) {
    return null;
  }

  return {
    requestId: body.requestId,
    status: expectedStatus,
    version,
    replayed: body.replayed,
  };
}
