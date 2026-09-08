export const marketingContestVerificationClasses = [
  "verifiable_identity",
  "verifiable_aggregate_only",
  "manual_evidence_required",
  "unsupported",
] as const;
export const marketingContestRuleKinds = [
  "comment",
  "comment_keyword",
  "mention",
  "story_mention",
  "reaction",
  "share_mention",
  "aggregate_share",
  "aggregate_save",
  "manual_evidence",
] as const;
export const marketingContestEntryStates = [
  "pending",
  "eligible",
  "excluded",
  "invalidated",
  "manual_review_required",
] as const;
export const marketingContestWinnerStates = [
  "drawn",
  "verification_pending",
  "verified",
  "ineligible",
  "alternate_selected",
  "contacted",
  "prize_pending",
  "fulfilled",
  "declined_expired",
] as const;

export type MarketingContestVerificationClass =
  (typeof marketingContestVerificationClasses)[number];
export type MarketingContestRuleKind = (typeof marketingContestRuleKinds)[number];
export type MarketingContestEntryState = (typeof marketingContestEntryStates)[number];
export type MarketingContestWinnerState = (typeof marketingContestWinnerStates)[number];

export type MarketingContestRule = {
  ruleId: string;
  kind: MarketingContestRuleKind;
  verificationClass: MarketingContestVerificationClass;
  providerCapabilityVersion: string;
  sourceContentId: string;
  requiredKeyword: string | null;
  maxEntriesPerParticipant: number;
  enabled: boolean;
};

export type MarketingContest = {
  contestId: string;
  revision: number;
  internalName: string;
  provider: string;
  providerAccountRef: string;
  sourceCreativeId: string | null;
  startAtUtc: string;
  endAtUtc: string;
  timezone: string;
  state: "draft" | "approved" | "active" | "closed" | "drawn" | "cancelled";
  rulesVersion: string;
  publicRulesText: string;
  rules: MarketingContestRule[];
  excludeStaffAndTestAccounts: true;
};

export type MarketingContestEntry = {
  entryId: string;
  contestId: string;
  ruleId: string;
  provider: string;
  providerActionId: string;
  providerScopedParticipantId: string | null;
  providerUsername: string | null;
  sourceContentId: string;
  occurredAtUtc: string;
  provenance: "webhook" | "provider_poll" | "manual_review";
  verificationClass: MarketingContestVerificationClass;
  state: MarketingContestEntryState;
  exclusionReason: string | null;
  manualReviewerId: string | null;
  manualReviewReason: string | null;
  dedupeKey: string;
  lifeMateAccountId: null;
};

export type MarketingContestEligibilityPolicy = {
  dedupeMode: "one_per_provider_actor" | "one_per_action" | "capped_per_provider_actor";
  maxEntriesPerParticipant: number;
  deletedActionPolicy: "invalidate_before_draw" | "snapshot_at_close";
};

export type MarketingContestEligibilitySnapshot = {
  snapshotId: string;
  contestId: string;
  contestRevision: number;
  rulesVersion: string;
  policyVersion: string;
  frozenAtUtc: string;
  entries: MarketingContestSnapshotEntry[];
  eligibleParticipantCount: number;
  eligibleEntryCount: number;
  checksumSha256: string;
};

export type MarketingContestSnapshotEntry = {
  entryId: string;
  participantKey: string;
  providerActionId: string;
  ruleId: string;
};

export type MarketingContestDrawRecord = {
  drawId: string;
  snapshotId: string;
  algorithmVersion: string;
  randomSource: "node_crypto_random_int";
  requestedWinnerCount: number;
  requestedAlternateCount: number;
  selectedEntryIds: string[];
  alternateEntryIds: string[];
  drawnAtUtc: string;
  drawnByActorId: string;
  redrawOfDrawId: string | null;
  redrawReason: string | null;
};

