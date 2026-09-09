import { describe, expect, it } from "vitest";

import {
  communityItemMayExposeParticipantIdentity,
  marketingCommunityEventDedupeKey,
  marketingCommunityInboxBoundary,
  mayBlindRetryMarketingCommunityMutation,
  resolveMarketingCommunityMutationEligibility,
  resolveMarketingCommunityRetention,
  validateMarketingCommunityIngestCheckpoint,
  validateMarketingCommunityItem,
  validateMarketingCommunityMutation,
  type MarketingCommunityCapability,
  type MarketingCommunityItem,
  type MarketingCommunityMutation,
} from "./marketing-community-inbox-contract";

const ITEM_ID = "11111111-1111-4111-8111-111111111111";
const MUTATION_ID = "22222222-2222-4222-8222-222222222222";
const CREATIVE_ID = "33333333-3333-4333-8333-333333333333";

function item(overrides: Partial<MarketingCommunityItem> = {}): MarketingCommunityItem {
  return {
    itemId: ITEM_ID,
    provider: "instagram",
    providerAccountRef: "ig:lifemate",
    actionType: "comment",
    evidenceKind: "identifiable_action",
    providerEventId: "event:100",
    providerActionId: "comment:100",
    providerContentId: "media:100",
    creativeId: CREATIVE_ID,
    creativeRevision: 1,
    campaignId: null,
    actor: {
      providerScopedId: "ig-user:42",
      displayName: "Example user",
      username: "example_user",
      verifiedByProviderPayload: true,
      lifeMateAccountId: null,
    },
    aggregateValue: null,
    body: "How does this feature work?",
    occurredAtUtc: "2026-09-08T12:00:00.000Z",
    provenance: "webhook",
    state: "needs_reply",
    aiLabel: "product_question",
    aiReviewRequired: true,
    retentionUntilUtc: "2026-12-08T12:00:00.000Z",
    rawProviderPayloadAvailableToBrowser: false,
    ...overrides,
  };
}

const capability: MarketingCommunityCapability = {
  provider: "instagram",
  capabilityVersion: "instagram.community.v1",
  verifiedAtUtc: "2026-09-08T12:00:00.000Z",
  freshnessState: "verified_fresh",
  commentsRead: true,
  mentionsRead: true,
  actorReactionsRead: false,
  actorSharesRead: false,
  replyComment: true,
  privateReply: false,
  hideComment: true,
  deleteComment: true,
};

function mutation(overrides: Partial<MarketingCommunityMutation> = {}): MarketingCommunityMutation {
  return {
    mutationId: MUTATION_ID,
    itemId: ITEM_ID,
    kind: "reply",
    idempotencyKey: "community:reply:comment-100:v1",
    body: "Thanks — here is the product information.",
    requestedByActorId: "staff:test",
    capabilityVersion: "instagram.community.v1",
    state: "requested",
    externalMutationId: null,
    correlationId: "corr:community:001",
    ...overrides,
  };
}

