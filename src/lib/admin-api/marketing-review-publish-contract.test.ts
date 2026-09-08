import { describe, expect, it } from "vitest";

import {
  canBlindRetryMarketingPublish,
  canCancelMarketingPublish,
  canRetryMarketingPublish,
  requiresMarketingPublishReconciliation,
  resolveMarketingPublishEligibility,
  scheduledExecutionIsSuperseded,
  validateMarketingPublishAuditRecord,
  validateMarketingPublishPackage,
  validateMarketingReviewApproval,
  validateMarketingScheduleRequest,
  type MarketingProviderPublishReadiness,
  type MarketingPublishPackage,
  type MarketingReviewApproval,
} from "./marketing-review-publish-contract";

const PACKAGE_ID = "11111111-1111-4111-8111-111111111111";
const CREATIVE_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const REVIEWER_ID = "44444444-4444-4444-8444-444444444444";
const AUDIT_ID = "55555555-5555-4555-8555-555555555555";
const FINGERPRINT = "a".repeat(64);

function publishPackage(overrides: Partial<MarketingPublishPackage> = {}): MarketingPublishPackage {
  return {
    packageId: PACKAGE_ID,
    revision: 3,
    sourceCreativeId: CREATIVE_ID,
    sourceCreativeRevision: 5,
    campaignId: null,
    derivativeId: null,
    derivativeRevision: null,
    destination: "linkedin_company",
    providerCode: "linkedin",
    formatCode: "linkedin.company.post",
    locale: "en-US",
    publishText: "Approved bounded LifeMate product copy.",
    title: null,
    coverAssetId: null,
    assets: [{ assetId: ASSET_ID, order: 1, revision: 2, state: "ready" }],
    ctaLabel: "Learn more",
    destinationUrl: "https://lifemate.app/product",
    riskClass: "product_claim",
    materialFingerprintSha256: FINGERPRINT,
    lastMeaningfulChangeAtUtc: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

function approval(overrides: Partial<MarketingReviewApproval> = {}): MarketingReviewApproval {
  return {
    packageId: PACKAGE_ID,
    packageRevision: 3,
    materialFingerprintSha256: FINGERPRINT,
    decision: "approved",
    reviewerAdminAccountId: REVIEWER_ID,
    reason: "Reviewed the exact current revision and approved it.",
    decidedAtUtc: "2026-09-08T00:05:00.000Z",
    ...overrides,
  };
}

function provider(
  overrides: Partial<MarketingProviderPublishReadiness> = {},
): MarketingProviderPublishReadiness {
  return {
    providerCode: "linkedin",
    connectivity: "Verified",
    publishing: "Supported",
    format: "Supported",
    scheduling: "Supported",
    lastVerifiedAtUtc: "2026-09-08T00:00:00.000Z",
    verificationFresh: true,
    credentialPresent: true,
    operatorEnabled: true,
    manualFallbackAllowed: true,
    ...overrides,
  };
}

describe("marketing review and publish safety contract", () => {
  it("accepts a valid exact-revision publish package and approval", () => {
    expect(validateMarketingPublishPackage(publishPackage())).toBe(true);
    expect(validateMarketingReviewApproval(approval())).toBe(true);
  });

  it("requires exact current revision and material fingerprint approval", () => {
    expect(
      resolveMarketingPublishEligibility(
        publishPackage(),
        approval({ packageRevision: 2 }),
        provider(),
      ),
    ).toEqual({ kind: "blocked", reason: "approval_revision_changed" });

    expect(
      resolveMarketingPublishEligibility(
        publishPackage(),
        approval({ materialFingerprintSha256: "b".repeat(64) }),
        provider(),
      ),
    ).toEqual({ kind: "blocked", reason: "approval_material_changed" });
  });

  it("blocks missing, restricted and still-processing assets", () => {
    expect(
      resolveMarketingPublishEligibility(
        publishPackage({
          assets: [{ assetId: ASSET_ID, order: 1, revision: 2, state: "missing" }],
        }),
        approval(),
        provider(),
      ),
    ).toEqual({ kind: "blocked", reason: "asset_missing" });

    expect(
      resolveMarketingPublishEligibility(
        publishPackage({
          assets: [{ assetId: ASSET_ID, order: 1, revision: 2, state: "restricted" }],
        }),
        approval(),
        provider(),
      ),
    ).toEqual({ kind: "blocked", reason: "asset_restricted" });

    expect(
      resolveMarketingPublishEligibility(
        publishPackage({
          assets: [{ assetId: ASSET_ID, order: 1, revision: 2, state: "processing" }],
        }),
        approval(),
        provider(),
      ),
    ).toEqual({ kind: "blocked", reason: "asset_processing" });
  });

  it("never permits blocked clinical or emergency content", () => {
    expect(
      resolveMarketingPublishEligibility(
        publishPackage({ riskClass: "blocked_clinical_or_emergency" }),
        approval(),
        provider(),
      ),
    ).toEqual({ kind: "blocked", reason: "blocked_risk" });
  });

  it("does not treat credential presence as provider verification", () => {
    expect(
      resolveMarketingPublishEligibility(
        publishPackage(),
        approval(),
        provider({ connectivity: "NotVerified", verificationFresh: false }),
      ),
    ).toEqual({ kind: "eligible_manual", reason: "provider_unverified" });
  });

  it("allows API publish only for fresh verified supported capability", () => {
    expect(resolveMarketingPublishEligibility(publishPackage(), approval(), provider())).toEqual({
      kind: "eligible_api",
    });

    expect(
      resolveMarketingPublishEligibility(
        publishPackage(),
        approval(),
        provider({ format: "Unsupported" }),
      ),
    ).toEqual({ kind: "eligible_manual", reason: "capability_unsupported" });
  });

  it("fails closed when manual fallback is disabled", () => {
    expect(
      resolveMarketingPublishEligibility(
        publishPackage(),
        approval(),
        provider({
          connectivity: "NotVerified",
          verificationFresh: false,
          manualFallbackAllowed: false,
        }),
      ),
    ).toEqual({ kind: "blocked", reason: "manual_fallback_disabled" });
  });

  it("requires verified provider-native scheduling but allows LifeMate worker scheduling contract", () => {
    const request = {
      packageId: PACKAGE_ID,
      packageRevision: 3,
      materialFingerprintSha256: FINGERPRINT,
      scheduledLocal: "2026-09-09T09:30",
      timezone: "Asia/Tehran" as const,
      executionMode: "provider_native" as const,
      idempotencyKey: "publish:package-111:revision-3",
      reason: "Approved exact revision scheduled by an authorized operator.",
    };

    expect(validateMarketingScheduleRequest(request, provider())).toEqual({ kind: "valid" });
    expect(
      validateMarketingScheduleRequest(
        request,
        provider({ connectivity: "NotVerified", verificationFresh: false }),
      ),
    ).toEqual({ kind: "invalid", code: "provider_native_not_verified" });

    expect(
      validateMarketingScheduleRequest(
        { ...request, executionMode: "lifemate_worker" },
        provider({ connectivity: "NotVerified", verificationFresh: false }),
      ),
    ).toEqual({ kind: "valid" });
  });

  it("never blind-retries OutcomeUnknown", () => {
    expect(canRetryMarketingPublish("failed_retryable")).toBe(true);
    expect(canBlindRetryMarketingPublish("failed_retryable")).toBe(true);
    expect(requiresMarketingPublishReconciliation("outcome_unknown")).toBe(true);
    expect(canBlindRetryMarketingPublish("outcome_unknown")).toBe(false);
    expect(canCancelMarketingPublish("scheduled")).toBe(true);
    expect(canCancelMarketingPublish("publishing")).toBe(false);
  });

  it("marks an execution superseded when package revision or material changes", () => {
    expect(
      scheduledExecutionIsSuperseded(
        { packageRevision: 3, materialFingerprintSha256: FINGERPRINT },
        { revision: 4, materialFingerprintSha256: FINGERPRINT },
      ),
    ).toBe(true);
    expect(
      scheduledExecutionIsSuperseded(
        { packageRevision: 3, materialFingerprintSha256: FINGERPRINT },
        { revision: 3, materialFingerprintSha256: FINGERPRINT },
      ),
    ).toBe(false);
  });

  it("requires privacy-safe auditable action metadata", () => {
    expect(
      validateMarketingPublishAuditRecord({
        auditId: AUDIT_ID,
        action: "schedule",
        actorAdminAccountId: REVIEWER_ID,
        packageId: PACKAGE_ID,
        packageRevision: 3,
        executionId: null,
        providerCode: "linkedin",
        reason: "Schedule current approved revision for the planned window.",
        correlationId: "corr:publish:20260908:001",
        occurredAtUtc: "2026-09-08T00:10:00.000Z",
        rawProviderPayloadIncluded: false,
      }),
    ).toBe(true);
  });
});
