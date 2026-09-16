type CreatedAudienceSegment = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: "Active" | "Archived";
  version: number;
};

type AudienceSegmentSnapshot = {
  id: string;
  segmentId: string;
  segmentVersion: number;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function matchesCreatedAudienceSegment(
  value: CreatedAudienceSegment,
  expected: { key: string; name: string; description: string | null },
): boolean {
  return (
    UUID_PATTERN.test(value.id) &&
    value.key === expected.key &&
    value.name === expected.name &&
    value.description === expected.description &&
    value.status === "Active" &&
    value.version === 1
  );
}

export function matchesAudienceSegmentSnapshot(
  value: AudienceSegmentSnapshot,
  expected: { segmentId: string; segmentVersion: number },
): boolean {
  return (
    UUID_PATTERN.test(value.id) &&
    value.segmentId.toLowerCase() === expected.segmentId.toLowerCase() &&
    value.segmentVersion === expected.segmentVersion
  );
}