export type MarketingContestWinner = {
  winnerId: string;
  drawId: string;
  entryId: string;
  state: MarketingContestWinnerState;
  verificationReason: string | null;
  alternateForWinnerId: string | null;
  prizeReference: string;
  fulfillmentMethod: "canonical_entitlement" | "coupon_reference" | "external_fulfillment";
  canonicalFulfillmentId: string | null;
};

export type MarketingContestRuleAutomationEligibility =
  | { kind: "automated" }
  | { kind: "manual_evidence_required" }
  | { kind: "aggregate_only_not_person_eligible" }
  | { kind: "unsupported" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const MAX_RULES = 20;

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function validInstant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nullableUuid(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && UUID_PATTERN.test(value));
}

export function validateMarketingContestRule(rule: MarketingContestRule): boolean {
  if (!UUID_PATTERN.test(rule.ruleId)) return false;
  if (!marketingContestRuleKinds.includes(rule.kind)) return false;
  if (!marketingContestVerificationClasses.includes(rule.verificationClass)) return false;
  if (!boundedText(rule.providerCapabilityVersion, 128)) return false;
  if (!boundedText(rule.sourceContentId, 300)) return false;
  if (rule.requiredKeyword !== null && !boundedText(rule.requiredKeyword, 120)) return false;
  if (
    !Number.isInteger(rule.maxEntriesPerParticipant) ||
    rule.maxEntriesPerParticipant < 1 ||
    rule.maxEntriesPerParticipant > 100
  ) {
    return false;
  }
  if (typeof rule.enabled !== "boolean") return false;
  if (
    (rule.kind === "aggregate_share" || rule.kind === "aggregate_save") &&
    rule.verificationClass !== "verifiable_aggregate_only"
  ) {
    return false;
  }
  if (rule.kind === "manual_evidence" && rule.verificationClass !== "manual_evidence_required") {
    return false;
  }
  if (rule.kind === "comment_keyword" && rule.requiredKeyword === null) return false;
  return true;
}

export function resolveMarketingContestRuleAutomation(
  rule: MarketingContestRule,
): MarketingContestRuleAutomationEligibility {
  if (!rule.enabled || rule.verificationClass === "unsupported") return { kind: "unsupported" };
  if (rule.verificationClass === "verifiable_aggregate_only") {
    return { kind: "aggregate_only_not_person_eligible" };
  }
  if (rule.verificationClass === "manual_evidence_required") {
    return { kind: "manual_evidence_required" };
  }
  return { kind: "automated" };
}

export function validateMarketingContest(contest: MarketingContest): boolean {
  if (!UUID_PATTERN.test(contest.contestId)) return false;
  if (!Number.isInteger(contest.revision) || contest.revision < 1) return false;
  if (!boundedText(contest.internalName, 200)) return false;
  if (!boundedText(contest.provider, 128) || !CODE_PATTERN.test(contest.provider)) return false;
  if (!boundedText(contest.providerAccountRef, 240)) return false;
  if (!nullableUuid(contest.sourceCreativeId)) return false;
  if (!validInstant(contest.startAtUtc) || !validInstant(contest.endAtUtc)) return false;
  if (Date.parse(contest.endAtUtc) <= Date.parse(contest.startAtUtc)) return false;
  if (!boundedText(contest.timezone, 80)) return false;
  if (!boundedText(contest.rulesVersion, 128) || !boundedText(contest.publicRulesText, 20_000)) {
    return false;
  }
  if (
    !Array.isArray(contest.rules) ||
    contest.rules.length < 1 ||
    contest.rules.length > MAX_RULES
  ) {
    return false;
  }
  if (!contest.rules.every(validateMarketingContestRule)) return false;
  if (new Set(contest.rules.map((rule) => rule.ruleId)).size !== contest.rules.length) return false;
  return contest.excludeStaffAndTestAccounts === true;
}

