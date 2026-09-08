import { describe, expect, it } from "vitest";

import {
  compareMarketingMetricEvidence,
  deriveMarketingMetricRate,
  evaluateMarketingLearningEvidence,
  validateMarketingCreativeLearning,
  validateMarketingCreativeMetricObservation,
  validateMarketingMetricSyncCheckpoint,
  type MarketingCreativeMetricObservation,
} from "./marketing-creative-analytics-contract";

const CREATIVE_A = "11111111-1111-4111-8111-111111111111";
const CREATIVE_B = "22222222-2222-4222-8222-222222222222";
const CREATIVE_C = "33333333-3333-4333-8333-333333333333";
const OBSERVATION_A = "44444444-4444-4444-8444-444444444444";
const OBSERVATION_B = "55555555-5555-4555-8555-555555555555";
const OBSERVATION_C = "66666666-6666-4666-8666-666666666666";
const LEARNING_ID = "77777777-7777-4777-8777-777777777777";
const NOW = "2026-09-08T00:00:00.000Z";

function metric(
  overrides: Partial<MarketingCreativeMetricObservation> = {},
): MarketingCreativeMetricObservation {
  return {
    observationId: OBSERVATION_A,
    provider: "instagram",
    providerAccountRef: "ig:lifemate",
    providerContentId: "media:100",
    creativeId: CREATIVE_A,
    creativeRevision: 1,
    metricKey: "shares",
    value: 12,
    unit: "count",
    availability: "available",
    source: "provider_verified",
    semanticDefinition: "Provider-reported shares for the content and selected window.",
    semanticVersion: "instagram.shares.v1",
    trafficScope: "organic",
    contentState: "active",
    window: {
      kind: "calendar",
      startAtUtc: "2026-09-01T00:00:00.000Z",
      endAtUtc: "2026-09-08T00:00:00.000Z",
      providerWindowCode: null,
    },
    asOfUtc: "2026-09-08T00:00:00.000Z",
    freshUntilUtc: "2026-09-08T02:00:00.000Z",
    limitations: [],
    ...overrides,
  };
}

