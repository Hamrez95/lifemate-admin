const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function isAudienceSegmentSnapshotMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: { segmentId: string; segmentVersion: number },
): boolean {
  const body = record(value);
  if (!body) return false;
  if (
    httpStatus !== 201 ||
    typeof body.segmentId !== "string" ||
    !UUID.test(body.segmentId) ||
    !UUID.test(expected.segmentId) ||
    body.segmentId.toLowerCase() !== expected.segmentId.toLowerCase() ||
    !Number.isSafeInteger(body.segmentVersion) ||
    body.segmentVersion !== expected.segmentVersion
  ) {
    return false;
  }
  return true;
}
