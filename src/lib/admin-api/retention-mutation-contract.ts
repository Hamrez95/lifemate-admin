export type RetentionMutationExpectation =
  | {
      kind: "policy";
      dataCategory: string;
      purposeCode: string;
    }
  | { kind: "hold-create" }
  | { kind: "hold-release"; holdId: string };

export type RetentionMutationSuccess = {
  replayed: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizedKey(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

export function parseRetentionMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: RetentionMutationExpectation,
): RetentionMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    body.httpStatus !== httpStatus ||
    body.code !== "ok" ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  if (expectation.kind === "policy") {
    if (
      httpStatus !== 200 ||
      typeof body.id !== "string" ||
      !UUID.test(body.id) ||
      normalizedKey(body.dataCategory) !== expectation.dataCategory.trim().toLowerCase() ||
      normalizedKey(body.purposeCode) !== expectation.purposeCode.trim().toLowerCase() ||
      !Number.isInteger(body.policyVersion) ||
      Number(body.policyVersion) < 1
    ) {
      return null;
    }
    return { replayed: body.replayed };
  }

  if (typeof body.id !== "string" || !UUID.test(body.id)) return null;

  if (expectation.kind === "hold-create") {
    return httpStatus === 201 ? { replayed: body.replayed } : null;
  }

  return httpStatus === 200 && body.id.toLowerCase() === expectation.holdId.toLowerCase()
    ? { replayed: body.replayed }
    : null;
}
