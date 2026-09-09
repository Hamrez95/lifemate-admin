import { describe, expect, it } from "vitest";

import {
  marketingXBoundary,
  resolveMarketingXPublishEligibility,
  resolveMarketingXReplyEligibility,
  resolveMarketingXScheduleTruth,
  resolveMarketingXThreadResumePlan,
  validateMarketingXActorEvidence,
  validateMarketingXPostDraft,
  validateMarketingXThread,
  type MarketingXCapabilityMatrix,
  type MarketingXPostDraft,
  type MarketingXThread,
} from "./marketing-x-contract";

const DRAFT_ID = "11111111-1111-4111-8111-111111111111";
const CREATIVE_ID = "22222222-2222-4222-8222-222222222222";
const THREAD_ID = "33333333-3333-4333-8333-333333333333";
const NODE_A = "44444444-4444-4444-8444-444444444444";
const NODE_B = "55555555-5555-4555-8555-555555555555";
const EVIDENCE_ID = "66666666-6666-4666-8666-666666666666";

function capabilities(
  overrides: Partial<MarketingXCapabilityMatrix> = {},
): MarketingXCapabilityMatrix {
  return {
    providerCode: "x",
    connectivity: "Verified",
    textPost: "Supported",
    imagePost: "Supported",
    videoPost: "Supported",
    polls: "Supported",
    quotePost: "Supported",
    replies: "Supported",
    threads: "Supported",
    recentSearch: "Supported",
    fullSearch: "NotVerified",
    filteredStream: "NotVerified",
    likingUsers: "Supported",
    repostingUsers: "Supported",
    analytics: "Supported",
    mediaAnalytics: "NotVerified",
    usageRead: "NotVerified",
    lastVerifiedAtUtc: "2026-09-08T21:00:00.000Z",
    verificationFresh: true,
    ...overrides,
  };
}

function draft(overrides: Partial<MarketingXPostDraft> = {}): MarketingXPostDraft {
  return {
    draftId: DRAFT_ID,
    revision: 2,
    authorAccountRef: "@lifemate",
    kind: "single_post",
    text: "Consent-first care should make relationship and permission two different concepts.",
    assets: [],
    quotedPostId: null,
    poll: null,
    sourceCreativeId: CREATIVE_ID,
    sourceCreativeRevision: 4,
    riskClass: "review_required",
    ...overrides,
  };
}

function thread(overrides: Partial<MarketingXThread> = {}): MarketingXThread {
  return {
    threadId: THREAD_ID,
    revision: 1,
    authorAccountRef: "@lifemate",
    sourceCreativeId: CREATIVE_ID,
    sourceCreativeRevision: 4,
    nodes: [
      {
        nodeId: NODE_A,
        order: 1,
        draft: draft(),
        state: "published_verified",
        externalPostId: "post_100",
        parentExternalPostId: null,
        attempt: 1,
      },
      {
        nodeId: NODE_B,
        order: 2,
        draft: draft({ draftId: "77777777-7777-4777-8777-777777777777", revision: 1 }),
        state: "approved",
        externalPostId: null,
        parentExternalPostId: "post_100",
        attempt: 0,
      },
    ],
    ...overrides,
  };
}

