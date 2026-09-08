export const marketingMetricAvailabilityStates = ["available", "unavailable", "partial"] as const;
export const marketingMetricSources = ["provider_verified", "manual_observation"] as const;
export const marketingContentEvidenceStates = [
  "active",
  "deleted",
  "removed",
  "private",
  "unknown",
] as const;
export const marketingTrafficScopes = ["organic", "paid", "mixed", "unknown"] as const;
export const marketingCreativeLearningStates = ["proposed", "accepted", "dismissed"] as const;

export type MarketingMetricAvailability = (typeof marketingMetricAvailabilityStates)[number];
export type MarketingMetricSource = (typeof marketingMetricSources)[number];
export type MarketingContentEvidenceState = (typeof marketingContentEvidenceStates)[number];
export type MarketingTrafficScope = (typeof marketingTrafficScopes)[number];
export type MarketingCreativeLearningState = (typeof marketingCreativeLearningStates)[number];

export type MarketingMetricWindow = {
  kind: "lifetime" | "rolling" | "calendar" | "provider_defined";
  startAtUtc: string | null;
  endAtUtc: string | null;
  providerWindowCode: string | null;
};

export type MarketingCreativeMetricObservation = {
  observationId: string;
  provider: string;
  providerAccountRef: string;
  providerContentId: string;
  creativeId: string;
  creativeRevision: number;
  metricKey: string;
  value: number | null;
  unit: "count" | "milliseconds" | "seconds" | "ratio" | "percent";
  availability: MarketingMetricAvailability;
  source: MarketingMetricSource;
  semanticDefinition: string;
  semanticVersion: string;
  trafficScope: MarketingTrafficScope;
  contentState: MarketingContentEvidenceState;
  window: MarketingMetricWindow;
  asOfUtc: string;
  freshUntilUtc: string | null;
  limitations: string[];
};

export type MarketingCreativeLearningMetadata = {
  creativeId: string;
  creativeRevision: number;
  patternCode: string | null;
  formatCode: string;
  productScope: string;
  goalCode: string | null;
  hookVariantCode: string | null;
  durationBucket: string | null;
  ctaTypeCode: string | null;
  creativeClassCode: string | null;
  templateVersion: string | null;
  publishedAtUtc: string;
};

export type MarketingMetricComparison =
  | { kind: "comparable" }
  | {
      kind: "not_comparable";
      reason:
        | "metric_unavailable"
        | "metric_partial"
        | "manual_observation"
        | "content_unavailable"
        | "provider_mismatch"
        | "metric_key_mismatch"
        | "semantic_mismatch"
        | "unit_mismatch"
        | "traffic_scope_mismatch"
        | "window_mismatch"
        | "stale_evidence";
    };

export type MarketingDerivedRate =
  | { kind: "available"; value: number; numerator: number; denominator: number }
  | {
      kind: "unavailable";
      reason:
        | "numerator_unavailable"
        | "denominator_unavailable"
        | "manual_observation"
        | "semantic_scope_mismatch"
        | "zero_denominator"
        | "stale_evidence";
    };

export type MarketingCreativeLearningEvidenceRef = {
  observationId: string;
  creativeId: string;
  creativeRevision: number;
};

export type MarketingCreativeLearning = {
  learningId: string;
  state: MarketingCreativeLearningState;
  statement: string;
  interpretation: string | null;
  evidence: MarketingCreativeLearningEvidenceRef[];
  sampleSize: number;
  periodStartUtc: string;
  periodEndUtc: string;
  generatedAtUtc: string;
  source: "operator" | "model";
  model: string | null;
  policyVersion: string;
  causalClaim: false;
};

export type MarketingLearningEligibility =
  | { kind: "eligible"; sampleSize: number }
  | {
      kind: "suppressed";
      reason:
        | "sample_too_small"
        | "missing_evidence"
        | "manual_evidence"
        | "stale_evidence"
        | "incomparable_evidence";
    };

