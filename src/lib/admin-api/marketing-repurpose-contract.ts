export const marketingDerivativeDestinations = [
  "instagram_reel",
  "instagram_story",
  "instagram_feed_carousel",
  "linkedin_company",
  "linkedin_founder",
] as const;

export const marketingDerivativeStates = [
  "draft",
  "needs_review",
  "approved",
  "ready_for_manual_publish",
  "scheduled",
  "publishing",
  "published_api_verified",
  "published_manual_reconciled",
  "failed",
  "outcome_unknown",
] as const;

export const marketingDerivativeProvenance = ["manual", "model", "mechanical_transform"] as const;
export const marketingClaimRiskClasses = [
  "none",
  "product_capability",
  "pricing_availability",
  "health_education",
  "women_health_sensitive",
  "privacy_security_legal",
  "blocked_clinical_or_emergency",
] as const;

export type MarketingDerivativeDestination = (typeof marketingDerivativeDestinations)[number];
export type MarketingDerivativeState = (typeof marketingDerivativeStates)[number];
export type MarketingDerivativeProvenance = (typeof marketingDerivativeProvenance)[number];
export type MarketingClaimRiskClass = (typeof marketingClaimRiskClasses)[number];

export type MarketingDerivativeAsset = {
  assetId: string;
  order: number;
  usage: "publish_asset" | "approved_screenshot" | "concept_mockup";
  sourceRevision: number;
};

export type MarketingDerivativeClaim = {
  claimKey: string;
  text: string;
  riskClass: MarketingClaimRiskClass;
  approvedSourceRef: string | null;
  approvedSourceVersion: string | null;
  material: boolean;
};

export type MarketingProviderCapabilitySnapshot = {
  provider: string;
  providerAccountRef: string | null;
  connected: boolean;
  verified: boolean;
  verifiedAtUtc: string | null;
  formatSupported: boolean;
  nativeInteractiveSupported: boolean;
  apiPublishSupported: boolean;
  manualFallbackAllowed: boolean;
  capabilityVersion: string;
};

export type MarketingDerivative = {
  derivativeId: string;
  revision: number;
  sourceCreativeId: string;
  sourceCreativeRevision: number;
  destination: MarketingDerivativeDestination;
  formatCode: string;
  locale: "fa-IR" | "en-US";
  body: string;
  assets: MarketingDerivativeAsset[];
  ctaLabel: string | null;
  destinationUrl: string | null;
  linkVersion: string | null;
  campaignCode: string | null;
  attributionContentId: string;
  provenance: MarketingDerivativeProvenance;
  provider: string | null;
  model: string | null;
  policyVersion: string;
  brandContextVersion: string;
  providerCapabilities: MarketingProviderCapabilitySnapshot;
  claims: MarketingDerivativeClaim[];
  state: MarketingDerivativeState;
  approvalRevision: number | null;
  approvalMaterialFingerprint: string | null;
  generatedAtUtc: string;
};

export type MarketingDerivativeParseResult =
  | { kind: "valid"; data: MarketingDerivative }
  | {
      kind: "invalid";
      code:
        | "invalid_shape"
        | "invalid_identifier"
        | "invalid_revision"
        | "invalid_enum"
        | "field_too_long"
        | "invalid_assets"
        | "invalid_claim"
        | "unsafe_generation_metadata"
        | "approval_revision_mismatch"
        | "blocked_claim";
    };

export type MarketingDerivativeGenerationJob = {
  jobId: string;
  sourceCreativeId: string;
  sourceCreativeRevision: number;
  destination: MarketingDerivativeDestination;
  idempotencyKey: string;
  status: "queued" | "generating" | "ready" | "failed" | "needs_review";
  attempt: number;
  policyVersion: string;
  brandContextVersion: string;
  provider: string | null;
  model: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type MarketingPublishReadiness =
  | { kind: "api_ready"; provider: string }
  | { kind: "manual_required"; reason: "provider_unverified" | "format_unsupported" | "api_publish_unsupported" }
  | { kind: "unavailable"; reason: "manual_fallback_disabled" | "blocked_claim" };

export type MarketingManualPublishReconciliation = {
  derivativeId: string;
  derivativeRevision: number;
  provider: string;
  externalPostId: string | null;
  externalUrl: string | null;
  reconciledByAdminAccountId: string;
  reconciledAtUtc: string;
  reason: string;
  provenance: "manual_reconciliation";
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STABLE_CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,95}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const MAX_BODY = 5_000;
const MAX_SHORT = 240;
const MAX_ASSETS = 20;
const MAX_CLAIMS = 24;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function nullableBoundedText(value: unknown, max: number): value is string | null {
  return value === null || (typeof value === "string" && value.trim().length <= max);
}

function validInstant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseAsset(value: unknown): MarketingDerivativeAsset | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.assetId !== "string" ||
    !UUID_PATTERN.test(value.assetId) ||
    !Number.isInteger(value.order) ||
    Number(value.order) < 1 ||
    !Number.isInteger(value.sourceRevision) ||
    Number(value.sourceRevision) < 1
  ) {
    return null;
  }
  if (
    value.usage !== "publish_asset" &&
    value.usage !== "approved_screenshot" &&
    value.usage !== "concept_mockup"
  ) {
    return null;
  }
  return {
    assetId: value.assetId,
    order: Number(value.order),
    usage: value.usage,
    sourceRevision: Number(value.sourceRevision),
  };
}

