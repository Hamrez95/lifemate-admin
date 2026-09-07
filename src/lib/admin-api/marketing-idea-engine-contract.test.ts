import { describe, expect, it } from "vitest";

import {
  groupShootPlanCandidates,
  marketingHealthRiskClasses,
  marketingIdeaGenerationBoundary,
  parseMarketingCreativeIdea,
  parseMarketingScriptDraft,
  scoreMarketingIdeaHeuristic,
} from "./marketing-idea-engine-contract";

const IDEA_ID = "11111111-1111-4111-8111-111111111111";
const SIGNAL_ID = "22222222-2222-4222-8222-222222222222";

function validIdea() {
  return {
    id: IDEA_ID,
    revision: 1,
    internalTitle: "Relatable medication planning moment",
    concept: "A fictional everyday planning problem resolves with a simple LifeMate workflow.",
    productScope: "LifeMate",
    formatCode: "relatable_problem",
    goal: "engagement",
    audiencePersona: "Busy adults who want simpler health planning",
    hooks: ["Why does planning this always become a group chat?", "There is a calmer way."],
    conflict: "Everyone has a different reminder in their head.",
    payoff: "One shared planning workflow reduces coordination friction.",
    productRevealTiming: "after the conflict",
    ctaMechanic: "send to someone you coordinate with",
    estimatedDurationSeconds: 32,
    productionEffort: "low",
    actors: ["Founder", "Partner"],
    location: "Home",
    props: ["Phone"],
    healthRiskClass: "product_feature",
    provenance: "operator",
    sourceSignalId: SIGNAL_ID,
    campaignId: null,
    state: "selected",
    brandContextVersion: "brand-context-v3",
    createdAtUtc: "2026-09-07T10:00:00.000Z",
  };
}