describe("marketing creative analytics evidence contract", () => {
  it("preserves a real zero separately from unavailable", () => {
    expect(validateMarketingCreativeMetricObservation(metric({ value: 0 }))).toBe(true);
    expect(
      validateMarketingCreativeMetricObservation(
        metric({
          availability: "unavailable",
          value: null,
          limitations: ["Not exposed by provider."],
        }),
      ),
    ).toBe(true);
    expect(
      validateMarketingCreativeMetricObservation(
        metric({
          availability: "unavailable",
          value: 0,
          limitations: ["Not exposed by provider."],
        }),
      ),
    ).toBe(false);
  });

  it("rejects negative and non-finite provider metrics", () => {
    expect(validateMarketingCreativeMetricObservation(metric({ value: -1 }))).toBe(false);
    expect(validateMarketingCreativeMetricObservation(metric({ value: Number.NaN }))).toBe(false);
  });

  it("does not compare provider semantic mismatches", () => {
    const left = metric();
    const right = metric({
      observationId: OBSERVATION_B,
      creativeId: CREATIVE_B,
      providerContentId: "media:200",
      semanticVersion: "instagram.shares.v2",
    });

    expect(compareMarketingMetricEvidence(left, right, NOW)).toEqual({
      kind: "not_comparable",
      reason: "semantic_mismatch",
    });
  });

  it("does not assume cross-provider metrics are interchangeable", () => {
    expect(
      compareMarketingMetricEvidence(
        metric(),
        metric({ observationId: OBSERVATION_B, creativeId: CREATIVE_B, provider: "linkedin" }),
        NOW,
      ),
    ).toEqual({ kind: "not_comparable", reason: "provider_mismatch" });
  });

  it("excludes manual observations from automated comparisons", () => {
    expect(
      compareMarketingMetricEvidence(
        metric(),
        metric({
          observationId: OBSERVATION_B,
          creativeId: CREATIVE_B,
          source: "manual_observation",
        }),
        NOW,
      ),
    ).toEqual({ kind: "not_comparable", reason: "manual_observation" });
  });

  it("suppresses stale evidence instead of presenting it as current", () => {
    expect(
      compareMarketingMetricEvidence(
        metric({ freshUntilUtc: "2026-09-07T23:00:00.000Z" }),
        metric({ observationId: OBSERVATION_B, creativeId: CREATIVE_B }),
        NOW,
      ),
    ).toEqual({ kind: "not_comparable", reason: "stale_evidence" });
  });

  it("derives rates only from valid same-scope provider evidence", () => {
    const numerator = metric({ metricKey: "shares", value: 20 });
    const denominator = metric({ metricKey: "reach", value: 200 });

    expect(deriveMarketingMetricRate(numerator, denominator, NOW)).toEqual({
      kind: "available",
      value: 0.1,
      numerator: 20,
      denominator: 200,
    });
  });

  it("never divides by a true zero denominator", () => {
    expect(
      deriveMarketingMetricRate(
        metric({ value: 2 }),
        metric({ metricKey: "reach", value: 0 }),
        NOW,
      ),
    ).toEqual({ kind: "unavailable", reason: "zero_denominator" });
  });

  it("suppresses generated learnings below minimum sample size", () => {
    expect(
      evaluateMarketingLearningEvidence(
        [
          metric({ observationId: OBSERVATION_A, creativeId: CREATIVE_A }),
          metric({ observationId: OBSERVATION_B, creativeId: CREATIVE_B }),
        ],
        NOW,
      ),
    ).toEqual({ kind: "suppressed", reason: "sample_too_small" });
  });

  it("allows review-only learning after three comparable creative samples", () => {
    expect(
      evaluateMarketingLearningEvidence(
        [
          metric({ observationId: OBSERVATION_A, creativeId: CREATIVE_A }),
          metric({
            observationId: OBSERVATION_B,
            creativeId: CREATIVE_B,
            providerContentId: "media:200",
          }),
          metric({
            observationId: OBSERVATION_C,
            creativeId: CREATIVE_C,
            providerContentId: "media:300",
          }),
        ],
        NOW,
      ),
    ).toEqual({ kind: "eligible", sampleSize: 3 });
  });

  it("requires evidence links and forbids causal-claim learning records", () => {
    expect(
      validateMarketingCreativeLearning({
        learningId: LEARNING_ID,
        state: "proposed",
        statement: "Share rate was higher across three comparable creatives in this window.",
        interpretation: "Try another related hook next week and measure again.",
        evidence: [
          { observationId: OBSERVATION_A, creativeId: CREATIVE_A, creativeRevision: 1 },
          { observationId: OBSERVATION_B, creativeId: CREATIVE_B, creativeRevision: 1 },
          { observationId: OBSERVATION_C, creativeId: CREATIVE_C, creativeRevision: 1 },
        ],
        sampleSize: 3,
        periodStartUtc: "2026-09-01T00:00:00.000Z",
        periodEndUtc: "2026-09-08T00:00:00.000Z",
        generatedAtUtc: "2026-09-08T00:00:00.000Z",
        source: "model",
        model: "bounded-marketing-model",
        policyVersion: "creative-learning.v1",
        causalClaim: false,
      }),
    ).toBe(true);
  });

  it("validates durable sync checkpoint metadata without provider secrets", () => {
    expect(
      validateMarketingMetricSyncCheckpoint({
        provider: "instagram",
        providerAccountRef: "ig:lifemate",
        cursor: "opaque-cursor",
        watermarkUtc: "2026-09-08T00:00:00.000Z",
        capabilityVersion: "instagram.metrics.v1",
        idempotencyKey: "metrics:instagram:lifemate:20260908",
        lastAttemptAtUtc: "2026-09-08T00:00:00.000Z",
        lastSuccessAtUtc: "2026-09-08T00:00:00.000Z",
        state: "idle",
      }),
    ).toBe(true);
  });
});