function parseClaim(value: unknown): MarketingDerivativeClaim | null {
  if (!isRecord(value)) return null;
  if (!boundedText(value.claimKey, 96) || !STABLE_CODE_PATTERN.test(value.claimKey)) return null;
  if (!boundedText(value.text, 800) || typeof value.material !== "boolean") return null;
  if (
    typeof value.riskClass !== "string" ||
    !marketingClaimRiskClasses.includes(value.riskClass as MarketingClaimRiskClass)
  ) {
    return null;
  }
  if (!nullableBoundedText(value.approvedSourceRef, 240)) return null;
  if (
    value.approvedSourceVersion !== null &&
    (!boundedText(value.approvedSourceVersion, 96) ||
      !VERSION_PATTERN.test(value.approvedSourceVersion))
  ) {
    return null;
  }
  return {
    claimKey: value.claimKey,
    text: value.text.trim(),
    riskClass: value.riskClass as MarketingClaimRiskClass,
    approvedSourceRef:
      value.approvedSourceRef === null ? null : String(value.approvedSourceRef).trim(),
    approvedSourceVersion: value.approvedSourceVersion as string | null,
    material: value.material,
  };
}

export function parseMarketingProviderCapabilitySnapshot(
  value: unknown,
): MarketingProviderCapabilitySnapshot | null {
  if (!isRecord(value)) return null;
  if (!boundedText(value.provider, 96) || !STABLE_CODE_PATTERN.test(value.provider)) return null;
  if (!nullableBoundedText(value.providerAccountRef, 160)) return null;
  if (
    typeof value.connected !== "boolean" ||
    typeof value.verified !== "boolean" ||
    typeof value.formatSupported !== "boolean" ||
    typeof value.nativeInteractiveSupported !== "boolean" ||
    typeof value.apiPublishSupported !== "boolean" ||
    typeof value.manualFallbackAllowed !== "boolean" ||
    !boundedText(value.capabilityVersion, 96) ||
    !VERSION_PATTERN.test(value.capabilityVersion)
  ) {
    return null;
  }
  if (value.verifiedAtUtc !== null && !validInstant(value.verifiedAtUtc)) return null;
  if (value.verified && (!value.connected || value.verifiedAtUtc === null)) return null;
  return {
    provider: value.provider,
    providerAccountRef:
      value.providerAccountRef === null ? null : String(value.providerAccountRef).trim(),
    connected: value.connected,
    verified: value.verified,
    verifiedAtUtc: value.verifiedAtUtc as string | null,
    formatSupported: value.formatSupported,
    nativeInteractiveSupported: value.nativeInteractiveSupported,
    apiPublishSupported: value.apiPublishSupported,
    manualFallbackAllowed: value.manualFallbackAllowed,
    capabilityVersion: value.capabilityVersion,
  };
}