export type MarketingMetricSyncCheckpoint = {
  provider: string;
  providerAccountRef: string;
  cursor: string | null;
  watermarkUtc: string | null;
  capabilityVersion: string;
  idempotencyKey: string;
  lastAttemptAtUtc: string | null;
  lastSuccessAtUtc: string | null;
  state: "idle" | "syncing" | "rate_limited" | "failed" | "unavailable";
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,127}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const MAX_LIMITATIONS = 12;
const MAX_LIMITATION = 500;

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nullableInstant(value: unknown): value is string | null {
  return value === null || instant(value);
}

function validWindow(window: MarketingMetricWindow): boolean {
  if (!["lifetime", "rolling", "calendar", "provider_defined"].includes(window.kind)) return false;
  if (!nullableInstant(window.startAtUtc) || !nullableInstant(window.endAtUtc)) return false;
  if (window.startAtUtc !== null && window.endAtUtc !== null) {
    if (Date.parse(window.endAtUtc) <= Date.parse(window.startAtUtc)) return false;
  }
  if (window.providerWindowCode !== null && !boundedText(window.providerWindowCode, 96)) return false;
  if (window.kind === "calendar" && (window.startAtUtc === null || window.endAtUtc === null)) return false;
  return true;
}

export function validateMarketingCreativeMetricObservation(
  value: MarketingCreativeMetricObservation,
): boolean {
  if (!UUID_PATTERN.test(value.observationId) || !UUID_PATTERN.test(value.creativeId)) return false;
  if (!Number.isInteger(value.creativeRevision) || value.creativeRevision < 1) return false;
  if (!boundedText(value.provider, 96) || !CODE_PATTERN.test(value.provider)) return false;
  if (!boundedText(value.providerAccountRef, 180) || !boundedText(value.providerContentId, 240)) {
    return false;
  }
  if (!boundedText(value.metricKey, 128) || !CODE_PATTERN.test(value.metricKey)) return false;
  if (!marketingMetricAvailabilityStates.includes(value.availability)) return false;
  if (!marketingMetricSources.includes(value.source)) return false;
  if (!marketingTrafficScopes.includes(value.trafficScope)) return false;
  if (!marketingContentEvidenceStates.includes(value.contentState)) return false;
  if (!["count", "milliseconds", "seconds", "ratio", "percent"].includes(value.unit)) return false;
  if (!boundedText(value.semanticDefinition, 1_000)) return false;
  if (!boundedText(value.semanticVersion, 96) || !VERSION_PATTERN.test(value.semanticVersion)) {
    return false;
  }
  if (!validWindow(value.window) || !instant(value.asOfUtc) || !nullableInstant(value.freshUntilUtc)) {
    return false;
  }
  if (value.freshUntilUtc !== null && Date.parse(value.freshUntilUtc) < Date.parse(value.asOfUtc)) {
    return false;
  }
  if (!Array.isArray(value.limitations) || value.limitations.length > MAX_LIMITATIONS) return false;
  if (value.limitations.some((limitation) => !boundedText(limitation, MAX_LIMITATION))) return false;
  if (value.availability === "unavailable") return value.value === null;
  if (value.value === null || !Number.isFinite(value.value) || value.value < 0) return false;
  if ((value.unit === "ratio" || value.unit === "percent") && value.value > 100) return false;
  return true;
}

export function marketingMetricIsFresh(
  metric: MarketingCreativeMetricObservation,
  nowUtc: string,
): boolean {
  if (!instant(nowUtc)) return false;
  if (metric.freshUntilUtc === null) return true;
  return Date.parse(metric.freshUntilUtc) >= Date.parse(nowUtc);
}

function sameWindow(a: MarketingMetricWindow, b: MarketingMetricWindow): boolean {
  return (
    a.kind === b.kind &&
    a.startAtUtc === b.startAtUtc &&
    a.endAtUtc === b.endAtUtc &&
    a.providerWindowCode === b.providerWindowCode
  );
}