export function validateMarketingContestEntry(entry: MarketingContestEntry): boolean {
  if (!UUID_PATTERN.test(entry.entryId) || !UUID_PATTERN.test(entry.contestId)) return false;
  if (!UUID_PATTERN.test(entry.ruleId)) return false;
  if (!boundedText(entry.provider, 128) || !CODE_PATTERN.test(entry.provider)) return false;
  if (!boundedText(entry.providerActionId, 300) || !boundedText(entry.sourceContentId, 300)) {
    return false;
  }
  if (!validInstant(entry.occurredAtUtc)) return false;
  if (!marketingContestVerificationClasses.includes(entry.verificationClass)) return false;
  if (!marketingContestEntryStates.includes(entry.state)) return false;
  if (!boundedText(entry.dedupeKey, 300)) return false;
  if (entry.lifeMateAccountId !== null) return false;
  if (
    entry.providerScopedParticipantId !== null &&
    !boundedText(entry.providerScopedParticipantId, 300)
  ) {
    return false;
  }
  if (entry.providerUsername !== null && !boundedText(entry.providerUsername, 240)) return false;
  if (entry.exclusionReason !== null && !boundedText(entry.exclusionReason, 500)) return false;

  if (entry.verificationClass === "verifiable_aggregate_only") {
    return false;
  }
  if (entry.verificationClass === "unsupported") return false;
  if (
    entry.verificationClass === "verifiable_identity" &&
    entry.providerScopedParticipantId === null
  ) {
    return false;
  }
  if (entry.provenance === "manual_review") {
    if (
      !boundedText(entry.manualReviewerId, 240) ||
      !boundedText(entry.manualReviewReason, 1_000)
    ) {
      return false;
    }
  } else if (entry.manualReviewerId !== null || entry.manualReviewReason !== null) {
    return false;
  }
  if (
    entry.verificationClass === "manual_evidence_required" &&
    entry.state === "eligible" &&
    entry.provenance !== "manual_review"
  ) {
    return false;
  }
  return true;
}

export function marketingContestEntryDedupeKey(
  contestId: string,
  provider: string,
  ruleId: string,
  participantId: string | null,
  providerActionId: string,
  policy: MarketingContestEligibilityPolicy,
): string | null {
  if (!UUID_PATTERN.test(contestId) || !UUID_PATTERN.test(ruleId)) return null;
  if (!boundedText(provider, 128) || !boundedText(providerActionId, 300)) return null;
  if (policy.dedupeMode !== "one_per_action" && !boundedText(participantId, 300)) return null;
  if (policy.dedupeMode === "one_per_action") {
    return `${contestId}:${provider}:${ruleId}:action:${providerActionId}`;
  }
  return `${contestId}:${provider}:${ruleId}:actor:${participantId}`;
}

export function normalizeMarketingContestEligibleEntries(
  entries: MarketingContestEntry[],
  policy: MarketingContestEligibilityPolicy,
): MarketingContestSnapshotEntry[] {
  const eligible = entries.filter(
    (entry) => entry.state === "eligible" && validateMarketingContestEntry(entry),
  );
  const result: MarketingContestSnapshotEntry[] = [];
  const participantCounts = new Map<string, number>();
  const seenActions = new Set<string>();

  for (const entry of eligible) {
    if (seenActions.has(entry.providerActionId)) continue;
    seenActions.add(entry.providerActionId);
    const participantKey = entry.providerScopedParticipantId ?? `manual:${entry.entryId}`;
    const currentCount = participantCounts.get(participantKey) ?? 0;
    const cap =
      policy.dedupeMode === "one_per_provider_actor"
        ? 1
        : policy.dedupeMode === "capped_per_provider_actor"
          ? policy.maxEntriesPerParticipant
          : Number.MAX_SAFE_INTEGER;
    if (currentCount >= cap) continue;
    participantCounts.set(participantKey, currentCount + 1);
    result.push({
      entryId: entry.entryId,
      participantKey,
      providerActionId: entry.providerActionId,
      ruleId: entry.ruleId,
    });
  }
  return result.sort((a, b) => a.entryId.localeCompare(b.entryId));
}

