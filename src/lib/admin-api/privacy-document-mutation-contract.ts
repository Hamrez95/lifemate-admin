export type PrivacyDocumentMutationExpectation =
  | { kind: "create" }
  | { kind: "publish"; documentId: string }
  | { kind: "retire"; documentId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function exactDocument(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" && UUID.test(value) && value.toLowerCase() === expected.toLowerCase()
  );
}

export function isPrivacyDocumentMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: PrivacyDocumentMutationExpectation,
): boolean {
  const body = record(value);
  if (!body) return false;

  const expectedHttpStatus = expected.kind === "create" ? 201 : 200;
  if (
    httpStatus !== expectedHttpStatus ||
    body.httpStatus !== expectedHttpStatus ||
    body.code !== "ok" ||
    typeof body.documentId !== "string" ||
    !UUID.test(body.documentId) ||
    !instant(body.updatedAtUtc) ||
    typeof body.replayed !== "boolean"
  ) {
    return false;
  }

  if (expected.kind === "create") return body.status === "Draft";
  if (!exactDocument(body.documentId, expected.documentId)) return false;
  if (expected.kind === "publish") return body.status === "Active";

  return body.status === "Retired" && instant(body.retiredAtUtc) && typeof body.noop === "boolean";
}
