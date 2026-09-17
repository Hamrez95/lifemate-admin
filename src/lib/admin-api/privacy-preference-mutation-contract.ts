export type PrivacyPreferenceMutationExpectation = {
  purpose: string;
  policyVersion: string;
  status: "Active" | "Retired";
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function isPrivacyPreferenceMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: PrivacyPreferenceMutationExpectation,
): boolean {
  const body = record(value);
  if (!body) return false;

  return (
    httpStatus === 200 &&
    body.httpStatus === 200 &&
    body.code === "ok" &&
    body.purpose === expected.purpose &&
    body.policyVersion === expected.policyVersion &&
    body.status === expected.status &&
    instant(body.updatedAtUtc) &&
    typeof body.replayed === "boolean"
  );
}
