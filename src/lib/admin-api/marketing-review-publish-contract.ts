import type { MarketingCapabilityState, MarketingProviderConnectivity } from "./marketing-channels";

export const marketingReviewRiskClasses = [
  "low_risk",
  "product_claim",
  "health_education_review_required",
  "women_health_sensitive_review_required",
  "pricing_promotion",
  "privacy_security_legal",
  "blocked_clinical_or_emergency",
] as const;

export const marketingReviewQueueStates = [
  "needs_content_work",
  "needs_asset_work",
  "ready_for_human_review",
  "changes_requested",
  "approved_not_scheduled",
  "ready_for_manual_publish",
  "scheduled",
  "publishing",
  "published_api_verified",
  "published_manual_reconciled",
  "failed_retryable",
  "failed_permanent",
  "outcome_unknown",
  "cancelled",
  "superseded",
] as const;

export const marketingReviewDecisions = ["approved", "changes_requested", "rejected"] as const;
export const marketingPublishExecutionStates = [
  "scheduled",
  "claimed",
  "publishing",
  "published_api_verified",
  "failed_retryable",
  "failed_permanent",
  "outcome_unknown",
  "cancelled",
  "reconciled",
  "superseded",
] as const;

export type MarketingReviewRiskClass = (typeof marketingReviewRiskClasses)[number];
export type MarketingReviewQueueState = (typeof marketingReviewQueueStates)[number];
export type MarketingReviewDecision = (typeof marketingReviewDecisions)[number];
export type MarketingPublishExecutionState = (typeof marketingPublishExecutionStates)[number];

export type MarketingReviewAsset = {
  assetId: string;
  order: number;
  revision: number;
  state: "ready" | "missing" | "restricted" | "processing";
};

export type MarketingPublishPackage = {
  packageId: string;
  revision: number;
  sourceCreativeId: string;
  sourceCreativeRevision: number;
  campaignId: string | null;
  derivativeId: string | null;
  derivativeRevision: number | null;
  destination: string;
  providerCode: string;
  formatCode: string;
  locale: "fa-IR" | "en-US";
  publishText: string;
  title: string | null;
  coverAssetId: string | null;
  assets: MarketingReviewAsset[];
  ctaLabel: string | null;
  destinationUrl: string | null;
  riskClass: MarketingReviewRiskClass;
  materialFingerprintSha256: string;
  lastMeaningfulChangeAtUtc: string;
};

export type MarketingReviewApproval = {
  packageId: string;
  packageRevision: number;
  materialFingerprintSha256: string;
  decision: MarketingReviewDecision;
  reviewerAdminAccountId: string;
  reason: string;
  decidedAtUtc: string;
};

export type MarketingProviderPublishReadiness = {
  providerCode: string;
  connectivity: MarketingProviderConnectivity;
  publishing: MarketingCapabilityState;
  format: MarketingCapabilityState;
  scheduling: MarketingCapabilityState;
  lastVerifiedAtUtc: string | null;
  verificationFresh: boolean;
  credentialPresent: boolean;
  operatorEnabled: boolean;
  manualFallbackAllowed: boolean;
};

export type MarketingPublishEligibility =
  | { kind: "eligible_api" }
  | { kind: "eligible_manual"; reason: "provider_unverified" | "capability_unsupported" }
  | {
      kind: "blocked";
      reason:
        | "approval_missing"
        | "approval_revision_changed"
        | "approval_material_changed"
        | "approval_not_approved"
        | "asset_missing"
        | "asset_restricted"
        | "asset_processing"
        | "blocked_risk"
        | "provider_disabled"
        | "provider_stale"
        | "provider_reconnect_required"
        | "provider_rate_limited"
        | "provider_unavailable"
        | "capability_not_verified"
        | "manual_fallback_disabled";
    };

export type MarketingScheduleRequest = {
  packageId: string;
  packageRevision: number;
  materialFingerprintSha256: string;
  scheduledLocal: string;
  timezone: "Asia/Tehran" | "UTC";
  executionMode: "lifemate_worker" | "provider_native" | "manual";
  idempotencyKey: string;
  reason: string;
};