describe("Idea Engine contract", () => {
  it("accepts a bounded manual idea without requiring AI", () => {
    const parsed = parseMarketingCreativeIdea(validIdea());
    expect(parsed.kind).toBe("valid");
    if (parsed.kind !== "valid") return;
    expect(parsed.data.provenance).toBe("operator");
    expect(parsed.data.hooks).toHaveLength(2);
    expect(parsed.data.sourceSignalId).toBe(SIGNAL_ID);
  });

  it("blocks clinical/emergency marketing ideas at the contract boundary", () => {
    expect(marketingHealthRiskClasses).toContain("blocked_clinical_or_emergency");
    expect(
      parseMarketingCreativeIdea({
        ...validIdea(),
        healthRiskClass: "blocked_clinical_or_emergency",
      }),
    ).toEqual({ kind: "invalid", code: "blocked_health_risk" });
    expect(marketingIdeaGenerationBoundary).toEqual({
      publishAllowed: false,
      rawHealthDataAllowed: false,
      diagnosisAllowed: false,
      treatmentRecommendationAllowed: false,
      emergencyThresholdAllowed: false,
      clinicalClaimAllowed: false,
      viralityPredictionAllowed: false,
      operatorReviewRequired: true,
    });
  });

  it("requires versioned review-only script metadata and 2-5 hooks", () => {
    const parsed = parseMarketingScriptDraft({
      ideaId: IDEA_ID,
      ideaRevision: 2,
      scriptRevision: 3,
      hooks: ["Hook one", "Hook two"],
      scenes: [
        {
          startSecond: 0,
          endSecond: 8,
          actor: "Founder",
          dialogue: "A fictional planning setup.",
          onScreenText: "Planning can be simpler",
          cameraSuggestion: "Medium shot",
          productReveal: false,
        },
        {
          startSecond: 8,
          endSecond: 20,
          actor: "Partner",
          dialogue: "Show the product workflow without making a health claim.",
          onScreenText: null,
          cameraSuggestion: "Phone insert",
          productReveal: true,
        },
      ],
      finalCta: "Save this workflow for later",
      captionDraft: "A planning workflow example using fictional context.",
      coverHeadlines: ["A calmer planning workflow"],
      brandContextVersion: "brand-context-v3",
      policyVersion: "marketing-safety-v2",
      generationMode: "model",
      provider: "example-provider",
      model: "example-model",
      generatedAtUtc: "2026-09-07T10:05:00.000Z",
      publishAllowed: false,
    });

    expect(parsed.kind).toBe("valid");
    if (parsed.kind !== "valid") return;
    expect(parsed.data.ideaRevision).toBe(2);
    expect(parsed.data.scriptRevision).toBe(3);
    expect(parsed.data.publishAllowed).toBe(false);

    expect(
      parseMarketingScriptDraft({
        ideaId: IDEA_ID,
        ideaRevision: 1,
        scriptRevision: 1,
        hooks: ["Only one hook"],
        scenes: [
          {
            startSecond: 0,
            endSecond: 5,
            actor: null,
            dialogue: null,
            onScreenText: null,
            cameraSuggestion: null,
            productReveal: false,
          },
        ],
        finalCta: null,
        captionDraft: null,
        coverHeadlines: [],
        brandContextVersion: "v1",
        policyVersion: "v1",
        generationMode: "manual",
        provider: null,
        model: null,
        generatedAtUtc: "2026-09-07T10:05:00.000Z",
        publishAllowed: false,
      }),
    ).toEqual({ kind: "invalid", code: "invalid_hooks" });
  });

  it("scores only transparent heuristic factors and never predicts virality", () => {
    const score = scoreMarketingIdeaHeuristic({
      relatability: 5,
      curiosity: 4.2,
      emotionalClarity: 4,
      participation: 3.5,
      speedOfUnderstanding: 5,
      productFit: 4.5,
      productionSimplicity: 4.8,
    });

    expect(score.score).toBeGreaterThan(0);
    expect(score.score).toBeLessThanOrEqual(100);
    expect(score.predictsVirality).toBe(false);
    expect(score.rankingAuthority).toBe("operator_override_allowed");
    expect(score.explanation).toHaveLength(3);
  });

  it("groups shoot candidates by actors, location and clothing continuity", () => {
    const secondIdeaId = "33333333-3333-4333-8333-333333333333";
    const thirdIdeaId = "44444444-4444-4444-8444-444444444444";
    const groups = groupShootPlanCandidates([
      {
        ideaId: IDEA_ID,
        ideaRevision: 1,
        title: "First reel",
        actors: ["Founder", "Partner"],
        location: "Home",
        props: ["Phone", "Mug"],
        estimatedSetupMinutes: 10,
        estimatedRecordingMinutes: 15,
        deviceScreenRequired: true,
        clothingContinuityKey: "look-a",
      },
      {
        ideaId: secondIdeaId,
        ideaRevision: 1,
        title: "Second reel",
        actors: ["Partner", "Founder"],
        location: "home",
        props: ["Phone", "Notebook"],
        estimatedSetupMinutes: 10,
        estimatedRecordingMinutes: 12,
        deviceScreenRequired: true,
        clothingContinuityKey: "look-a",
      },
      {
        ideaId: thirdIdeaId,
        ideaRevision: 1,
        title: "Solo reel",
        actors: ["Founder"],
        location: "Office",
        props: ["Laptop"],
        estimatedSetupMinutes: 8,
        estimatedRecordingMinutes: 10,
        deviceScreenRequired: false,
        clothingContinuityKey: null,
      },
    ]);

    expect(groups).toHaveLength(2);
    const coupleGroup = groups.find((group) => group.items.length === 2);
    expect(coupleGroup?.sharedProps).toEqual(["Phone"]);
    expect(coupleGroup?.totalEstimatedMinutes).toBe(37);
  });

  it("rejects unknown states, unsafe identifiers and unbounded durations", () => {
    expect(parseMarketingCreativeIdea({ ...validIdea(), state: "auto_published" })).toEqual({
      kind: "invalid",
      code: "invalid_enum",
    });
    expect(parseMarketingCreativeIdea({ ...validIdea(), sourceSignalId: "not-a-uuid" })).toEqual({
      kind: "invalid",
      code: "invalid_identifier",
    });
    expect(parseMarketingCreativeIdea({ ...validIdea(), estimatedDurationSeconds: 9_999 })).toEqual(
      {
        kind: "invalid",
        code: "invalid_duration",
      },
    );
  });
});
