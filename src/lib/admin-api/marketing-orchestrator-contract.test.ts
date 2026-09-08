import { describe, expect, it } from "vitest";

import {
  buildMarketingWeeklyBrief,
  buildMarketingWeeklyPlan,
  detectMarketingFatigue,
  marketingNudgeDedupeKey,
  marketingOrchestratorBoundary,
  marketingWeeklyPlanIdempotencyKey,
  reconcileMarketingPlanSchedule,
  resolveMarketingAutomationDecision,
  validateMarketingOrchestratorEvent,
  validateMarketingWeeklyCapacity,
  type MarketingAutomationPolicy,
  type MarketingPlanCandidate,
  type MarketingWeeklyCapacity,
} from "./marketing-orchestrator-contract";

const PLAN_ID = "11111111-1111-4111-8111-111111111111";

function capacity(overrides: Partial<MarketingWeeklyCapacity> = {}): MarketingWeeklyCapacity {
  return {
    maxItems: 5,
    maxReels: 2,
    maxCarousels: 2,
    maxStories: 2,
    maxRecordingMinutes: 120,
    maxRecordingMinutesPerSession: 90,
    availableActors: ["founder", "partner"],
    preferredShootWeekday: 4,
    productPriorities: ["lifemate", "wellmate"],
    blackoutDates: ["2026-09-11"],
    ...overrides,
  };
}

function candidate(
  id: string,
  overrides: Partial<MarketingPlanCandidate> = {},
): MarketingPlanCandidate {
  return {
    candidateId: id,
    revision: 1,
    title: `Creative ${id.slice(0, 4)}`,
    productScope: "lifemate",
    format: "reel",
    goal: "reach",
    estimatedRecordingMinutes: 20,
    actors: ["founder"],
    patternCode: "founder_story",
    ctaCode: "learn_more",
    pinned: false,
    manuallyAdded: false,
    intendedDate: null,
    ...overrides,
  };
}

const CANDIDATE_A = "22222222-2222-4222-8222-222222222222";
const CANDIDATE_B = "33333333-3333-4333-8333-333333333333";
const CANDIDATE_C = "44444444-4444-4444-8444-444444444444";
const CANDIDATE_D = "55555555-5555-4555-8555-555555555555";

const policy: MarketingAutomationPolicy = {
  mode: "operational",
  disabledFamilies: [],
  allowMechanicalAutoAdvance: true,
  requireHumanCreativeReview: true,
  requireHumanPublishApproval: true,
  autonomousPublishAllowed: false,
};