export type MarketingScheduleValidation =
  | { kind: "valid" }
  | {
      kind: "invalid";
      code:
        | "invalid_identifier"
        | "invalid_revision"
        | "invalid_fingerprint"
        | "invalid_local_time"
        | "invalid_timezone"
        | "invalid_idempotency_key"
        | "invalid_reason"
        | "provider_native_not_verified";
    };

export type MarketingPublishExecution = {
  executionId: string;
  packageId: string;
  packageRevision: number;
  materialFingerprintSha256: string;
  providerCode: string;
  executionMode: "lifemate_worker" | "provider_native" | "manual";
  state: MarketingPublishExecutionState;
  idempotencyKey: string;
  retryOfExecutionId: string | null;
  scheduledForUtc: string | null;
  scheduleTimezone: string | null;
  providerPostRef: string | null;
  failureClass: MarketingPublishFailureClass | null;
  attempt: number;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export const marketingPublishFailureClasses = [
  "approval_missing",
  "revision_changed",
  "asset_unavailable",
  "provider_not_configured",
  "provider_verification_stale",
  "credential_expired",
  "reconnect_required",
  "rate_limited",
  "unsupported_capability",
  "provider_rejected",
  "transient_upstream",
  "permanent_request_invalid",
  "timeout",
  "outcome_unknown",
] as const;
export type MarketingPublishFailureClass = (typeof marketingPublishFailureClasses)[number];

export type MarketingPublishAuditAction =
  | "approve"
  | "request_changes"
  | "reject"
  | "schedule"
  | "cancel"
  | "publish_attempt"
  | "retry"
  | "manual_reconcile"
  | "outcome_reconcile";

export type MarketingPublishAuditRecord = {
  auditId: string;
  action: MarketingPublishAuditAction;
  actorAdminAccountId: string;
  packageId: string;
  packageRevision: number;
  executionId: string | null;
  providerCode: string;
  reason: string;
  correlationId: string;
  occurredAtUtc: string;
  rawProviderPayloadIncluded: false;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;
const CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,95}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const LOCAL_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;
const MAX_PUBLISH_TEXT = 5_000;
const MAX_REASON = 1_000;

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function validInstant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function orderedAssetsValid(assets: MarketingReviewAsset[]): boolean {
  if (assets.length > 20) return false;
  const sorted = [...assets].sort((a, b) => a.order - b.order);
  if (new Set(sorted.map((asset) => asset.assetId)).size !== sorted.length) return false;
  return sorted.every(
    (asset, index) =>
      UUID_PATTERN.test(asset.assetId) &&
      asset.order === index + 1 &&
      Number.isInteger(asset.revision) &&
      asset.revision >= 1 &&
      ["ready", "missing", "restricted", "processing"].includes(asset.state),
  );
}

export function validateMarketingPublishPackage(value: MarketingPublishPackage): boolean {
  if (!UUID_PATTERN.test(value.packageId) || !UUID_PATTERN.test(value.sourceCreativeId))
    return false;
  if (value.campaignId !== null && !UUID_PATTERN.test(value.campaignId)) return false;
  if (value.derivativeId !== null && !UUID_PATTERN.test(value.derivativeId)) return false;
  if (
    !Number.isInteger(value.revision) ||
    value.revision < 1 ||
    !Number.isInteger(value.sourceCreativeRevision) ||
    value.sourceCreativeRevision < 1 ||
    (value.derivativeRevision !== null &&
      (!Number.isInteger(value.derivativeRevision) || value.derivativeRevision < 1))
  ) {
    return false;
  }
  if (!PROVIDER_PATTERN.test(value.providerCode)) return false;
  if (!CODE_PATTERN.test(value.formatCode) || !boundedText(value.destination, 120)) return false;
  if (value.locale !== "fa-IR" && value.locale !== "en-US") return false;
  if (!boundedText(value.publishText, MAX_PUBLISH_TEXT)) return false;
  if (value.title !== null && !boundedText(value.title, 240)) return false;
  if (value.coverAssetId !== null && !UUID_PATTERN.test(value.coverAssetId)) return false;
  if (!orderedAssetsValid(value.assets)) return false;
  if (value.ctaLabel !== null && !boundedText(value.ctaLabel, 240)) return false;
  if (value.destinationUrl !== null) {
    try {
      const url = new URL(value.destinationUrl);
      if (url.protocol !== "https:" || url.username || url.password) return false;
    } catch {
      return false;
    }
  }
  if (!marketingReviewRiskClasses.includes(value.riskClass)) return false;
  if (!SHA256_PATTERN.test(value.materialFingerprintSha256)) return false;
  return validInstant(value.lastMeaningfulChangeAtUtc);
}

export function validateMarketingReviewApproval(value: MarketingReviewApproval): boolean {
  return (
    UUID_PATTERN.test(value.packageId) &&
    Number.isInteger(value.packageRevision) &&
    value.packageRevision >= 1 &&
    SHA256_PATTERN.test(value.materialFingerprintSha256) &&
    marketingReviewDecisions.includes(value.decision) &&
    UUID_PATTERN.test(value.reviewerAdminAccountId) &&
    boundedText(value.reason, MAX_REASON) &&
    validInstant(value.decidedAtUtc)
  );
}

function providerManualFallback(
  provider: MarketingProviderPublishReadiness,
  reason: "provider_unverified" | "capability_unsupported",
): MarketingPublishEligibility {
  return provider.manualFallbackAllowed
    ? { kind: "eligible_manual", reason }
    : { kind: "blocked", reason: "manual_fallback_disabled" };
}

export function resolveMarketingPublishEligibility(
  publishPackage: MarketingPublishPackage,
  approval: MarketingReviewApproval | null,
  provider: MarketingProviderPublishReadiness,
): MarketingPublishEligibility {
  if (!approval) return { kind: "blocked", reason: "approval_missing" };
  if (
    approval.packageId !== publishPackage.packageId ||
    approval.packageRevision !== publishPackage.revision
  ) {
    return { kind: "blocked", reason: "approval_revision_changed" };
  }
  if (approval.materialFingerprintSha256 !== publishPackage.materialFingerprintSha256) {
    return { kind: "blocked", reason: "approval_material_changed" };
  }
  if (approval.decision !== "approved") return { kind: "blocked", reason: "approval_not_approved" };
  if (publishPackage.riskClass === "blocked_clinical_or_emergency") {
    return { kind: "blocked", reason: "blocked_risk" };
  }
  if (publishPackage.assets.some((asset) => asset.state === "missing")) {
    return { kind: "blocked", reason: "asset_missing" };
  }
  if (publishPackage.assets.some((asset) => asset.state === "restricted")) {
    return { kind: "blocked", reason: "asset_restricted" };
  }
  if (publishPackage.assets.some((asset) => asset.state === "processing")) {
    return { kind: "blocked", reason: "asset_processing" };
  }
  if (provider.providerCode !== publishPackage.providerCode || !provider.operatorEnabled) {
    return { kind: "blocked", reason: "provider_disabled" };
  }

  if (provider.connectivity === "RateLimited") {
    return { kind: "blocked", reason: "provider_rate_limited" };
  }
  if (
    provider.connectivity === "ReconnectRequired" ||
    provider.connectivity === "CredentialExpired"
  ) {
    return { kind: "blocked", reason: "provider_reconnect_required" };
  }
  if (provider.connectivity === "VerificationStale" || !provider.verificationFresh) {
    return providerManualFallback(provider, "provider_unverified");
  }
  if (
    provider.connectivity === "Disabled" ||
    provider.connectivity === "Unavailable" ||
    provider.connectivity === "Degraded"
  ) {
    return { kind: "blocked", reason: "provider_unavailable" };
  }
  if (provider.connectivity === "Unsupported") {
    return providerManualFallback(provider, "capability_unsupported");
  }
  if (provider.connectivity !== "Verified" || !provider.credentialPresent) {
    return providerManualFallback(provider, "provider_unverified");
  }
  if (provider.publishing === "Unsupported" || provider.format === "Unsupported") {
    return providerManualFallback(provider, "capability_unsupported");
  }
  if (provider.publishing !== "Supported" || provider.format !== "Supported") {
    return { kind: "blocked", reason: "capability_not_verified" };
  }
  return { kind: "eligible_api" };
}

export function validateMarketingScheduleRequest(
  request: MarketingScheduleRequest,
  provider: MarketingProviderPublishReadiness,
): MarketingScheduleValidation {
  if (!UUID_PATTERN.test(request.packageId)) return { kind: "invalid", code: "invalid_identifier" };
  if (!Number.isInteger(request.packageRevision) || request.packageRevision < 1) {
    return { kind: "invalid", code: "invalid_revision" };
  }
  if (!SHA256_PATTERN.test(request.materialFingerprintSha256)) {
    return { kind: "invalid", code: "invalid_fingerprint" };
  }
  if (!LOCAL_TIME_PATTERN.test(request.scheduledLocal)) {
    return { kind: "invalid", code: "invalid_local_time" };
  }
  if (request.timezone !== "Asia/Tehran" && request.timezone !== "UTC") {
    return { kind: "invalid", code: "invalid_timezone" };
  }
  if (!IDEMPOTENCY_PATTERN.test(request.idempotencyKey)) {
    return { kind: "invalid", code: "invalid_idempotency_key" };
  }
  if (!boundedText(request.reason, MAX_REASON)) return { kind: "invalid", code: "invalid_reason" };
  if (
    request.executionMode === "provider_native" &&
    (provider.connectivity !== "Verified" ||
      !provider.verificationFresh ||
      provider.scheduling !== "Supported")
  ) {
    return { kind: "invalid", code: "provider_native_not_verified" };
  }
  return { kind: "valid" };
}

const RETRYABLE_STATES = new Set<MarketingPublishExecutionState>(["failed_retryable"]);
const CANCELLABLE_STATES = new Set<MarketingPublishExecutionState>(["scheduled"]);

export function canRetryMarketingPublish(state: MarketingPublishExecutionState): boolean {
  return RETRYABLE_STATES.has(state);
}

export function canCancelMarketingPublish(state: MarketingPublishExecutionState): boolean {
  return CANCELLABLE_STATES.has(state);
}

export function requiresMarketingPublishReconciliation(
  state: MarketingPublishExecutionState,
): boolean {
  return state === "outcome_unknown";
}

export function canBlindRetryMarketingPublish(state: MarketingPublishExecutionState): boolean {
  return canRetryMarketingPublish(state) && !requiresMarketingPublishReconciliation(state);
}

export function scheduledExecutionIsSuperseded(
  execution: Pick<MarketingPublishExecution, "packageRevision" | "materialFingerprintSha256">,
  currentPackage: Pick<MarketingPublishPackage, "revision" | "materialFingerprintSha256">,
): boolean {
  return (
    execution.packageRevision !== currentPackage.revision ||
    execution.materialFingerprintSha256 !== currentPackage.materialFingerprintSha256
  );
}

export function validateMarketingPublishAuditRecord(record: MarketingPublishAuditRecord): boolean {
  return (
    UUID_PATTERN.test(record.auditId) &&
    [
      "approve",
      "request_changes",
      "reject",
      "schedule",
      "cancel",
      "publish_attempt",
      "retry",
      "manual_reconcile",
      "outcome_reconcile",
    ].includes(record.action) &&
    UUID_PATTERN.test(record.actorAdminAccountId) &&
    UUID_PATTERN.test(record.packageId) &&
    Number.isInteger(record.packageRevision) &&
    record.packageRevision >= 1 &&
    (record.executionId === null || UUID_PATTERN.test(record.executionId)) &&
    PROVIDER_PATTERN.test(record.providerCode) &&
    boundedText(record.reason, MAX_REASON) &&
    boundedText(record.correlationId, 180) &&
    validInstant(record.occurredAtUtc) &&
    record.rawProviderPayloadIncluded === false
  );
}

export const marketingReviewPublishBoundary = {
  exactRevisionApprovalRequired: true,
  materialEditInvalidatesApproval: true,
  providerCredentialPresenceProvesConnectivity: false,
  providerVerificationRequiredBeforeApiPublish: true,
  blockedClinicalEmergencyPublishAllowed: false,
  bulkSensitiveApprovalAllowed: false,
  outcomeUnknownBlindRetryAllowed: false,
  manualExportMarksPublished: false,
  rawProviderPayloadAllowedInBrowser: false,
  founderImplicitBypassAllowed: false,
  publishRequiresExplicitPermission: true,
} as const;
