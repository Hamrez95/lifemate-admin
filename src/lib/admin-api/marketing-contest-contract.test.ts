import { describe, expect, it } from "vitest";

import {
  marketingContestBoundary,
  marketingContestEntryDedupeKey,
  normalizeMarketingContestEligibleEntries,
  resolveMarketingContestRuleAutomation,
  validateMarketingContest,
  validateMarketingContestDrawRecord,
  validateMarketingContestEligibilitySnapshot,
  validateMarketingContestEntry,
  validateMarketingContestRule,
  validateMarketingContestWinner,
  type MarketingContest,
  type MarketingContestEligibilityPolicy,
  type MarketingContestEntry,
  type MarketingContestEligibilitySnapshot,
  type MarketingContestRule,
} from "./marketing-contest-contract";
import {
  drawMarketingContestWinners,
  marketingContestSnapshotChecksum,
} from "./marketing-contest-server";

const CONTEST_ID = "11111111-1111-4111-8111-111111111111";
const RULE_ID = "22222222-2222-4222-8222-222222222222";
const ENTRY_A = "33333333-3333-4333-8333-333333333333";
const ENTRY_B = "44444444-4444-4444-8444-444444444444";
const ENTRY_C = "55555555-5555-4555-8555-555555555555";
const SNAPSHOT_ID = "66666666-6666-4666-8666-666666666666";
const DRAW_ID = "77777777-7777-4777-8777-777777777777";
const WINNER_ID = "88888888-8888-4888-8888-888888888888";

function rule(overrides: Partial<MarketingContestRule> = {}): MarketingContestRule {
  return {
    ruleId: RULE_ID,
    kind: "comment",
    verificationClass: "verifiable_identity",
    providerCapabilityVersion: "instagram.community.v1",
    sourceContentId: "media:100",
    requiredKeyword: null,
    maxEntriesPerParticipant: 1,
    enabled: true,
    ...overrides,
  };
}

function contest(overrides: Partial<MarketingContest> = {}): MarketingContest {
  return {
    contestId: CONTEST_ID,
    revision: 1,
    internalName: "LifeMate launch giveaway",
    provider: "instagram",
    providerAccountRef: "ig:lifemate",
    sourceCreativeId: null,
    startAtUtc: "2026-09-08T08:00:00.000Z",
    endAtUtc: "2026-09-10T08:00:00.000Z",
    timezone: "Asia/Tehran",
    state: "approved",
    rulesVersion: "contest-rules.v1",
    publicRulesText: "Comment during the entry period. One eligible entry per provider actor.",
    rules: [rule()],
    excludeStaffAndTestAccounts: true,
    ...overrides,
  };
}

function entry(
  entryId: string,
  participantId: string,
  actionId: string,
  overrides: Partial<MarketingContestEntry> = {},
): MarketingContestEntry {
  return {
    entryId,
    contestId: CONTEST_ID,
    ruleId: RULE_ID,
    provider: "instagram",
    providerActionId: actionId,
    providerScopedParticipantId: participantId,
    providerUsername: "participant",
    sourceContentId: "media:100",
    occurredAtUtc: "2026-09-09T08:00:00.000Z",
    provenance: "webhook",
    verificationClass: "verifiable_identity",
    state: "eligible",
    exclusionReason: null,
    manualReviewerId: null,
    manualReviewReason: null,
    dedupeKey: `${CONTEST_ID}:instagram:${RULE_ID}:actor:${participantId}`,
    lifeMateAccountId: null,
    ...overrides,
  };
}

const policy: MarketingContestEligibilityPolicy = {
  dedupeMode: "one_per_provider_actor",
  maxEntriesPerParticipant: 1,
  deletedActionPolicy: "invalidate_before_draw",
};

function snapshot(): MarketingContestEligibilitySnapshot {
  const base = {
    snapshotId: SNAPSHOT_ID,
    contestId: CONTEST_ID,
    contestRevision: 1,
    rulesVersion: "contest-rules.v1",
    policyVersion: "eligibility.v1",
    frozenAtUtc: "2026-09-10T08:01:00.000Z",
    entries: [
      {
        entryId: ENTRY_A,
        participantKey: "actor:a",
        providerActionId: "comment:a",
        ruleId: RULE_ID,
      },
      {
        entryId: ENTRY_B,
        participantKey: "actor:b",
        providerActionId: "comment:b",
        ruleId: RULE_ID,
      },
      {
        entryId: ENTRY_C,
        participantKey: "actor:c",
        providerActionId: "comment:c",
        ruleId: RULE_ID,
      },
    ],
    eligibleParticipantCount: 3,
    eligibleEntryCount: 3,
  };
  return { ...base, checksumSha256: marketingContestSnapshotChecksum(base) };
}

