import { describe, expect, it } from "vitest";

import {
  getMarketingMediaPublishEligibility,
  isOpaqueMarketingMediaObjectKey,
  marketingMediaTelemetryBoundary,
  parseMarketingMediaProcessingJob,
  safeMarketingMediaTelemetry,
  validateMarketingMediaLineage,
  validateMarketingMediaUpload,
  type MarketingMediaAsset,
  type MarketingMediaUploadPolicy,
} from "./marketing-media-inbox-contract";

const RAW_ID = "11111111-1111-4111-8111-111111111111";
const DERIVATIVE_ID = "22222222-2222-4222-8222-222222222222";
const ADMIN_ID = "33333333-3333-4333-8333-333333333333";

const policy: MarketingMediaUploadPolicy = {
  policyVersion: "test-policy-v1",
  allowedMimeTypes: {
    video: ["video/mp4"],
    image: ["image/jpeg", "image/png"],
    audio: ["audio/mpeg", "audio/wav"],
  },
  maxBytesByKind: {
    video: 100_000_000,
    image: 10_000_000,
    audio: 50_000_000,
  },
  maxDurationSecondsByKind: {
    video: 600,
    audio: 1_800,
  },
};

function rawAsset(): MarketingMediaAsset {
  return {
    assetId: RAW_ID,
    kind: "video",
    objectKey: `marketing-media/${RAW_ID}/${RAW_ID}.mp4`,
    mimeType: "video/mp4",
    bytes: 5_000_000,
    durationSeconds: 30,
    state: "ready",
    rawAssetId: RAW_ID,
    parentAssetId: null,
    derivativeKind: null,
    immutableRaw: true,
    releaseState: "approved",
    publishBlocked: false,
    ideaId: null,
    shootPlanId: null,
    campaignId: null,
    uploadedByAdminAccountId: ADMIN_ID,
    policyVersion: "test-policy-v1",
    createdAtUtc: "2026-09-07T12:00:00.000Z",
  };
}

function derivativeAsset(): MarketingMediaAsset {
  return {
    ...rawAsset(),
    assetId: DERIVATIVE_ID,
    objectKey: `marketing-media/${RAW_ID}/${DERIVATIVE_ID}.mp4`,
    parentAssetId: RAW_ID,
    derivativeKind: "reviewed_vertical_render",
  };
}

describe("Raw Media Inbox contract", () => {
  it("rejects MIME spoofing and applies policy-driven size/duration limits", () => {
    expect(
      validateMarketingMediaUpload(
        {
          fileName: "clip.mp4",
          declaredMimeType: "video/mp4",
          detectedMimeType: "image/png",
          bytes: 1_000,
          durationSeconds: 5,
          mediaKind: "video",
        },
        policy,
      ),
    ).toEqual({ kind: "invalid", code: "mime_mismatch" });

    expect(
      validateMarketingMediaUpload(
        {
          fileName: "clip.mp4",
          declaredMimeType: "video/mp4",
          detectedMimeType: "video/mp4",
          bytes: 100_000_001,
          durationSeconds: 5,
          mediaKind: "video",
        },
        policy,
      ),
    ).toEqual({ kind: "invalid", code: "file_too_large" });
  });

  it("accepts only opaque marketing storage keys", () => {
    expect(isOpaqueMarketingMediaObjectKey(`marketing-media/${RAW_ID}/${RAW_ID}.mp4`)).toBe(true);
    expect(isOpaqueMarketingMediaObjectKey("marketing-media/hamid/video.mp4")).toBe(false);
    expect(isOpaqueMarketingMediaObjectKey("health-records/user@example.com/video.mp4")).toBe(
      false,
    );
  });

  it("keeps raw assets immutable and requires derivatives to retain lineage", () => {
    expect(validateMarketingMediaLineage(rawAsset())).toBe(true);
    expect(validateMarketingMediaLineage(derivativeAsset())).toBe(true);
    expect(
      validateMarketingMediaLineage({
        ...derivativeAsset(),
        parentAssetId: null,
      }),
    ).toBe(false);
    expect(
      validateMarketingMediaLineage({
        ...rawAsset(),
        immutableRaw: false,
      }),
    ).toBe(false);
  });

  it("never allows a raw or restricted asset into publish flow", () => {
    expect(getMarketingMediaPublishEligibility(rawAsset())).toEqual({
      kind: "blocked",
      code: "raw_asset_not_reviewed",
    });
    expect(getMarketingMediaPublishEligibility(derivativeAsset())).toEqual({ kind: "eligible" });
    expect(
      getMarketingMediaPublishEligibility({
        ...derivativeAsset(),
        releaseState: "restricted",
        publishBlocked: true,
      }),
    ).toEqual({ kind: "blocked", code: "restricted_release" });
  });

  it("parses provider-neutral idempotent processing jobs", () => {
    const parsed = parseMarketingMediaProcessingJob({
      jobId: "44444444-4444-4444-8444-444444444444",
      assetId: RAW_ID,
      operation: "transcription",
      status: "queued",
      idempotencyKey: "media-job:raw-1111:transcription:v1",
      provider: null,
      providerJobId: null,
      attempt: 1,
      sourceAssetImmutable: true,
      createdAtUtc: "2026-09-07T12:05:00.000Z",
      updatedAtUtc: "2026-09-07T12:05:00.000Z",
    });

    expect(parsed?.operation).toBe("transcription");
    expect(parsed?.sourceAssetImmutable).toBe(true);

    expect(
      parseMarketingMediaProcessingJob({
        ...parsed,
        sourceAssetImmutable: false,
      }),
    ).toBeNull();
  });

  it("keeps ordinary telemetry free of filenames, transcripts and participant identity", () => {
    expect(marketingMediaTelemetryBoundary).toEqual({
      fileNameAllowed: false,
      transcriptAllowed: false,
      participantIdentityAllowed: false,
      providerPayloadAllowed: false,
      providerSecretAllowed: false,
      safeIdentifiersAllowed: true,
    });
    expect(
      safeMarketingMediaTelemetry({
        assetId: RAW_ID,
        jobId: "44444444-4444-4444-8444-444444444444",
        operation: "metadata_probe",
        status: "ready",
        bytes: 5_000_000,
        failureClass: null,
      }),
    ).toEqual({
      assetId: RAW_ID,
      jobId: "44444444-4444-4444-8444-444444444444",
      operation: "metadata_probe",
      status: "ready",
      bytes: 5_000_000,
      failureClass: null,
    });
  });
});