export function parseMarketingDerivative(value: unknown): MarketingDerivativeParseResult {
  if (!isRecord(value)) return { kind: "invalid", code: "invalid_shape" };
  if (
    typeof value.derivativeId !== "string" ||
    !UUID_PATTERN.test(value.derivativeId) ||
    typeof value.sourceCreativeId !== "string" ||
    !UUID_PATTERN.test(value.sourceCreativeId) ||
    !boundedText(value.attributionContentId, 96) ||
    !STABLE_CODE_PATTERN.test(value.attributionContentId)
  ) {
    return { kind: "invalid", code: "invalid_identifier" };
  }
  if (
    !Number.isInteger(value.revision) ||
    Number(value.revision) < 1 ||
    !Number.isInteger(value.sourceCreativeRevision) ||
    Number(value.sourceCreativeRevision) < 1
  ) {
    return { kind: "invalid", code: "invalid_revision" };
  }
  if (
    typeof value.destination !== "string" ||
    !marketingDerivativeDestinations.includes(value.destination as MarketingDerivativeDestination) ||
    typeof value.provenance !== "string" ||
    !marketingDerivativeProvenance.includes(value.provenance as MarketingDerivativeProvenance) ||
    typeof value.state !== "string" ||
    !marketingDerivativeStates.includes(value.state as MarketingDerivativeState) ||
    (value.locale !== "fa-IR" && value.locale !== "en-US")
  ) {
    return { kind: "invalid", code: "invalid_enum" };
  }
  if (
    !boundedText(value.formatCode, 96) ||
    !STABLE_CODE_PATTERN.test(value.formatCode) ||
    !boundedText(value.body, MAX_BODY) ||
    !nullableBoundedText(value.ctaLabel, MAX_SHORT) ||
    !nullableBoundedText(value.destinationUrl, 2_048) ||
    !nullableBoundedText(value.campaignCode, 96) ||
    !boundedText(value.policyVersion, 96) ||
    !VERSION_PATTERN.test(value.policyVersion) ||
    !boundedText(value.brandContextVersion, 96) ||
    !VERSION_PATTERN.test(value.brandContextVersion) ||
    !validInstant(value.generatedAtUtc)
  ) {
    return { kind: "invalid", code: "field_too_long" };
  }
  if (
    value.linkVersion !== null &&
    (!boundedText(value.linkVersion, 96) || !VERSION_PATTERN.test(value.linkVersion))
  ) {
    return { kind: "invalid", code: "field_too_long" };
  }

  if (!Array.isArray(value.assets) || value.assets.length > MAX_ASSETS) {
    return { kind: "invalid", code: "invalid_assets" };
  }
  const assets = value.assets.map(parseAsset);
  if (assets.some((asset) => asset === null)) return { kind: "invalid", code: "invalid_assets" };
  const concreteAssets = assets as MarketingDerivativeAsset[];
  const orderedAssets = [...concreteAssets].sort((a, b) => a.order - b.order);
  if (
    new Set(orderedAssets.map((asset) => asset.assetId)).size !== orderedAssets.length ||
    orderedAssets.some((asset, index) => asset.order !== index + 1)
  ) {
    return { kind: "invalid", code: "invalid_assets" };
  }

  if (!Array.isArray(value.claims) || value.claims.length > MAX_CLAIMS) {
    return { kind: "invalid", code: "invalid_claim" };
  }
  const claims = value.claims.map(parseClaim);
  if (claims.some((claim) => claim === null)) return { kind: "invalid", code: "invalid_claim" };
  const concreteClaims = claims as MarketingDerivativeClaim[];
  if (new Set(concreteClaims.map((claim) => claim.claimKey)).size !== concreteClaims.length) {
    return { kind: "invalid", code: "invalid_claim" };
  }
  if (concreteClaims.some((claim) => claim.riskClass === "blocked_clinical_or_emergency")) {
    return { kind: "invalid", code: "blocked_claim" };
  }
  if (
    concreteClaims.some(
      (claim) => claim.material && (!claim.approvedSourceRef || !claim.approvedSourceVersion),
    )
  ) {
    return { kind: "invalid", code: "invalid_claim" };
  }

  const capabilities = parseMarketingProviderCapabilitySnapshot(value.providerCapabilities);
  if (!capabilities) return { kind: "invalid", code: "invalid_shape" };
  if (value.provider !== null && value.provider !== capabilities.provider) {
    return { kind: "invalid", code: "invalid_shape" };
  }
  if (
    value.provenance === "manual" &&
    (value.provider !== null || value.model !== null)
  ) {
    return { kind: "invalid", code: "unsafe_generation_metadata" };
  }
  if (
    value.provenance === "model" &&
    (!boundedText(value.provider, 96) || !boundedText(value.model, 120))
  ) {
    return { kind: "invalid", code: "unsafe_generation_metadata" };
  }
  if (
    value.provenance === "mechanical_transform" &&
    value.model !== null
  ) {
    return { kind: "invalid", code: "unsafe_generation_metadata" };
  }

  if (value.approvalRevision !== null) {
    if (!Number.isInteger(value.approvalRevision) || Number(value.approvalRevision) < 1) {
      return { kind: "invalid", code: "invalid_revision" };
    }
    if (
      Number(value.approvalRevision) !== Number(value.revision) ||
      typeof value.approvalMaterialFingerprint !== "string" ||
      !FINGERPRINT_PATTERN.test(value.approvalMaterialFingerprint)
    ) {
      return { kind: "invalid", code: "approval_revision_mismatch" };
    }
  } else if (value.approvalMaterialFingerprint !== null) {
    return { kind: "invalid", code: "approval_revision_mismatch" };
  }

  return {
    kind: "valid",
    data: {
      derivativeId: value.derivativeId,
      revision: Number(value.revision),
      sourceCreativeId: value.sourceCreativeId,
      sourceCreativeRevision: Number(value.sourceCreativeRevision),
      destination: value.destination as MarketingDerivativeDestination,
      formatCode: value.formatCode,
      locale: value.locale,
      body: value.body.trim(),
      assets: orderedAssets,
      ctaLabel: value.ctaLabel === null ? null : String(value.ctaLabel).trim(),
      destinationUrl: value.destinationUrl as string | null,
      linkVersion: value.linkVersion as string | null,
      campaignCode: value.campaignCode as string | null,
      attributionContentId: value.attributionContentId,
      provenance: value.provenance as MarketingDerivativeProvenance,
      provider: value.provider as string | null,
      model: value.model as string | null,
      policyVersion: value.policyVersion,
      brandContextVersion: value.brandContextVersion,
      providerCapabilities: capabilities,
      claims: concreteClaims,
      state: value.state as MarketingDerivativeState,
      approvalRevision: value.approvalRevision === null ? null : Number(value.approvalRevision),
      approvalMaterialFingerprint: value.approvalMaterialFingerprint as string | null,
      generatedAtUtc: value.generatedAtUtc,
    },
  };
}