export function compareMarketingMetricEvidence(
  left: MarketingCreativeMetricObservation,
  right: MarketingCreativeMetricObservation,
  nowUtc: string,
): MarketingMetricComparison {
  if (left.availability === "unavailable" || right.availability === "unavailable") {
    return { kind: "not_comparable", reason: "metric_unavailable" };
  }
  if (left.availability === "partial" || right.availability === "partial") {
    return { kind: "not_comparable", reason: "metric_partial" };
  }
  if (left.source !== "provider_verified" || right.source !== "provider_verified") {
    return { kind: "not_comparable", reason: "manual_observation" };
  }
  if (left.contentState !== "active" || right.contentState !== "active") {
    return { kind: "not_comparable", reason: "content_unavailable" };
  }
  if (left.provider !== right.provider) {
    return { kind: "not_comparable", reason: "provider_mismatch" };
  }
  if (left.metricKey !== right.metricKey) {
    return { kind: "not_comparable", reason: "metric_key_mismatch" };
  }
  if (
    left.semanticVersion !== right.semanticVersion ||
    left.semanticDefinition !== right.semanticDefinition
  ) {
    return { kind: "not_comparable", reason: "semantic_mismatch" };
  }
  if (left.unit !== right.unit) return { kind: "not_comparable", reason: "unit_mismatch" };
  if (left.trafficScope !== right.trafficScope) {
    return { kind: "not_comparable", reason: "traffic_scope_mismatch" };
  }
  if (!sameWindow(left.window, right.window)) {
    return { kind: "not_comparable", reason: "window_mismatch" };
  }
  if (!marketingMetricIsFresh(left, nowUtc) || !marketingMetricIsFresh(right, nowUtc)) {
    return { kind: "not_comparable", reason: "stale_evidence" };
  }
  return { kind: "comparable" };
}

export function deriveMarketingMetricRate(
  numerator: MarketingCreativeMetricObservation,
  denominator: MarketingCreativeMetricObservation,
  nowUtc: string,
): MarketingDerivedRate {
  if (numerator.source !== "provider_verified" || denominator.source !== "provider_verified") {
    return { kind: "unavailable", reason: "manual_observation" };
  }
  if (numerator.availability !== "available" || numerator.value === null) {
    return { kind: "unavailable", reason: "numerator_unavailable" };
  }
  if (denominator.availability !== "available" || denominator.value === null) {
    return { kind: "unavailable", reason: "denominator_unavailable" };
  }
  if (
    numerator.provider !== denominator.provider ||
    numerator.providerContentId !== denominator.providerContentId ||
    numerator.trafficScope !== denominator.trafficScope ||
    !sameWindow(numerator.window, denominator.window)
  ) {
    return { kind: "unavailable", reason: "semantic_scope_mismatch" };
  }
  if (!marketingMetricIsFresh(numerator, nowUtc) || !marketingMetricIsFresh(denominator, nowUtc)) {
    return { kind: "unavailable", reason: "stale_evidence" };
  }
  if (denominator.value === 0) return { kind: "unavailable", reason: "zero_denominator" };
  return {
    kind: "available",
    value: numerator.value / denominator.value,
    numerator: numerator.value,
    denominator: denominator.value,
  };
}

export function validateMarketingCreativeLearningMetadata(
  value: MarketingCreativeLearningMetadata,
): boolean {
  if (!UUID_PATTERN.test(value.creativeId)) return false;
  if (!Number.isInteger(value.creativeRevision) || value.creativeRevision < 1) return false;
  if (!CODE_PATTERN.test(value.formatCode) || !CODE_PATTERN.test(value.productScope)) return false;
  const optionalCodes = [
    value.patternCode,
    value.goalCode,
    value.hookVariantCode,
    value.durationBucket,
    value.ctaTypeCode,
    value.creativeClassCode,
  ];
  if (optionalCodes.some((code) => code !== null && (!boundedText(code, 128) || !CODE_PATTERN.test(code)))) {
    return false;
  }
  if (
    value.templateVersion !== null &&
    (!boundedText(value.templateVersion, 96) || !VERSION_PATTERN.test(value.templateVersion))
  ) {
    return false;
  }
  return instant(value.publishedAtUtc);
}

