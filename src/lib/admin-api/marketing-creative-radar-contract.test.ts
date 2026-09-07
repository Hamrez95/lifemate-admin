import { describe, expect, it } from "vitest";

import {
  creativePatternCodes,
  creativeRadarAiBoundary,
  normalizeCreativeSignalSourceUrl,
  parseCreativeSignalAnalysis,
  parseCreativeSignalManualCapture,
} from "./marketing-creative-radar-contract";

describe("Creative Radar contract", () => {
  it("ships the stable v1 LifeMate creative-pattern taxonomy", () => {
    expect(creativePatternCodes).toEqual([
      "relatable_problem",
      "couple_family_scenario",
      "pov_comedy",
      "curiosity_gap",
      "puzzle",
      "hidden_object",
      "quiz",
      "challenge",
      "poll_question",
      "send_to_someone",
      "myth_fact",
      "product_demo",
      "founder_story",
      "build_in_public",
      "trust_privacy",
      "community_ugc",
      "waitlist_launch",
    ]);
  });

  it("canonicalizes public signal URLs and strips common tracking identity noise", () => {
    const first = normalizeCreativeSignalSourceUrl(
      " https://Example.com/campaign?utm_source=ig&b=2&fbclid=secret&a=1#hero ",
    );
    const second = normalizeCreativeSignalSourceUrl("https://example.com/campaign?a=1&b=2");

    expect(first).toBe("https://example.com/campaign?a=1&b=2");
    expect(second).toBe(first);
  });

  it("rejects non-public, credential-bearing and non-web source URLs", () => {
    expect(normalizeCreativeSignalSourceUrl("http://localhost:3000/admin")).toBeNull();
    expect(normalizeCreativeSignalSourceUrl("http://127.0.0.1/internal")).toBeNull();
    expect(normalizeCreativeSignalSourceUrl("https://user:pass@example.com/post")).toBeNull();
    expect(normalizeCreativeSignalSourceUrl("file:///etc/passwd")).toBeNull();
  });

  it("builds a deterministic duplicate identity and keeps reference assets non-publishable", () => {
    const parsed = parseCreativeSignalManualCapture({
      sourceUrl: "https://instagram.com/reel/abc?utm_campaign=launch",
      sourceType: "instagram",
      title: "  Interesting couple scenario  ",
      operatorNote: "Adapt the mechanism, never copy the wording.",
      referenceBrand: "Example Brand",
      tags: ["Couple", " couple ", "Launch"],
      productTags: ["WellMate"],
      patternCodes: ["couple_family_scenario", "relatable_problem"],
      referenceAssets: [
        {
          assetRef: "marketing-reference-assets/abc.png",
          kind: "screenshot",
          provenanceNote: "Operator-provided public reference screenshot",
          publishEligible: true,
          usage: "publishable",
        },
      ],
    });

    expect(parsed.kind).toBe("valid");
    if (parsed.kind !== "valid") return;
    expect(parsed.data.sourceUrl).toBe("https://instagram.com/reel/abc");
    expect(parsed.data.normalizedSourceIdentity).toBe("public-url:https://instagram.com/reel/abc");
    expect(parsed.data.title).toBe("Interesting couple scenario");
    expect(parsed.data.tags).toEqual(["Couple", "Launch"]);
    expect(parsed.data.referenceAssets).toEqual([
      {
        assetRef: "marketing-reference-assets/abc.png",
        kind: "screenshot",
        provenanceNote: "Operator-provided public reference screenshot",
        usage: "reference_only",
        publishEligible: false,
      },
    ]);
  });

  it("fails closed on unknown taxonomy values and unbounded manual payloads", () => {
    expect(
      parseCreativeSignalManualCapture({
        sourceUrl: "https://example.com/post",
        sourceType: "website",
        patternCodes: ["guaranteed_viral"],
      }),
    ).toEqual({ kind: "invalid", code: "invalid_pattern_code" });

    expect(
      parseCreativeSignalManualCapture({
        sourceUrl: "https://example.com/post",
        sourceType: "website",
        title: "x".repeat(241),
      }),
    ).toEqual({ kind: "invalid", code: "field_too_long" });
  });

  it("accepts only bounded, reviewable AI analysis with original LifeMate adaptations", () => {
    const analysis = parseCreativeSignalAnalysis({
      patternCodes: ["curiosity_gap", "product_demo"],
      hookMechanism: "Open with an unresolved everyday health-planning question.",
      targetEmotions: ["curiosity", "relief"],
      participationMechanism: "Ask viewers to choose between two safe planning options.",
      engagementTriggers: ["comment", "save"],
      formatStructure: "problem -> audience choice -> original LifeMate workflow demo",
      productRevealTiming: "after the audience choice",
      ctaStyle: "save for later",
      productionEffort: "low",
      riskFlags: ["health_claim"],
      lifeMateRelevance:
        "Useful as a planning education format without diagnosing or promising outcomes.",
      originalLifeMateAdaptations: [
        "Use a medication-planning scenario with generic fictional data.",
        "Use a caregiver coordination scenario with no real user information.",
        "Use a privacy-settings scenario that demonstrates control rather than health outcomes.",
      ],
      sourceContentAvailability: "partial",
      generation: {
        provider: "example-provider",
        model: "example-model",
        policyVersion: "creative-radar-v1",
        generatedAtUtc: "2026-09-07T08:00:00.000Z",
      },
      boundary: creativeRadarAiBoundary,
    });

    expect(analysis).not.toBeNull();
    expect(analysis?.boundary).toEqual({
      publishAllowed: false,
      rawHealthAllowed: false,
      arbitraryPromptAllowed: false,
      competitorCreativeRecreationAllowed: false,
      viralityPredictionAllowed: false,
    });
    expect(analysis?.originalLifeMateAdaptations).toHaveLength(3);
  });

  it("rejects AI output that weakens safety boundaries or lacks 3-5 original adaptations", () => {
    const base = {
      patternCodes: ["myth_fact"],
      hookMechanism: "Contrast a misconception with a bounded product explanation.",
      targetEmotions: ["curiosity"],
      participationMechanism: null,
      engagementTriggers: [],
      formatStructure: "myth -> context -> product explanation",
      productRevealTiming: null,
      ctaStyle: null,
      productionEffort: "medium",
      riskFlags: ["health_claim"],
      lifeMateRelevance: "Potential education format subject to health-claim review.",
      sourceContentAvailability: "available",
      generation: {
        provider: "example-provider",
        model: "example-model",
        policyVersion: "creative-radar-v1",
        generatedAtUtc: "2026-09-07T08:00:00.000Z",
      },
      boundary: creativeRadarAiBoundary,
    };

    expect(
      parseCreativeSignalAnalysis({
        ...base,
        originalLifeMateAdaptations: ["one", "two"],
      }),
    ).toBeNull();

    expect(
      parseCreativeSignalAnalysis({
        ...base,
        originalLifeMateAdaptations: ["one", "two", "three"],
        boundary: { ...creativeRadarAiBoundary, viralityPredictionAllowed: true },
      }),
    ).toBeNull();
  });
});