describe("marketing weekly orchestrator contract", () => {
  it("validates bounded capacity settings", () => {
    expect(validateMarketingWeeklyCapacity(capacity())).toBe(true);
    expect(
      validateMarketingWeeklyCapacity(
        capacity({ maxRecordingMinutes: 30, maxRecordingMinutesPerSession: 60 }),
      ),
    ).toBe(false);
  });

  it("builds a capacity-aware plan and preserves pinned/manual items", () => {
    const result = buildMarketingWeeklyPlan(
      PLAN_ID,
      "2026-09-07",
      "Asia/Tehran",
      "policy-1",
      "assist",
      capacity({ maxItems: 3, maxReels: 2, maxCarousels: 1 }),
      [
        candidate(CANDIDATE_A, { pinned: true }),
        candidate(CANDIDATE_B, { format: "carousel", manuallyAdded: true }),
        candidate(CANDIDATE_C),
        candidate(CANDIDATE_D),
      ],
    );

    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") return;
    expect(result.plan.items.map((item) => item.candidateId)).toEqual([
      CANDIDATE_A,
      CANDIDATE_B,
      CANDIDATE_C,
    ]);
    expect(result.plan.excludedCandidateIds).toEqual([CANDIDATE_D]);
    expect(result.plan.approvalRequiredForPublish).toBe(true);
  });

  it("does not silently drop pinned items when pinned work exceeds capacity", () => {
    const result = buildMarketingWeeklyPlan(
      PLAN_ID,
      "2026-09-07",
      "Asia/Tehran",
      "policy-1",
      "manual",
      capacity({ maxItems: 1, maxReels: 1 }),
      [candidate(CANDIDATE_A, { pinned: true }), candidate(CANDIDATE_B, { pinned: true })],
    );
    expect(result).toEqual({
      kind: "capacity_conflict",
      reason: "pinned_items_exceed_capacity",
      conflictingCandidateIds: [CANDIDATE_A, CANDIDATE_B],
    });
  });

  it("uses a stable weekly plan idempotency key", () => {
    expect(marketingWeeklyPlanIdempotencyKey("2026-09-07", "Asia/Tehran", "policy-1")).toBe(
      "marketing-week:2026-09-07:asia-tehran:policy-1",
    );
    expect(marketingWeeklyPlanIdempotencyKey("bad-date", "Asia/Tehran", "policy-1")).toBeNull();
  });

  it("allows operational mode to auto-advance only mechanical work", () => {
    expect(resolveMarketingAutomationDecision(policy, "enqueue_media_processing")).toEqual({
      kind: "automatic",
    });
    expect(resolveMarketingAutomationDecision(policy, "approve_content")).toEqual({
      kind: "blocked",
      reason: "human_review_required",
    });
    expect(resolveMarketingAutomationDecision(policy, "publish_external")).toEqual({
      kind: "blocked",
      reason: "human_publish_required",
    });
  });

  it("keeps assist mode suggest-only and manual mode non-automatic", () => {
    expect(
      resolveMarketingAutomationDecision({ ...policy, mode: "assist" }, "propose_derivatives"),
    ).toEqual({ kind: "suggest_only" });
    expect(
      resolveMarketingAutomationDecision({ ...policy, mode: "manual" }, "propose_derivatives"),
    ).toEqual({ kind: "blocked", reason: "manual_mode" });
  });

  it("honors family kill switches and provider availability", () => {
    expect(
      resolveMarketingAutomationDecision(
        { ...policy, disabledFamilies: ["metric_sync"] },
        "queue_metric_sync",
      ),
    ).toEqual({ kind: "blocked", reason: "family_disabled" });
    expect(resolveMarketingAutomationDecision(policy, "create_publish_execution", false)).toEqual({
      kind: "blocked",
      reason: "provider_unavailable",
    });
  });

  it("validates inspectable retry-safe event metadata", () => {
    expect(
      validateMarketingOrchestratorEvent({
        eventId: "66666666-6666-4666-8666-666666666666",
        family: "derivative_generation",
        sourceType: "weekly_plan_item",
        sourceId: CANDIDATE_A,
        sourceRevision: 1,
        idempotencyKey: "marketing:event:derivative:2222:1",
        correlationId: "corr:marketing:week:20260907:001",
        state: "failed_retryable",
        attempt: 2,
        maxAttempts: 5,
        nextAttemptAtUtc: "2026-09-08T08:00:00.000Z",
        resultCode: "provider_temporarily_unavailable",
        createdAtUtc: "2026-09-08T07:00:00.000Z",
        updatedAtUtc: "2026-09-08T07:05:00.000Z",
      }),
    ).toBe(true);
  });

  it("never fabricates a performance learning when metrics are missing", () => {
    expect(
      buildMarketingWeeklyBrief({
        selectedCount: 5,
        unrecordedCount: 2,
        readyForReviewCount: 1,
        scheduledCount: 1,
        blockedCount: 1,
        providerAvailability: "unavailable",
        metricsAvailability: "unavailable",
        learningAvailability: "partial",
        providerWarning: null,
        evidenceLearning: "This must not be surfaced without evidence.",
      }),
    ).toMatchObject({
      providerWarning: "unavailable",
      evidenceLearning: null,
      fabricatedPerformanceAllowed: false,
    });
  });

  it("emits non-blocking fatigue warnings from bounded repetition", () => {
    const warnings = detectMarketingFatigue(
      [
        { productScope: "lifemate", patternCode: "founder_story", ctaCode: "learn_more" },
        { productScope: "lifemate", patternCode: "founder_story", ctaCode: "learn_more" },
        { productScope: "lifemate", patternCode: "founder_story", ctaCode: "learn_more" },
      ],
      3,
    );
    expect(warnings).toEqual(
      expect.arrayContaining([
        { kind: "repeated_pattern", key: "founder_story", count: 3, blocking: false },
        { kind: "product_dominance", key: "lifemate", count: 3, blocking: false },
        { kind: "repeated_cta", key: "learn_more", count: 3, blocking: false },
      ]),
    );
  });

  it("keeps planning intent separate from canonical schedule truth", () => {
    expect(reconcileMarketingPlanSchedule(CANDIDATE_A, "2026-09-10", null)).toEqual({
      planItemId: CANDIDATE_A,
      plannedDate: "2026-09-10",
      canonicalExecutionId: null,
      canonicalScheduledForUtc: null,
      state: "planning_only",
    });
    expect(
      reconcileMarketingPlanSchedule(CANDIDATE_A, "2026-09-11", {
        executionId: "77777777-7777-4777-8777-777777777777",
        scheduledForUtc: "2026-09-10T06:00:00.000Z",
        state: "scheduled",
      }),
    ).toMatchObject({
      plannedDate: "2026-09-11",
      canonicalScheduledForUtc: "2026-09-10T06:00:00.000Z",
      state: "scheduled",
    });
  });

  it("deduplicates action-needed nudges by family, subject, reason and day", () => {
    const first = marketingNudgeDedupeKey(
      "review_queue",
      CANDIDATE_A,
      "review-backlog",
      "2026-09-08",
    );
    const second = marketingNudgeDedupeKey(
      "review_queue",
      CANDIDATE_A,
      "review-backlog",
      "2026-09-08",
    );
    expect(first).toBe(second);
  });

  it("hard-codes the orchestrator safety boundary", () => {
    expect(marketingOrchestratorBoundary).toMatchObject({
      autonomousPublishAllowed: false,
      humanCreativeReviewRequired: true,
      humanPublishApprovalRequired: true,
      missingMetricsMayBeInvented: false,
      rawHealthDataAllowed: false,
      planMoveMayRescheduleCanonicalExecution: false,
      automationKillSwitchRequired: true,
    });
  });
});
