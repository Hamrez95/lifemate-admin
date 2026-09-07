export const marketingMediaKinds = ["video", "image", "audio"] as const;
export const marketingMediaAssetStates = [
  "uploading",
  "uploaded",
  "queued",
  "processing",
  "ready",
  "needs_review",
  "failed",
  "restricted",
  "archived",
  "tombstoned",
] as const;
export const marketingMediaProcessingOperations = [
  "metadata_probe",
  "thumbnail",
  "contact_sheet",
  "audio_extraction",
  "transcription",
  "speech_segmentation",
  "aspect_analysis",
  "crop_suggestion",
  "subtitle_timing",
  "proxy_generation",
  "render_transcode",
] as const;
export const marketingMediaReleaseStates = [
  "not_required",
  "pending",
  "approved",
  "restricted",
  "expired",
] as const;

export type MarketingMediaKind = (typeof marketingMediaKinds)[number];
export type MarketingMediaAssetState = (typeof marketingMediaAssetStates)[number];
export type MarketingMediaProcessingOperation = (typeof marketingMediaProcessingOperations)[number];
export type MarketingMediaReleaseState = (typeof marketingMediaReleaseStates)[number];

export type MarketingMediaUploadPolicy = {
  policyVersion: string;
  allowedMimeTypes: Record<MarketingMediaKind, readonly string[]>;
  maxBytesByKind: Record<MarketingMediaKind, number>;
  maxDurationSecondsByKind: Partial<Record<MarketingMediaKind, number>>;
};

export type MarketingMediaUploadCandidate = {
  fileName: string;
  declaredMimeType: string;
  detectedMimeType: string;
  bytes: number;
  durationSeconds: number | null;
  mediaKind: MarketingMediaKind;
};

export type MarketingMediaUploadValidation =
  | { kind: "valid"; mediaKind: MarketingMediaKind; mimeType: string }
  | {
      kind: "invalid";
      code:
        | "invalid_shape"
        | "mime_mismatch"
        | "mime_not_allowed"
        | "file_too_large"
        | "duration_too_long"
        | "invalid_size";
    };

export type MarketingMediaAsset = {
  assetId: string;
  kind: MarketingMediaKind;
  objectKey: string;
  mimeType: string;
  bytes: number;
  durationSeconds: number | null;
  state: MarketingMediaAssetState;
  rawAssetId: string;
  parentAssetId: string | null;
  derivativeKind: string | null;
  immutableRaw: boolean;
  releaseState: MarketingMediaReleaseState;
  publishBlocked: boolean;
  ideaId: string | null;
  shootPlanId: string | null;
  campaignId: string | null;
  uploadedByAdminAccountId: string;
  policyVersion: string;
  createdAtUtc: string;
};