describe("marketing contest governance contract", () => {
  it("accepts person-verifiable comment rules", () => {
    expect(validateMarketingContestRule(rule())).toBe(true);
    expect(resolveMarketingContestRuleAutomation(rule())).toEqual({ kind: "automated" });
  });

  it("never treats aggregate share/save metrics as person-level automatic eligibility", () => {
    const aggregateShare = rule({
      kind: "aggregate_share",
      verificationClass: "verifiable_aggregate_only",
    });
    expect(validateMarketingContestRule(aggregateShare)).toBe(true);
    expect(resolveMarketingContestRuleAutomation(aggregateShare)).toEqual({
      kind: "aggregate_only_not_person_eligible",
    });
    expect(
      validateMarketingContestRule(
        rule({ kind: "aggregate_save", verificationClass: "verifiable_identity" }),
      ),
    ).toBe(false);
  });

  it("requires manual evidence rules to stay visibly manual", () => {
    const manual = rule({ kind: "manual_evidence", verificationClass: "manual_evidence_required" });
    expect(resolveMarketingContestRuleAutomation(manual)).toEqual({
      kind: "manual_evidence_required",
    });
  });

  it("validates versioned contest rules and exact UTC entry window", () => {
    expect(validateMarketingContest(contest())).toBe(true);
    expect(validateMarketingContest(contest({ endAtUtc: "2026-09-08T07:00:00.000Z" }))).toBe(false);
  });

  it("rejects aggregate-only rows from becoming participant entries", () => {
    expect(
      validateMarketingContestEntry(
        entry(ENTRY_A, "actor:a", "share-count:1", {
          verificationClass: "verifiable_aggregate_only",
        }),
      ),
    ).toBe(false);
  });

  it("requires a human reviewer before manual evidence becomes eligible", () => {
    expect(
      validateMarketingContestEntry(
        entry(ENTRY_A, "manual:a", "manual:1", {
          provenance: "manual_review",
          verificationClass: "manual_evidence_required",
          manualReviewerId: "staff:reviewer",
          manualReviewReason: "Screenshot and source link matched the published contest rule.",
        }),
      ),
    ).toBe(true);
    expect(
      validateMarketingContestEntry(
        entry(ENTRY_A, "manual:a", "manual:1", {
          verificationClass: "manual_evidence_required",
        }),
      ),
    ).toBe(false);
  });

  it("never joins a provider participant identity to a LifeMate account", () => {
    expect(validateMarketingContestEntry(entry(ENTRY_A, "actor:a", "comment:a"))).toBe(true);
    expect(entry(ENTRY_A, "actor:a", "comment:a").lifeMateAccountId).toBeNull();
  });

  it("builds deterministic dedupe keys according to contest policy", () => {
    expect(
      marketingContestEntryDedupeKey(
        CONTEST_ID,
        "instagram",
        RULE_ID,
        "actor:a",
        "comment:a",
        policy,
      ),
    ).toBe(`${CONTEST_ID}:instagram:${RULE_ID}:actor:actor:a`);
  });

  it("deduplicates provider actors and duplicate actions before the draw snapshot", () => {
    const normalized = normalizeMarketingContestEligibleEntries(
      [
        entry(ENTRY_A, "actor:a", "comment:a"),
        entry(ENTRY_B, "actor:a", "comment:b"),
        entry(ENTRY_C, "actor:c", "comment:a"),
      ],
      policy,
    );
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.entryId).toBe(ENTRY_A);
  });

  it("validates a frozen eligibility snapshot with checksum metadata", () => {
    expect(validateMarketingContestEligibilitySnapshot(snapshot())).toBe(true);
    expect(snapshot().checksumSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("draws winners and alternates without replacement using injectable deterministic test entropy", () => {
    const indexes = [1, 0];
    const draw = drawMarketingContestWinners(
      snapshot(),
      {
        drawId: DRAW_ID,
        winnerCount: 1,
        alternateCount: 1,
        drawnAtUtc: "2026-09-10T08:05:00.000Z",
        drawnByActorId: "staff:founder",
      },
      () => indexes.shift() ?? 0,
    );
    expect(draw.selectedEntryIds).toEqual([ENTRY_B]);
    expect(draw.alternateEntryIds).toHaveLength(1);
    expect(new Set([...draw.selectedEntryIds, ...draw.alternateEntryIds]).size).toBe(2);
    expect(validateMarketingContestDrawRecord(draw)).toBe(true);
  });

  it("requires explicit redraw lineage and reason", () => {
    expect(
      validateMarketingContestDrawRecord({
        ...drawMarketingContestWinners(
          snapshot(),
          {
            drawId: DRAW_ID,
            winnerCount: 1,
            alternateCount: 0,
            drawnAtUtc: "2026-09-10T08:05:00.000Z",
            drawnByActorId: "staff:founder",
          },
          () => 0,
        ),
        redrawOfDrawId: "99999999-9999-4999-8999-999999999999",
        redrawReason: null,
      }),
    ).toBe(false);
  });

  it("requires a canonical fulfillment id for a fulfilled entitlement prize", () => {
    expect(
      validateMarketingContestWinner({
        winnerId: WINNER_ID,
        drawId: DRAW_ID,
        entryId: ENTRY_A,
        state: "fulfilled",
        verificationReason: null,
        alternateForWinnerId: null,
        prizeReference: "LifeMate annual access",
        fulfillmentMethod: "canonical_entitlement",
        canonicalFulfillmentId: null,
      }),
    ).toBe(false);
  });

  it("hard-codes contest fairness, privacy and commerce boundaries", () => {
    expect(marketingContestBoundary).toMatchObject({
      aggregateShareMayCreateParticipantEntry: false,
      aggregateSaveMayCreateParticipantEntry: false,
      providerScopedIdentityMayJoinLifeMateHealthData: false,
      manualEvidenceMayAutoApproveWithoutReviewer: false,
      silentRerollAllowed: false,
      fakePaymentForEntitlementPrizeAllowed: false,
      winnerContactMayBeScrapedFromSocialProfile: false,
    });
  });
});