export function evaluateMarketingLearningEvidence(
  metrics: MarketingCreativeMetricObservation[],
  nowUtc: string,
  minimumSampleSize = 3,
): MarketingLearningEligibility {
  if (metrics.length === 0) return { kind: "suppressed", reason: "missing_evidence" };
  if (metrics.some((metric) => metric.source !== "provider_verified")) {
    return { kind: "suppressed", reason: "manual_evidence" };
  }
  if (metrics.some((metric) => !marketingMetricIsFresh(metric, nowUtc))) {
    return { kind: "suppressed", reason: "stale_evidence" };
  }
  const baseline = metrics[0];
  if (!baseline) return { kind: "suppressed", reason: "missing_evidence" };
  for (const metric of metrics.slice(1)) {
    const comparison = compareMarketingMetricEvidence(baseline, metric, nowUtc);
    if (comparison.kind !== "comparable") {
      return { kind: "suppressed", reason: "incomparable_evidence" };
    }
  }
  const creativeSampleSize = new Set(
    metrics.map((metric) => `${metric.creativeId}:${metric.creativeRevision}`),
  ).size;
  if (creativeSampleSize < minimumSampleSize) {
    return { kind: "suppressed", reason: "sample_too_small" };
  }
  return { kind: "eligible", sampleSize: creativeSampleSize };
}

export function validateMarketingCreativeLearning(value: MarketingCreativeLearning): boolean {
  if (!UUID_PATTERN.test(value.learningId)) return false;
  if (!marketingCreativeLearningStates.includes(value.state)) return false;
  if (!boundedText(value.statement, 1_000)) return false;
  if (value.interpretation !== null && !boundedText(value.interpretation, 2_000)) return false;
  if (!Array.isArray(value.evidence) || value.evidence.length < 1 || value.evidence.length > 100) {
    return false;
  }
  if (
    value.evidence.some(
      (ref) =>
        !UUID_PATTERN.test(ref.observationId) ||
        !UUID_PATTERN.test(ref.creativeId) ||
        !Number.isInteger(ref.creativeRevision) ||
        ref.creativeRevision < 1,
    )
  ) {
    return false;
  }
  if (!Number.isInteger(value.sampleSize) || value.sampleSize < 1) return false;
  if (!instant(value.periodStartUtc) || !instant(value.periodEndUtc) || !instant(value.generatedAtUtc)) {
    return false;
  }
  if (Date.parse(value.periodEndUtc) <= Date.parse(value.periodStartUtc)) return false;
  if (value.source !== "operator" && value.source !== "model") return false;
  if (value.source === "operator" && value.model !== null) return false;
  if (value.source === "model" && !boundedText(value.model, 120)) return false;
  if (!boundedText(value.policyVersion, 96) || !VERSION_PATTERN.test(value.policyVersion)) return false;
  return value.causalClaim === false;
}

export function validateMarketingMetricSyncCheckpoint(value: MarketingMetricSyncCheckpoint): boolean {
  if (!boundedText(value.provider, 96) || !CODE_PATTERN.test(value.provider)) return false;
  if (!boundedText(value.providerAccountRef, 180)) return false;
  if (value.cursor !== null && !boundedText(value.cursor, 1_000)) return false;
  if (!nullableInstant(value.watermarkUtc)) return false;
  if (!boundedText(value.capabilityVersion, 96) || !VERSION_PATTERN.test(value.capabilityVersion)) {
    return false;
  }
  if (!IDEMPOTENCY_PATTERN.test(value.idempotencyKey)) return false;
  if (!nullableInstant(value.lastAttemptAtUtc) || !nullableInstant(value.lastSuccessAtUtc)) return false;
  return ["idle", "syncing", "rate_limited", "failed", "unavailable"].includes(value.state);
}

export const marketingCreativeAnalyticsBoundary = {
  unavailableMetricCoercedToZero: false,
  manualObservationEligibleForAutomatedPerformanceClaims: false,
  crossProviderSemanticAssumptionAllowed: false,
  causalPerformanceClaimsAllowed: false,
  rawViewerIdentityAllowed: false,
  lifeMateHealthProfileJoinAllowed: false,
  providerSecretAllowedInBrowserOrLogs: false,
  financialSpendCacRoasOwnedHere: false,
  evidenceLinksRequiredForGeneratedLearning: true,
} as const;
