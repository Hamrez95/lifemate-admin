export const marketingCommunityEvidenceKinds = [
  "aggregate_only",
  "identifiable_action",
  "provider_event",
  "unsupported",
] as const;
export const marketingCommunityActionTypes = [
  "comment",
  "mention",
  "tag",
  "reaction",
  "share_mention",
  "story_mention",
  "message",
  "aggregate_share",
  "aggregate_save",
  "aggregate_view",
] as const;
export const marketingCommunityStates = [
  "unresolved",
  "needs_reply",
  "replied",
  "resolved",
  "hidden",
  "deleted",
  "tombstoned",
] as const;
export const marketingCommunityAiLabels = [
  "praise",
  "question",
  "product_question",
  "support_problem",
  "complaint",
  "spam",
  "ugc",
  "contest_entry",
  "sensitive_medical_question",
] as const;

export type MarketingCommunityEvidenceKind = (typeof marketingCommunityEvidenceKinds)[number];
export type MarketingCommunityActionType = (typeof marketingCommunityActionTypes)[number];
export type MarketingCommunityState = (typeof marketingCommunityStates)[number];
export type MarketingCommunityAiLabel = (typeof marketingCommunityAiLabels)[number];

export type MarketingCommunityActor = {
  providerScopedId: string;
  displayName: string | null;
  username: string | null;
  verifiedByProviderPayload: true;
  lifeMateAccountId: null;
};

export type MarketingCommunityItem = {
  itemId: string;
  provider: string;
  providerAccountRef: string;
  actionType: MarketingCommunityActionType;
  evidenceKind: MarketingCommunityEvidenceKind;
  providerEventId: string | null;
  providerActionId: string | null;
  providerContentId: string | null;
  creativeId: string | null;
  creativeRevision: number | null;
  campaignId: string | null;
  actor: MarketingCommunityActor | null;
  aggregateValue: number | null;
  body: string | null;
  occurredAtUtc: string;
  provenance: "webhook" | "provider_poll" | "manual_internal";
  state: MarketingCommunityState;
  aiLabel: MarketingCommunityAiLabel | null;
  aiReviewRequired: boolean;
  retentionUntilUtc: string | null;
  rawProviderPayloadAvailableToBrowser: false;
};

export type MarketingCommunityCapability = {
  provider: string;
  capabilityVersion: string;
  verifiedAtUtc: string | null;
  freshnessState: "verified_fresh" | "verified_stale" | "unverified";
  commentsRead: boolean;
  mentionsRead: boolean;
  actorReactionsRead: boolean;
  actorSharesRead: boolean;
  replyComment: boolean;
  privateReply: boolean;
  hideComment: boolean;
  deleteComment: boolean;
};

export type MarketingCommunityMutation = {
  mutationId: string;
  itemId: string;
  kind: "reply" | "private_reply" | "hide" | "delete" | "resolve" | "internal_note";
  idempotencyKey: string;
  body: string | null;
  requestedByActorId: string;
  capabilityVersion: string;
  state: "requested" | "succeeded" | "failed_retryable" | "failed_permanent" | "outcome_unknown";
  externalMutationId: string | null;
  correlationId: string;
};

export type MarketingCommunityMutationEligibility =
  | { kind: "eligible" }
  | {
      kind: "blocked";
      reason:
        | "provider_unverified"
        | "provider_stale"
        | "capability_unsupported"
        | "aggregate_only"
        | "item_deleted"
        | "medical_auto_reply_forbidden";
    };

export type MarketingCommunityIngestCheckpoint = {
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

export type MarketingCommunityRetentionDecision =
  | { kind: "retain" }
  | { kind: "tombstone"; reason: "provider_deleted" | "retention_expired" | "privacy_request" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,127}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const MAX_BODY = 5_000;

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function nullableInstant(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
}

function nullableUuid(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && UUID_PATTERN.test(value));
}