describe("marketing community inbox truthfulness contract", () => {
  it("accepts provider-scoped identifiable comment evidence without LifeMate identity linkage", () => {
    expect(validateMarketingCommunityItem(item())).toBe(true);
    expect(communityItemMayExposeParticipantIdentity(item())).toBe(true);
    expect(item().actor?.lifeMateAccountId).toBeNull();
  });

  it("keeps aggregate shares as counts and never fabricates participant actors", () => {
    const aggregate = item({
      actionType: "aggregate_share",
      evidenceKind: "aggregate_only",
      providerEventId: null,
      providerActionId: "metric:share:media-100",
      actor: null,
      body: null,
      aggregateValue: 24,
      state: "resolved",
      aiLabel: null,
      aiReviewRequired: false,
    });
    expect(validateMarketingCommunityItem(aggregate)).toBe(true);
    expect(communityItemMayExposeParticipantIdentity(aggregate)).toBe(false);
  });

  it("rejects a fake actor list attached to aggregate-only metrics", () => {
    expect(
      validateMarketingCommunityItem(
        item({
          actionType: "aggregate_save",
          evidenceKind: "aggregate_only",
          aggregateValue: 3,
          body: null,
        }),
      ),
    ).toBe(false);
  });

  it("builds stable provider event dedupe keys", () => {
    expect(marketingCommunityEventDedupeKey(item())).toBe(
      "instagram:ig:lifemate:webhook:event:100",
    );
    expect(marketingCommunityEventDedupeKey(item())).toBe(marketingCommunityEventDedupeKey(item()));
  });

  it("blocks external mutations when provider capability is unverified or stale", () => {
    expect(
      resolveMarketingCommunityMutationEligibility(
        item(),
        { ...capability, freshnessState: "unverified" },
        "reply",
      ),
    ).toEqual({ kind: "blocked", reason: "provider_unverified" });
    expect(
      resolveMarketingCommunityMutationEligibility(
        item(),
        { ...capability, freshnessState: "verified_stale" },
        "reply",
      ),
    ).toEqual({ kind: "blocked", reason: "provider_stale" });
  });

  it("uses exact provider capability for reply, private reply and moderation", () => {
    expect(resolveMarketingCommunityMutationEligibility(item(), capability, "reply")).toEqual({
      kind: "eligible",
    });
    expect(
      resolveMarketingCommunityMutationEligibility(item(), capability, "private_reply"),
    ).toEqual({
      kind: "blocked",
      reason: "capability_unsupported",
    });
  });

  it("never treats sensitive medical questions as autonomous marketing replies", () => {
    const medical = item({ aiLabel: "sensitive_medical_question", aiReviewRequired: true });
    expect(resolveMarketingCommunityMutationEligibility(medical, capability, "reply")).toEqual({
      kind: "blocked",
      reason: "medical_auto_reply_forbidden",
    });
  });

  it("validates explicit idempotent mutation metadata and forbids blind outcome-unknown retry", () => {
    expect(validateMarketingCommunityMutation(mutation())).toBe(true);
    expect(mayBlindRetryMarketingCommunityMutation(mutation({ state: "failed_retryable" }))).toBe(
      true,
    );
    expect(mayBlindRetryMarketingCommunityMutation(mutation({ state: "outcome_unknown" }))).toBe(
      false,
    );
  });

  it("validates ingestion checkpoint metadata without credentials", () => {
    expect(
      validateMarketingCommunityIngestCheckpoint({
        provider: "linkedin",
        providerAccountRef: "org:lifemate",
        cursor: "opaque-cursor",
        watermarkUtc: "2026-09-08T12:00:00.000Z",
        capabilityVersion: "linkedin.community.v1",
        idempotencyKey: "community:linkedin:lifemate:20260908",
        lastAttemptAtUtc: "2026-09-08T12:00:00.000Z",
        lastSuccessAtUtc: "2026-09-08T12:00:00.000Z",
        state: "idle",
      }),
    ).toBe(true);
  });

  it("tombstones event-level identity on provider deletion, privacy request or retention expiry", () => {
    expect(resolveMarketingCommunityRetention(item(), "2026-09-09T00:00:00.000Z", true)).toEqual({
      kind: "tombstone",
      reason: "provider_deleted",
    });
    expect(
      resolveMarketingCommunityRetention(item(), "2026-09-09T00:00:00.000Z", false, true),
    ).toEqual({
      kind: "tombstone",
      reason: "privacy_request",
    });
    expect(
      resolveMarketingCommunityRetention(
        item({ retentionUntilUtc: "2026-09-08T10:00:00.000Z" }),
        "2026-09-09T00:00:00.000Z",
      ),
    ).toEqual({ kind: "tombstone", reason: "retention_expired" });
  });

  it("hard-codes social identity and privacy boundaries", () => {
    expect(marketingCommunityInboxBoundary).toMatchObject({
      aggregateMetricMayCreateParticipantList: false,
      providerScopedActorMayBecomeGlobalIdentity: false,
      lifeMateHealthProfileJoinAllowed: false,
      bulkParticipantExportAllowedByDefault: false,
      rawProviderPayloadAvailableToBrowser: false,
      aiMayAnswerClinicalQuestionAutonomously: false,
      outcomeUnknownMayBlindRetry: false,
    });
  });
});