function materialAssetIdentity(assets: MarketingDerivativeAsset[]): string {
  return [...assets]
    .sort((a, b) => a.order - b.order)
    .map((asset) => `${asset.order}:${asset.assetId}:${asset.sourceRevision}:${asset.usage}`)
    .join("|");
}

function materialClaimIdentity(claims: MarketingDerivativeClaim[]): string {
  return [...claims]
    .sort((a, b) => a.claimKey.localeCompare(b.claimKey))
    .map(
      (claim) =>
        `${claim.claimKey}:${claim.text}:${claim.riskClass}:${claim.approvedSourceRef ?? ""}:${claim.approvedSourceVersion ?? ""}:${claim.material}`,
    )
    .join("|");
}

export function buildMarketingDerivativeMaterialIdentity(derivative: MarketingDerivative): string {
  return JSON.stringify({
    destination: derivative.destination,
    formatCode: derivative.formatCode,
    locale: derivative.locale,
    body: derivative.body,
    assets: materialAssetIdentity(derivative.assets),
    ctaLabel: derivative.ctaLabel,
    destinationUrl: derivative.destinationUrl,
    linkVersion: derivative.linkVersion,
    claims: materialClaimIdentity(derivative.claims),
  });
}

export function derivativeMutationInvalidatesApproval(
  before: MarketingDerivative,
  after: MarketingDerivative,
): boolean {
  return buildMarketingDerivativeMaterialIdentity(before) !== buildMarketingDerivativeMaterialIdentity(after);
}

export function resolveMarketingPublishReadiness(
  derivative: MarketingDerivative,
): MarketingPublishReadiness {
  if (derivative.claims.some((claim) => claim.riskClass === "blocked_clinical_or_emergency")) {
    return { kind: "unavailable", reason: "blocked_claim" };
  }
  const capability = derivative.providerCapabilities;
  if (
    capability.connected &&
    capability.verified &&
    capability.formatSupported &&
    capability.apiPublishSupported
  ) {
    return { kind: "api_ready", provider: capability.provider };
  }
  if (!capability.manualFallbackAllowed) {
    return { kind: "unavailable", reason: "manual_fallback_disabled" };
  }
  if (!capability.connected || !capability.verified) {
    return { kind: "manual_required", reason: "provider_unverified" };
  }
  if (!capability.formatSupported) {
    return { kind: "manual_required", reason: "format_unsupported" };
  }
  return { kind: "manual_required", reason: "api_publish_unsupported" };
}

export function nativeInteractionRequiresManualStep(
  derivative: MarketingDerivative,
  wantsNativeInteraction: boolean,
): boolean {
  return wantsNativeInteraction && !derivative.providerCapabilities.nativeInteractiveSupported;
}