export type MarketingMediaProcessingJob = {
  jobId: string;
  assetId: string;
  operation: MarketingMediaProcessingOperation;
  status: "queued" | "processing" | "ready" | "failed" | "needs_review";
  idempotencyKey: string;
  provider: string | null;
  providerJobId: string | null;
  attempt: number;
  sourceAssetImmutable: true;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type MarketingMediaPublishEligibility =
  | { kind: "eligible" }
  | {
      kind: "blocked";
      code:
        | "asset_not_ready"
        | "restricted_release"
        | "raw_asset_not_reviewed"
        | "lineage_invalid";
    };

export const marketingMediaTelemetryBoundary = {
  fileNameAllowed: false,
  transcriptAllowed: false,
  participantIdentityAllowed: false,
  providerPayloadAllowed: false,
  providerSecretAllowed: false,
  safeIdentifiersAllowed: true,
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const OPAQUE_OBJECT_KEY_PATTERN = /^marketing-media\/[0-9a-f-]{36}\/[0-9a-f-]{36}(?:\.[a-z0-9]{1,10})?$/i;

function isFinitePositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function mimeAllowed(policy: MarketingMediaUploadPolicy, kind: MarketingMediaKind, mime: string) {
  return policy.allowedMimeTypes[kind].includes(mime);
}

export function validateMarketingMediaUpload(
  candidate: MarketingMediaUploadCandidate,
  policy: MarketingMediaUploadPolicy,
): MarketingMediaUploadValidation {
  if (
    !marketingMediaKinds.includes(candidate.mediaKind) ||
    typeof candidate.fileName !== "string" ||
    typeof candidate.declaredMimeType !== "string" ||
    typeof candidate.detectedMimeType !== "string"
  ) {
    return { kind: "invalid", code: "invalid_shape" };
  }
  if (!isFinitePositive(candidate.bytes)) {
    return { kind: "invalid", code: "invalid_size" };
  }
  if (candidate.declaredMimeType !== candidate.detectedMimeType) {
    return { kind: "invalid", code: "mime_mismatch" };
  }
  if (!mimeAllowed(policy, candidate.mediaKind, candidate.detectedMimeType)) {
    return { kind: "invalid", code: "mime_not_allowed" };
  }
  if (candidate.bytes > policy.maxBytesByKind[candidate.mediaKind]) {
    return { kind: "invalid", code: "file_too_large" };
  }
  const maxDuration = policy.maxDurationSecondsByKind[candidate.mediaKind];
  if (
    maxDuration !== undefined &&
    candidate.durationSeconds !== null &&
    candidate.durationSeconds > maxDuration
  ) {
    return { kind: "invalid", code: "duration_too_long" };
  }
  return { kind: "valid", mediaKind: candidate.mediaKind, mimeType: candidate.detectedMimeType };
}

export function isOpaqueMarketingMediaObjectKey(value: string): boolean {
  return OPAQUE_OBJECT_KEY_PATTERN.test(value);
}

export function isValidMarketingMediaIdempotencyKey(value: string): boolean {
  return IDEMPOTENCY_PATTERN.test(value);
}

export function validateMarketingMediaLineage(asset: MarketingMediaAsset): boolean {
  if (
    !UUID_PATTERN.test(asset.assetId) ||
    !UUID_PATTERN.test(asset.rawAssetId) ||
    !UUID_PATTERN.test(asset.uploadedByAdminAccountId) ||
    !isOpaqueMarketingMediaObjectKey(asset.objectKey)
  ) {
    return false;
  }
  if (asset.parentAssetId !== null && !UUID_PATTERN.test(asset.parentAssetId)) return false;

  const isRaw = asset.assetId === asset.rawAssetId;
  if (isRaw) {
    return asset.parentAssetId === null && asset.derivativeKind === null && asset.immutableRaw;
  }
  return (
    asset.parentAssetId !== null &&
    asset.derivativeKind !== null &&
    asset.derivativeKind.trim().length > 0 &&
    asset.immutableRaw
  );
}

export function getMarketingMediaPublishEligibility(
  asset: MarketingMediaAsset,
): MarketingMediaPublishEligibility {
  if (!validateMarketingMediaLineage(asset)) {
    return { kind: "blocked", code: "lineage_invalid" };
  }
  if (asset.releaseState === "restricted" || asset.releaseState === "expired" || asset.publishBlocked) {
    return { kind: "blocked", code: "restricted_release" };
  }
  if (asset.state !== "ready") {
    return { kind: "blocked", code: "asset_not_ready" };
  }
  if (asset.assetId === asset.rawAssetId) {
    return { kind: "blocked", code: "raw_asset_not_reviewed" };
  }
  return { kind: "eligible" };
}

export function parseMarketingMediaProcessingJob(value: unknown): MarketingMediaProcessingJob | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.jobId !== "string" ||
    !UUID_PATTERN.test(item.jobId) ||
    typeof item.assetId !== "string" ||
    !UUID_PATTERN.test(item.assetId) ||
    typeof item.operation !== "string" ||
    !marketingMediaProcessingOperations.includes(item.operation as MarketingMediaProcessingOperation) ||
    typeof item.status !== "string" ||
    !["queued", "processing", "ready", "failed", "needs_review"].includes(item.status) ||
    typeof item.idempotencyKey !== "string" ||
    !isValidMarketingMediaIdempotencyKey(item.idempotencyKey) ||
    !Number.isInteger(item.attempt) ||
    Number(item.attempt) < 1 ||
    item.sourceAssetImmutable !== true ||
    typeof item.createdAtUtc !== "string" ||
    Number.isNaN(Date.parse(item.createdAtUtc)) ||
    typeof item.updatedAtUtc !== "string" ||
    Number.isNaN(Date.parse(item.updatedAtUtc))
  ) {
    return null;
  }
  if (item.provider !== null && typeof item.provider !== "string") return null;
  if (item.providerJobId !== null && typeof item.providerJobId !== "string") return null;

  return {
    jobId: item.jobId,
    assetId: item.assetId,
    operation: item.operation as MarketingMediaProcessingOperation,
    status: item.status as MarketingMediaProcessingJob["status"],
    idempotencyKey: item.idempotencyKey,
    provider: item.provider as string | null,
    providerJobId: item.providerJobId as string | null,
    attempt: Number(item.attempt),
    sourceAssetImmutable: true,
    createdAtUtc: item.createdAtUtc,
    updatedAtUtc: item.updatedAtUtc,
  };
}

export function safeMarketingMediaTelemetry(input: {
  assetId?: string | null;
  jobId?: string | null;
  operation?: MarketingMediaProcessingOperation | null;
  status?: string | null;
  bytes?: number | null;
  failureClass?: string | null;
}) {
  return {
    assetId: input.assetId ?? null,
    jobId: input.jobId ?? null,
    operation: input.operation ?? null,
    status: input.status ?? null,
    bytes: input.bytes ?? null,
    failureClass: input.failureClass ?? null,
  };
}