function validActor(actor: MarketingCommunityActor | null): boolean {
  if (actor === null) return true;
  return (
    boundedText(actor.providerScopedId, 240) &&
    (actor.displayName === null || boundedText(actor.displayName, 240)) &&
    (actor.username === null || boundedText(actor.username, 240)) &&
    actor.verifiedByProviderPayload === true &&
    actor.lifeMateAccountId === null
  );
}

export function validateMarketingCommunityItem(value: MarketingCommunityItem): boolean {
  if (!UUID_PATTERN.test(value.itemId)) return false;
  if (!boundedText(value.provider, 128) || !CODE_PATTERN.test(value.provider)) return false;
  if (!boundedText(value.providerAccountRef, 240)) return false;
  if (!marketingCommunityActionTypes.includes(value.actionType)) return false;
  if (!marketingCommunityEvidenceKinds.includes(value.evidenceKind)) return false;
  if (!nullableUuid(value.creativeId) || !nullableUuid(value.campaignId)) return false;
  if (
    value.creativeRevision !== null &&
    (!Number.isInteger(value.creativeRevision) || value.creativeRevision < 1)
  ) {
    return false;
  }
  if (value.creativeId === null && value.creativeRevision !== null) return false;
  if (!validActor(value.actor)) return false;
  if (
    value.aggregateValue !== null &&
    (!Number.isFinite(value.aggregateValue) || value.aggregateValue < 0)
  ) {
    return false;
  }
  if (value.body !== null && !boundedText(value.body, MAX_BODY)) return false;
  if (Number.isNaN(Date.parse(value.occurredAtUtc))) return false;
  if (!marketingCommunityStates.includes(value.state)) return false;
  if (value.aiLabel !== null && !marketingCommunityAiLabels.includes(value.aiLabel)) return false;
  if (!nullableInstant(value.retentionUntilUtc)) return false;
  if (value.rawProviderPayloadAvailableToBrowser !== false) return false;

  if (value.evidenceKind === "aggregate_only") {
    if (value.actor !== null || value.body !== null || value.aggregateValue === null) return false;
    if (!value.actionType.startsWith("aggregate_")) return false;
  }
  if (value.actionType.startsWith("aggregate_") && value.evidenceKind !== "aggregate_only")
    return false;
  if (
    (value.evidenceKind === "identifiable_action" || value.evidenceKind === "provider_event") &&
    value.actor === null &&
    value.actionType === "reaction"
  ) {
    return false;
  }
  if (
    value.evidenceKind === "unsupported" &&
    (value.actor !== null || value.aggregateValue !== null)
  ) {
    return false;
  }
  if (value.aiLabel === "sensitive_medical_question" && value.aiReviewRequired !== true)
    return false;
  return true;
}

export function marketingCommunityEventDedupeKey(item: MarketingCommunityItem): string | null {
  if (!validateMarketingCommunityItem(item)) return null;
  const externalId = item.providerEventId ?? item.providerActionId;
  if (!externalId || !boundedText(externalId, 300)) return null;
  return `${item.provider}:${item.providerAccountRef}:${item.provenance}:${externalId}`;
}

export function resolveMarketingCommunityMutationEligibility(
  item: MarketingCommunityItem,
  capability: MarketingCommunityCapability,
  mutation: MarketingCommunityMutation["kind"],
): MarketingCommunityMutationEligibility {
  if (item.evidenceKind === "aggregate_only" || item.evidenceKind === "unsupported") {
    return { kind: "blocked", reason: "aggregate_only" };
  }
  if (item.state === "deleted" || item.state === "tombstoned") {
    return { kind: "blocked", reason: "item_deleted" };
  }
  if (capability.freshnessState === "unverified") {
    return { kind: "blocked", reason: "provider_unverified" };
  }
  if (capability.freshnessState === "verified_stale") {
    return { kind: "blocked", reason: "provider_stale" };
  }
  if (
    item.aiLabel === "sensitive_medical_question" &&
    (mutation === "reply" || mutation === "private_reply")
  ) {
    return { kind: "blocked", reason: "medical_auto_reply_forbidden" };
  }
  const supported =
    mutation === "reply"
      ? capability.replyComment
      : mutation === "private_reply"
        ? capability.privateReply
        : mutation === "hide"
          ? capability.hideComment
          : mutation === "delete"
            ? capability.deleteComment
            : true;
  return supported ? { kind: "eligible" } : { kind: "blocked", reason: "capability_unsupported" };
}