export function buildCanonicalMarketingAttributionUrl(input: {
  destinationUrl: string;
  approvedDomains: string[];
  source: string;
  medium: string;
  campaign: string;
  content: string;
}): string | null {
  if (
    !boundedText(input.source, 96) ||
    !boundedText(input.medium, 96) ||
    !boundedText(input.campaign, 96) ||
    !boundedText(input.content, 96)
  ) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(input.destinationUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  const allowedHosts = new Set(input.approvedDomains.map((domain) => domain.trim().toLowerCase()));
  if (!allowedHosts.has(url.hostname.toLowerCase())) return null;
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  url.searchParams.set("utm_source", input.source.trim());
  url.searchParams.set("utm_medium", input.medium.trim());
  url.searchParams.set("utm_campaign", input.campaign.trim());
  url.searchParams.set("utm_content", input.content.trim());
  url.searchParams.sort();
  return url.toString();
}

export function parseMarketingDerivativeGenerationJob(
  value: unknown,
): MarketingDerivativeGenerationJob | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.jobId !== "string" ||
    !UUID_PATTERN.test(value.jobId) ||
    typeof value.sourceCreativeId !== "string" ||
    !UUID_PATTERN.test(value.sourceCreativeId) ||
    !Number.isInteger(value.sourceCreativeRevision) ||
    Number(value.sourceCreativeRevision) < 1 ||
    typeof value.destination !== "string" ||
    !marketingDerivativeDestinations.includes(value.destination as MarketingDerivativeDestination) ||
    typeof value.idempotencyKey !== "string" ||
    !IDEMPOTENCY_PATTERN.test(value.idempotencyKey) ||
    !Number.isInteger(value.attempt) ||
    Number(value.attempt) < 1 ||
    !boundedText(value.policyVersion, 96) ||
    !VERSION_PATTERN.test(value.policyVersion) ||
    !boundedText(value.brandContextVersion, 96) ||
    !VERSION_PATTERN.test(value.brandContextVersion) ||
    !validInstant(value.createdAtUtc) ||
    !validInstant(value.updatedAtUtc)
  ) {
    return null;
  }
  if (
    value.status !== "queued" &&
    value.status !== "generating" &&
    value.status !== "ready" &&
    value.status !== "failed" &&
    value.status !== "needs_review"
  ) {
    return null;
  }
  if (value.provider !== null && !boundedText(value.provider, 96)) return null;
  if (value.model !== null && !boundedText(value.model, 120)) return null;
  return {
    jobId: value.jobId,
    sourceCreativeId: value.sourceCreativeId,
    sourceCreativeRevision: Number(value.sourceCreativeRevision),
    destination: value.destination as MarketingDerivativeDestination,
    idempotencyKey: value.idempotencyKey,
    status: value.status,
    attempt: Number(value.attempt),
    policyVersion: value.policyVersion,
    brandContextVersion: value.brandContextVersion,
    provider: value.provider as string | null,
    model: value.model as string | null,
    createdAtUtc: value.createdAtUtc,
    updatedAtUtc: value.updatedAtUtc,
  };
}

export function parseMarketingManualPublishReconciliation(
  value: unknown,
): MarketingManualPublishReconciliation | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.derivativeId !== "string" ||
    !UUID_PATTERN.test(value.derivativeId) ||
    !Number.isInteger(value.derivativeRevision) ||
    Number(value.derivativeRevision) < 1 ||
    !boundedText(value.provider, 96) ||
    typeof value.reconciledByAdminAccountId !== "string" ||
    !UUID_PATTERN.test(value.reconciledByAdminAccountId) ||
    !validInstant(value.reconciledAtUtc) ||
    !boundedText(value.reason, 500) ||
    value.provenance !== "manual_reconciliation"
  ) {
    return null;
  }
  if (!nullableBoundedText(value.externalPostId, 240) || !nullableBoundedText(value.externalUrl, 2_048)) {
    return null;
  }
  if (value.externalPostId === null && value.externalUrl === null) return null;
  if (value.externalUrl !== null) {
    try {
      const url = new URL(value.externalUrl);
      if (url.protocol !== "https:" || url.username || url.password) return null;
    } catch {
      return null;
    }
  }
  return {
    derivativeId: value.derivativeId,
    derivativeRevision: Number(value.derivativeRevision),
    provider: value.provider,
    externalPostId: value.externalPostId as string | null,
    externalUrl: value.externalUrl as string | null,
    reconciledByAdminAccountId: value.reconciledByAdminAccountId,
    reconciledAtUtc: value.reconciledAtUtc,
    reason: value.reason.trim(),
    provenance: "manual_reconciliation",
  };
}

export const marketingRepurposeBoundary = {
  rawHealthDataAllowed: false,
  sensitiveAudienceFactsAllowed: false,
  sourceApprovalAutomaticallyInheritedByRewrite: false,
  unsupportedNativeInteractionMayPretendPublished: false,
  manualExportMarksPublished: false,
  siblingMutationAllowed: false,
  sourceMutationAllowed: false,
  materialClaimRequiresReview: true,
  providerSecretsAllowedInBrowserOrLogs: false,
} as const;