export function validateMarketingContestEligibilitySnapshot(
  snapshot: MarketingContestEligibilitySnapshot,
): boolean {
  if (!UUID_PATTERN.test(snapshot.snapshotId) || !UUID_PATTERN.test(snapshot.contestId))
    return false;
  if (!Number.isInteger(snapshot.contestRevision) || snapshot.contestRevision < 1) return false;
  if (!boundedText(snapshot.rulesVersion, 128) || !boundedText(snapshot.policyVersion, 128)) {
    return false;
  }
  if (!validInstant(snapshot.frozenAtUtc) || !SHA256_PATTERN.test(snapshot.checksumSha256))
    return false;
  if (!Array.isArray(snapshot.entries)) return false;
  if (new Set(snapshot.entries.map((entry) => entry.entryId)).size !== snapshot.entries.length) {
    return false;
  }
  if (
    !Number.isInteger(snapshot.eligibleEntryCount) ||
    snapshot.eligibleEntryCount !== snapshot.entries.length
  ) {
    return false;
  }
  const participantCount = new Set(snapshot.entries.map((entry) => entry.participantKey)).size;
  return snapshot.eligibleParticipantCount === participantCount;
}

export function validateMarketingContestDrawRecord(draw: MarketingContestDrawRecord): boolean {
  if (!UUID_PATTERN.test(draw.drawId) || !UUID_PATTERN.test(draw.snapshotId)) return false;
  if (!boundedText(draw.algorithmVersion, 128) || draw.randomSource !== "node_crypto_random_int")
    return false;
  if (!Number.isInteger(draw.requestedWinnerCount) || draw.requestedWinnerCount < 1) return false;
  if (!Number.isInteger(draw.requestedAlternateCount) || draw.requestedAlternateCount < 0)
    return false;
  if (!validInstant(draw.drawnAtUtc) || !boundedText(draw.drawnByActorId, 240)) return false;
  const all = [...draw.selectedEntryIds, ...draw.alternateEntryIds];
  if (!all.every((entryId) => UUID_PATTERN.test(entryId))) return false;
  if (new Set(all).size !== all.length) return false;
  if (draw.redrawOfDrawId === null) return draw.redrawReason === null;
  return UUID_PATTERN.test(draw.redrawOfDrawId) && boundedText(draw.redrawReason, 1_000);
}

export function validateMarketingContestWinner(winner: MarketingContestWinner): boolean {
  if (!UUID_PATTERN.test(winner.winnerId) || !UUID_PATTERN.test(winner.drawId)) return false;
  if (!UUID_PATTERN.test(winner.entryId)) return false;
  if (!marketingContestWinnerStates.includes(winner.state)) return false;
  if (winner.verificationReason !== null && !boundedText(winner.verificationReason, 1_000))
    return false;
  if (winner.alternateForWinnerId !== null && !UUID_PATTERN.test(winner.alternateForWinnerId))
    return false;
  if (!boundedText(winner.prizeReference, 500)) return false;
  if (winner.canonicalFulfillmentId !== null && !boundedText(winner.canonicalFulfillmentId, 300)) {
    return false;
  }
  if (winner.fulfillmentMethod === "canonical_entitlement" && winner.state === "fulfilled") {
    return winner.canonicalFulfillmentId !== null;
  }
  return true;
}

export const marketingContestBoundary = {
  aggregateShareMayCreateParticipantEntry: false,
  aggregateSaveMayCreateParticipantEntry: false,
  providerScopedIdentityMayJoinLifeMateHealthData: false,
  manualEvidenceMayAutoApproveWithoutReviewer: false,
  aiMayChooseSubjectiveWinnerAutonomously: false,
  drawSnapshotMustBeFrozen: true,
  silentRerollAllowed: false,
  fakePaymentForEntitlementPrizeAllowed: false,
  winnerContactMayBeScrapedFromSocialProfile: false,
  rawProviderPayloadAvailableToBrowser: false,
} as const;
