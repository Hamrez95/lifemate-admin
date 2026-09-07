import { describe, expect, it } from "vitest";

import {
  buildCanonicalMarketingAttributionUrl,
  derivativeMutationInvalidatesApproval,
  nativeInteractionRequiresManualStep,
  parseMarketingDerivative,
  parseMarketingDerivativeGenerationJob,
  parseMarketingManualPublishReconciliation,
  resolveMarketingPublishReadiness,
  type MarketingDerivative,
} from "./marketing-repurpose-contract";

const DERIVATIVE_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_ID = "22222222-2222-4222-8222-222222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const ADMIN_ID = "44444444-4444-4444-8444-444444444444";
const JOB_ID = "55555555-5555-4555-8555-555555555555";
const APPROVAL_FINGERPRINT = "a".repeat(64);

function derivative(overrides: Partial<MarketingDerivative> = {}): MarketingDerivative {
  return {
    derivativeId: DERIVATIVE_ID,
    revision: 2,
    sourceCreativeId: SOURCE_ID,
    sourceCreativeRevision: 4,
    destination: "linkedin_company",
    formatCode: "linkedin.company.post",
    locale: "en-US",
    body: "A bounded product update with no new health claim.",
    assets: [
      {
        assetId: ASSET_ID,
        order: 1,
        usage: "publish_asset",
        sourceRevision: 3,
      },
    ],
    ctaLabel: "Learn more",
    destinationUrl: "https://lifemate.app/product",
    linkVersion: "utm.v1",
    campaignCode: "launch.autumn",
    attributionContentId: "creative.42.linkedin.company",
    provenance: "manual",
    provider: null,
    model: null,
    policyVersion: "marketing.v1",
    brandContextVersion: "brand.v3",
    providerCapabilities: {
      provider: "linkedin",
      providerAccountRef: null,
      connected: false,
      verified: false,
      verifiedAtUtc: null,
      formatSupported: true,
      nativeInteractiveSupported: false,
      apiPublishSupported: false,
      manualFallbackAllowed: true,
      capabilityVersion: "linkedin.v1",
    },
    claims: [
      {
        claimKey: "product.current-capability",
        text: "LifeMate keeps relationship permissions explicit.",
        riskClass: "product_capability",
        approvedSourceRef: "product-copy.relationships",
        approvedSourceVersion: "copy.v2",
        material: true,
      },
    ],
    state: "needs_review",
    approvalRevision: null,
    approvalMaterialFingerprint: null,
    generatedAtUtc: "2026-09-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("marketing repurpose contract", () => {
  it("accepts a bounded manual derivative and preserves source lineage", () => {
    const parsed = parseMarketingDerivative(derivative());

    expect(parsed.kind).toBe("valid");
    if (parsed.kind !== "valid") return;
    expect(parsed.data.sourceCreativeId).toBe(SOURCE_ID);
    expect(parsed.data.sourceCreativeRevision).toBe(4);
    expect(parsed.data.assets[0]?.sourceRevision).toBe(3);
  });

  it("rejects blocked clinical or emergency claims", () => {
    const parsed = parseMarketingDerivative(
      derivative({
        claims: [
          {
            claimKey: "unsafe.claim",
            text: "Unsafe clinical claim",
            riskClass: "blocked_clinical_or_emergency",
            approvedSourceRef: "review.invalid",
            approvedSourceVersion: "v1",
            material: true,
          },
        ],
      }),
    );

    expect(parsed).toEqual({ kind: "invalid", code: "blocked_claim" });
  });

  it("requires approved provenance for every material claim", () => {
    const parsed = parseMarketingDerivative(
      derivative({
        claims: [
          {
            claimKey: "pricing.claim",
            text: "A material pricing statement",
            riskClass: "pricing_availability",
            approvedSourceRef: null,
            approvedSourceVersion: null,
            material: true,
          },
        ],
      }),
    );

    expect(parsed).toEqual({ kind: "invalid", code: "invalid_claim" });
  });

  it("requires approval to match the exact derivative revision", () => {
    const parsed = parseMarketingDerivative(
      derivative({
        approvalRevision: 1,
        approvalMaterialFingerprint: APPROVAL_FINGERPRINT,
      }),
    );

    expect(parsed).toEqual({ kind: "invalid", code: "approval_revision_mismatch" });
  });

  it("invalidates approval when material copy, CTA, assets, links or claims change", () => {
    const before = derivative();
    const after = derivative({ body: "Changed copy that must be reviewed independently." });

    expect(derivativeMutationInvalidatesApproval(before, after)).toBe(true);
    expect(derivativeMutationInvalidatesApproval(before, { ...before })).toBe(false);
  });

  it("uses truthful manual fallback when provider verification is unavailable", () => {
    expect(resolveMarketingPublishReadiness(derivative())).toEqual({
      kind: "manual_required",
      reason: "provider_unverified",
    });
  });

  it("allows API readiness only from a verified compatible capability snapshot", () => {
    const ready = derivative({
      providerCapabilities: {
        provider: "linkedin",
        providerAccountRef: "org:lifemate",
        connected: true,
        verified: true,
        verifiedAtUtc: "2026-09-08T00:00:00.000Z",
        formatSupported: true,
        nativeInteractiveSupported: false,
        apiPublishSupported: true,
        manualFallbackAllowed: true,
        capabilityVersion: "linkedin.v2",
      },
    });

    expect(resolveMarketingPublishReadiness(ready)).toEqual({
      kind: "api_ready",
      provider: "linkedin",
    });
  });

  it("keeps unsupported native interactions as an explicit manual step", () => {
    expect(nativeInteractionRequiresManualStep(derivative(), true)).toBe(true);
    expect(nativeInteractionRequiresManualStep(derivative(), false)).toBe(false);
  });

  it("normalizes attribution only for approved HTTPS domains and replaces stale UTMs", () => {
    const url = buildCanonicalMarketingAttributionUrl({
      destinationUrl: "https://lifemate.app/product?utm_source=old&ref=hero#section",
      approvedDomains: ["lifemate.app"],
      source: "linkedin",
      medium: "organic_social",
      campaign: "autumn_launch",
      content: "creative_42",
    });

    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.hash).toBe("");
    expect(parsed.searchParams.get("utm_source")).toBe("linkedin");
    expect(parsed.searchParams.get("utm_medium")).toBe("organic_social");
    expect(parsed.searchParams.get("utm_campaign")).toBe("autumn_launch");
    expect(parsed.searchParams.get("utm_content")).toBe("creative_42");
    expect(parsed.searchParams.get("ref")).toBe("hero");
  });

  it("rejects unsafe attribution destinations", () => {
    expect(
      buildCanonicalMarketingAttributionUrl({
        destinationUrl: "javascript:alert(1)",
        approvedDomains: ["lifemate.app"],
        source: "instagram",
        medium: "organic_social",
        campaign: "launch",
        content: "creative_42",
      }),
    ).toBeNull();
    expect(
      buildCanonicalMarketingAttributionUrl({
        destinationUrl: "https://evil.example/path",
        approvedDomains: ["lifemate.app"],
        source: "instagram",
        medium: "organic_social",
        campaign: "launch",
        content: "creative_42",
      }),
    ).toBeNull();
  });

  it("accepts bounded idempotent generation job metadata", () => {
    expect(
      parseMarketingDerivativeGenerationJob({
        jobId: JOB_ID,
        sourceCreativeId: SOURCE_ID,
        sourceCreativeRevision: 4,
        destination: "instagram_story",
        idempotencyKey: "repurpose:source-42:story:v4",
        status: "queued",
        attempt: 1,
        policyVersion: "marketing.v1",
        brandContextVersion: "brand.v3",
        provider: null,
        model: null,
        createdAtUtc: "2026-09-08T00:00:00.000Z",
        updatedAtUtc: "2026-09-08T00:00:00.000Z",
      }),
    ).not.toBeNull();
  });

  it("keeps manual reconciliation distinct from API-verified publish", () => {
    expect(
      parseMarketingManualPublishReconciliation({
        derivativeId: DERIVATIVE_ID,
        derivativeRevision: 2,
        provider: "linkedin",
        externalPostId: "post-123",
        externalUrl: "https://www.linkedin.com/feed/update/post-123",
        reconciledByAdminAccountId: ADMIN_ID,
        reconciledAtUtc: "2026-09-08T00:10:00.000Z",
        reason: "Operator verified the manually published post.",
        provenance: "manual_reconciliation",
      }),
    ).toMatchObject({ provenance: "manual_reconciliation" });
  });
});
