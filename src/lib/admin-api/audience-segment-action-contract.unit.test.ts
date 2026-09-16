import { describe, expect, it } from "vitest";

import {
  matchesAudienceSegmentSnapshot,
  matchesCreatedAudienceSegment,
} from "./audience-segment-action-contract";

const segmentId = "123e4567-e89b-42d3-a456-426614174000";
const snapshotId = "123e4567-e89b-42d3-a456-426614174001";

describe("audience segment action success binding", () => {
  it("accepts only the segment created for the requested identity", () => {
    const segment = {
      id: segmentId,
      key: "inactive-users",
      name: "Inactive users",
      description: "Coarse engagement cohort",
      status: "Active" as const,
      version: 1,
    };
    const expected = {
      key: "inactive-users",
      name: "Inactive users",
      description: "Coarse engagement cohort",
    };

    expect(matchesCreatedAudienceSegment(segment, expected)).toBe(true);
    expect(matchesCreatedAudienceSegment({ ...segment, key: "other" }, expected)).toBe(false);
    expect(matchesCreatedAudienceSegment({ ...segment, version: 2 }, expected)).toBe(false);
    expect(matchesCreatedAudienceSegment({ ...segment, status: "Archived" }, expected)).toBe(false);
  });

  it("binds immutable snapshot success to the requested segment version", () => {
    const snapshot = { id: snapshotId, segmentId, segmentVersion: 7 };
    expect(
      matchesAudienceSegmentSnapshot(snapshot, { segmentId, segmentVersion: 7 }),
    ).toBe(true);
    expect(
      matchesAudienceSegmentSnapshot(snapshot, {
        segmentId: "223e4567-e89b-42d3-a456-426614174000",
        segmentVersion: 7,
      }),
    ).toBe(false);
    expect(
      matchesAudienceSegmentSnapshot(snapshot, { segmentId, segmentVersion: 6 }),
    ).toBe(false);
  });
});
