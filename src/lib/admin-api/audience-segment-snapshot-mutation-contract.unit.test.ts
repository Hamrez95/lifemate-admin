import { describe, expect, it } from "vitest";

import { isAudienceSegmentSnapshotMutationSuccess } from "./audience-segment-snapshot-mutation-contract";

const SEGMENT_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_SEGMENT_ID = "123e4567-e89b-42d3-a456-426614174001";

const EXPECTED = { segmentId: SEGMENT_ID, segmentVersion: 7 };

describe("audience segment snapshot mutation success contract", () => {
  it("accepts only canonical HTTP 201 bound to exact segment/version", () => {
    const body = { segmentId: SEGMENT_ID, segmentVersion: 7 };
    expect(isAudienceSegmentSnapshotMutationSuccess(body, 201, EXPECTED)).toBe(true);
    expect(isAudienceSegmentSnapshotMutationSuccess(body, 200, EXPECTED)).toBe(false);
  });

  it("fails closed on wrong segment identity or stale version", () => {
    expect(
      isAudienceSegmentSnapshotMutationSuccess(
        { segmentId: OTHER_SEGMENT_ID, segmentVersion: 7 },
        201,
        EXPECTED,
      ),
    ).toBe(false);
    expect(
      isAudienceSegmentSnapshotMutationSuccess(
        { segmentId: SEGMENT_ID, segmentVersion: 6 },
        201,
        EXPECTED,
      ),
    ).toBe(false);
  });

  it("fails closed on malformed identities and versions", () => {
    expect(
      isAudienceSegmentSnapshotMutationSuccess(
        { segmentId: "invalid", segmentVersion: 7 },
        201,
        EXPECTED,
      ),
    ).toBe(false);
    expect(
      isAudienceSegmentSnapshotMutationSuccess(
        { segmentId: SEGMENT_ID, segmentVersion: 7.5 },
        201,
        EXPECTED,
      ),
    ).toBe(false);
    expect(isAudienceSegmentSnapshotMutationSuccess(null, 201, EXPECTED)).toBe(false);
  });
});