export function validateMarketingCommunityMutation(value: MarketingCommunityMutation): boolean {
  if (!UUID_PATTERN.test(value.mutationId) || !UUID_PATTERN.test(value.itemId)) return false;
  if (!IDEMPOTENCY_PATTERN.test(value.idempotencyKey)) return false;
  if (value.body !== null && !boundedText(value.body, MAX_BODY)) return false;
  if (!boundedText(value.requestedByActorId, 240)) return false;
  if (!boundedText(value.capabilityVersion, 128)) return false;
  if (!boundedText(value.correlationId, 180)) return false;
  if (
    !["requested", "succeeded", "failed_retryable", "failed_permanent", "outcome_unknown"].includes(
      value.state,
    )
  ) {
    return false;
  }
  if (value.externalMutationId !== null && !boundedText(value.externalMutationId, 300))
    return false;
  if ((value.kind === "reply" || value.kind === "private_reply") && value.body === null)
    return false;
  return true;
}

export function mayBlindRetryMarketingCommunityMutation(
  value: MarketingCommunityMutation,
): boolean {
  return value.state === "failed_retryable";
}

export function validateMarketingCommunityIngestCheckpoint(
  value: MarketingCommunityIngestCheckpoint,
): boolean {
  return (
    boundedText(value.provider, 128) &&
    CODE_PATTERN.test(value.provider) &&
    boundedText(value.providerAccountRef, 240) &&
    (value.cursor === null || boundedText(value.cursor, 1_000)) &&
    nullableInstant(value.watermarkUtc) &&
    boundedText(value.capabilityVersion, 128) &&
    IDEMPOTENCY_PATTERN.test(value.idempotencyKey) &&
    nullableInstant(value.lastAttemptAtUtc) &&
    nullableInstant(value.lastSuccessAtUtc) &&
    ["idle", "syncing", "rate_limited", "failed", "unavailable"].includes(value.state)
  );
}

export function resolveMarketingCommunityRetention(
  item: MarketingCommunityItem,
  nowUtc: string,
  providerDeleted = false,
  privacyRequested = false,
): MarketingCommunityRetentionDecision {
  if (privacyRequested) return { kind: "tombstone", reason: "privacy_request" };
  if (providerDeleted) return { kind: "tombstone", reason: "provider_deleted" };
  if (
    item.retentionUntilUtc !== null &&
    !Number.isNaN(Date.parse(nowUtc)) &&
    Date.parse(item.retentionUntilUtc) <= Date.parse(nowUtc)
  ) {
    return { kind: "tombstone", reason: "retention_expired" };
  }
  return { kind: "retain" };
}

export function communityItemMayExposeParticipantIdentity(item: MarketingCommunityItem): boolean {
  return (
    (item.evidenceKind === "identifiable_action" || item.evidenceKind === "provider_event") &&
    item.actor !== null
  );
}

export const marketingCommunityInboxBoundary = {
  aggregateMetricMayCreateParticipantList: false,
  providerScopedActorMayBecomeGlobalIdentity: false,
  lifeMateHealthProfileJoinAllowed: false,
  bulkParticipantExportAllowedByDefault: false,
  rawProviderPayloadAvailableToBrowser: false,
  aiMaySendReplyWithoutHumanPolicy: false,
  aiMayAnswerClinicalQuestionAutonomously: false,
  providerMutationRequiresVerifiedFreshCapability: true,
  outcomeUnknownMayBlindRetry: false,
  eventIdentityRetentionMustBeBounded: true,
} as const;