describe("marketing X provider truth contract", () => {
  it("validates an X-native single post draft", () => {
    expect(validateMarketingXPostDraft(draft())).toBe(true);
  });

  it("requires quote and poll fields only for their native content types", () => {
    expect(
      validateMarketingXPostDraft(draft({ kind: "quote_post", quotedPostId: "post_500" })),
    ).toBe(true);
    expect(validateMarketingXPostDraft(draft({ kind: "quote_post" }))).toBe(false);
    expect(
      validateMarketingXPostDraft(
        draft({
          kind: "poll",
          poll: { options: ["Privacy", "Offline reliability"], durationMinutes: 120 },
        }),
      ),
    ).toBe(true);
    expect(validateMarketingXPostDraft(draft({ kind: "poll" }))).toBe(false);
  });

  it("never treats unverified provider capability as publishable", () => {
    expect(
      resolveMarketingXPublishEligibility(draft(), capabilities({ verificationFresh: false })),
    ).toEqual({ kind: "blocked", reason: "provider_unverified" });
    expect(
      resolveMarketingXPublishEligibility(draft(), capabilities({ textPost: "Unsupported" })),
    ).toEqual({
      kind: "blocked",
      reason: "capability_unsupported",
    });
    expect(resolveMarketingXPublishEligibility(draft(), capabilities())).toEqual({
      kind: "eligible",
    });
  });

  it("blocks risk-class content before provider execution", () => {
    expect(
      resolveMarketingXPublishEligibility(draft({ riskClass: "blocked" }), capabilities()),
    ).toEqual({
      kind: "blocked",
      reason: "risk_blocked",
    });
  });

  it("requires ordered thread nodes and verified external IDs", () => {
    expect(validateMarketingXThread(thread())).toBe(true);
    expect(
      validateMarketingXThread(
        thread({ nodes: thread().nodes.map((node, index) => ({ ...node, order: index + 2 })) }),
      ),
    ).toBe(false);
  });

  it("resumes a partially published thread without recreating verified prior nodes", () => {
    expect(resolveMarketingXThreadResumePlan(thread())).toEqual({
      kind: "publish_next",
      nodeId: NODE_B,
      parentExternalPostId: "post_100",
    });
  });

  it("never blind-resumes a thread after outcome unknown", () => {
    const nodes = thread().nodes.map((node) =>
      node.nodeId === NODE_B ? { ...node, state: "outcome_unknown" as const } : node,
    );
    expect(resolveMarketingXThreadResumePlan(thread({ nodes }))).toEqual({
      kind: "blocked",
      reason: "outcome_unknown",
    });
  });

  it("keeps aggregate engagement separate from identifiable X actor evidence", () => {
    expect(
      validateMarketingXActorEvidence({
        evidenceId: EVIDENCE_ID,
        providerAccountRef: "@lifemate",
        externalPostId: "post_100",
        kind: "aggregate_only",
        actorProviderUserId: null,
        actorHandle: null,
        aggregateValue: 120,
        observedAtUtc: "2026-09-08T21:05:00.000Z",
        source: "provider_verified",
      }),
    ).toBe(true);
    expect(
      validateMarketingXActorEvidence({
        evidenceId: EVIDENCE_ID,
        providerAccountRef: "@lifemate",
        externalPostId: "post_100",
        kind: "aggregate_only",
        actorProviderUserId: "x-user-1",
        actorHandle: "@person",
        aggregateValue: 120,
        observedAtUtc: "2026-09-08T21:05:00.000Z",
        source: "provider_verified",
      }),
    ).toBe(false);
  });

  it("allows identifiable actor evidence only when an actor is actually present", () => {
    expect(
      validateMarketingXActorEvidence({
        evidenceId: EVIDENCE_ID,
        providerAccountRef: "@lifemate",
        externalPostId: "post_100",
        kind: "reposting_user",
        actorProviderUserId: "x-user-1",
        actorHandle: "@person",
        aggregateValue: null,
        observedAtUtc: "2026-09-08T21:05:00.000Z",
        source: "provider_verified",
      }),
    ).toBe(true);
  });

  it("gates programmatic replies on verified capability and provider conversation rules", () => {
    expect(
      resolveMarketingXReplyEligibility(capabilities(), {
        ownedPost: false,
        accountSummonedByMentionOrQuote: false,
        publicConversation: true,
        sensitiveMedicalQuestion: false,
      }),
    ).toEqual({ kind: "blocked", reason: "provider_rule_not_satisfied" });
    expect(
      resolveMarketingXReplyEligibility(capabilities(), {
        ownedPost: false,
        accountSummonedByMentionOrQuote: true,
        publicConversation: true,
        sensitiveMedicalQuestion: false,
      }),
    ).toEqual({ kind: "eligible" });
  });

  it("routes sensitive medical questions away from autonomous marketing replies", () => {
    expect(
      resolveMarketingXReplyEligibility(capabilities(), {
        ownedPost: true,
        accountSummonedByMentionOrQuote: true,
        publicConversation: true,
        sensitiveMedicalQuestion: true,
      }),
    ).toEqual({ kind: "blocked", reason: "sensitive_medical_review_required" });
  });

  it("labels LifeMate scheduling separately from verified provider-native scheduling", () => {
    expect(
      resolveMarketingXScheduleTruth("lifemate_worker", capabilities(), "NotVerified"),
    ).toEqual({
      requestedMode: "lifemate_worker",
      effectiveLabel: "LifeMate scheduled",
      providerNativeVerified: false,
    });
    expect(resolveMarketingXScheduleTruth("provider_native", capabilities(), "Supported")).toEqual({
      requestedMode: "provider_native",
      effectiveLabel: "Provider-native scheduled",
      providerNativeVerified: true,
    });
    expect(
      resolveMarketingXScheduleTruth(
        "provider_native",
        capabilities({ verificationFresh: false }),
        "Supported",
      ),
    ).toEqual({
      requestedMode: "provider_native",
      effectiveLabel: "Scheduling unavailable",
      providerNativeVerified: false,
    });
  });

  it("publishes explicit privacy and retry boundaries for downstream agents", () => {
    expect(marketingXBoundary.credentialInBrowserOrLogAllowed).toBe(false);
    expect(marketingXBoundary.providerActorIdentityJoinToLifeMateAccountAllowed).toBe(false);
    expect(marketingXBoundary.aggregateReactionExpandedIntoActorsAllowed).toBe(false);
    expect(marketingXBoundary.blindThreadRetryAfterOutcomeUnknownAllowed).toBe(false);
    expect(marketingXBoundary.providerNativeSchedulingClaimWithoutVerificationAllowed).toBe(false);
  });
});
