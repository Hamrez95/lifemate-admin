export type AccessGrantMutationExpectation = {
  grantId: string;
  action: "extend" | "replace-scopes" | "revoke";
  expectedVersion: number;
  expiresAtUtc?: string;
  scopes?: readonly string[];
};

export type AccessGrantMutationSuccess = {
  version: number;
  status: string;
  expiresAtUtc: string | null;
  scopeCount: number;
  noop: boolean;
  replayed: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function sameInstant(actual: unknown, expected: string): boolean {
  if (!instant(actual)) return false;
  const expectedMs = Date.parse(expected);
  return !Number.isNaN(expectedMs) && Date.parse(actual) === expectedMs;
}

function exactGrant(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" &&
    UUID.test(value) &&
    UUID.test(expected) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

export function parseAccessGrantMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: AccessGrantMutationExpectation,
): AccessGrantMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    httpStatus !== 200 ||
    body.httpStatus !== 200 ||
    body.code !== "ok" ||
    !exactGrant(body.grantId, expected.grantId) ||
    body.action !== expected.action ||
    !Number.isSafeInteger(body.version) ||
    typeof body.status !== "string" ||
    (body.expiresAtUtc !== null && !instant(body.expiresAtUtc)) ||
    !Number.isSafeInteger(body.scopeCount) ||
    Number(body.scopeCount) < 0 ||
    typeof body.noop !== "boolean" ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  const expectedVersion = body.noop ? expected.expectedVersion : expected.expectedVersion + 1;
  if (!Number.isSafeInteger(expectedVersion) || body.version !== expectedVersion) return null;

  if (expected.action === "extend") {
    if (
      body.noop ||
      body.status !== "Active" ||
      !expected.expiresAtUtc ||
      !sameInstant(body.expiresAtUtc, expected.expiresAtUtc)
    ) {
      return null;
    }
  } else if (expected.action === "replace-scopes") {
    if (
      body.status !== "Active" ||
      !Array.isArray(expected.scopes) ||
      body.scopeCount !== expected.scopes.length
    ) {
      return null;
    }
  } else if (
    (!body.noop && body.status !== "Revoked") ||
    (body.noop && body.status !== "Revoked" && body.status !== "Expired")
  ) {
    return null;
  }

  return {
    version: Number(body.version),
    status: body.status,
    expiresAtUtc: body.expiresAtUtc as string | null,
    scopeCount: Number(body.scopeCount),
    noop: body.noop,
    replayed: body.replayed,
  };
}
