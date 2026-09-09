import type { MarketingCapabilityState, MarketingProviderConnectivity } from "./marketing-channels";

export const marketingXContentKinds = [
  "single_post",
  "thread",
  "quote_post",
  "poll",
  "image_post",
  "video_post",
] as const;

export const marketingXActorEvidenceKinds = [
  "liking_user",
  "reposting_user",
  "reply_author",
  "mention_author",
  "quote_author",
  "aggregate_only",
  "unsupported",
] as const;

export const marketingXThreadNodeStates = [
  "draft",
  "approved",
  "publishing",
  "published_verified",
  "failed_retryable",
  "failed_permanent",
  "outcome_unknown",
  "superseded",
] as const;

export type MarketingXContentKind = (typeof marketingXContentKinds)[number];
export type MarketingXActorEvidenceKind = (typeof marketingXActorEvidenceKinds)[number];
export type MarketingXThreadNodeState = (typeof marketingXThreadNodeStates)[number];

export type MarketingXCapabilityMatrix = {
  providerCode: "x";
  connectivity: MarketingProviderConnectivity;
  textPost: MarketingCapabilityState;
  imagePost: MarketingCapabilityState;
  videoPost: MarketingCapabilityState;
  polls: MarketingCapabilityState;
  quotePost: MarketingCapabilityState;
  replies: MarketingCapabilityState;
  threads: MarketingCapabilityState;
  recentSearch: MarketingCapabilityState;
  fullSearch: MarketingCapabilityState;
  filteredStream: MarketingCapabilityState;
  likingUsers: MarketingCapabilityState;
  repostingUsers: MarketingCapabilityState;
  analytics: MarketingCapabilityState;
  mediaAnalytics: MarketingCapabilityState;
  usageRead: MarketingCapabilityState;
  lastVerifiedAtUtc: string | null;
  verificationFresh: boolean;
};

export type MarketingXAsset = {
  assetId: string;
  kind: "image" | "video" | "gif";
  altText: string | null;
  revision: number;
};

export type MarketingXPostDraft = {
  draftId: string;
  revision: number;
  authorAccountRef: string;
  kind: Exclude<MarketingXContentKind, "thread">;
  text: string;
  assets: MarketingXAsset[];
  quotedPostId: string | null;
  poll: {
    options: string[];
    durationMinutes: number;
  } | null;
  sourceCreativeId: string;
  sourceCreativeRevision: number;
  riskClass: "low_risk" | "review_required" | "blocked";
};

export type MarketingXThreadNode = {
  nodeId: string;
  order: number;
  draft: MarketingXPostDraft;
  state: MarketingXThreadNodeState;
  externalPostId: string | null;
  parentExternalPostId: string | null;
  attempt: number;
};

export type MarketingXThread = {
  threadId: string;
  revision: number;
  authorAccountRef: string;
  nodes: MarketingXThreadNode[];
  sourceCreativeId: string;
  sourceCreativeRevision: number;
};

export type MarketingXPublishEligibility =
  | { kind: "eligible" }
  | {
      kind: "blocked";
      reason:
        | "provider_unverified"
        | "provider_unavailable"
        | "capability_unsupported"
        | "capability_not_verified"
        | "risk_blocked"
        | "invalid_draft";
    };

export type MarketingXThreadResumePlan =
  | { kind: "complete" }
  | { kind: "publish_next"; nodeId: string; parentExternalPostId: string | null }
  | { kind: "blocked"; reason: "prior_node_unverified" | "outcome_unknown" | "permanent_failure" };

export type MarketingXActorEvidence = {
  evidenceId: string;
  providerAccountRef: string;
  externalPostId: string;
  kind: MarketingXActorEvidenceKind;
  actorProviderUserId: string | null;
  actorHandle: string | null;
  aggregateValue: number | null;
  observedAtUtc: string;
  source: "provider_verified" | "manual_review";
};

export type MarketingXReplyContext = {
  ownedPost: boolean;
  accountSummonedByMentionOrQuote: boolean;
  publicConversation: boolean;
  sensitiveMedicalQuestion: boolean;
};

export type MarketingXReplyEligibility =
  | { kind: "eligible" }
  | {
      kind: "blocked";
      reason:
        | "provider_unverified"
        | "reply_capability_unsupported"
        | "reply_capability_not_verified"
        | "provider_rule_not_satisfied"
        | "sensitive_medical_review_required";
    };

export type MarketingXScheduleTruth = {
  requestedMode: "lifemate_worker" | "provider_native";
  effectiveLabel: "LifeMate scheduled" | "Provider-native scheduled" | "Scheduling unavailable";
  providerNativeVerified: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POST_ID_PATTERN = /^[A-Za-z0-9:_-]{1,128}$/;
const ACCOUNT_PATTERN = /^[A-Za-z0-9@._:-]{1,160}$/;
const MAX_TEXT = 10_000;
const MAX_ALT_TEXT = 1_000;

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function providerReady(matrix: MarketingXCapabilityMatrix): boolean {
  return matrix.connectivity === "Verified" && matrix.verificationFresh;
}

function capabilityForDraft(
  draft: MarketingXPostDraft,
  matrix: MarketingXCapabilityMatrix,
): MarketingCapabilityState {
  if (draft.kind === "poll") return matrix.polls;
  if (draft.kind === "quote_post") return matrix.quotePost;
  if (draft.kind === "video_post") return matrix.videoPost;
  if (draft.kind === "image_post") return matrix.imagePost;
  return matrix.textPost;
}

function validAsset(asset: MarketingXAsset): boolean {
  return (
    UUID_PATTERN.test(asset.assetId) &&
    ["image", "video", "gif"].includes(asset.kind) &&
    Number.isInteger(asset.revision) &&
    asset.revision >= 1 &&
    (asset.altText === null || boundedText(asset.altText, MAX_ALT_TEXT))
  );
}

export function validateMarketingXPostDraft(draft: MarketingXPostDraft): boolean {
  if (!UUID_PATTERN.test(draft.draftId) || !UUID_PATTERN.test(draft.sourceCreativeId)) return false;
  if (!Number.isInteger(draft.revision) || draft.revision < 1) return false;
  if (!Number.isInteger(draft.sourceCreativeRevision) || draft.sourceCreativeRevision < 1)
    return false;
  if (!ACCOUNT_PATTERN.test(draft.authorAccountRef)) return false;
  if (!marketingXContentKinds.includes(draft.kind)) return false;
  if (!boundedText(draft.text, MAX_TEXT)) return false;
  if (!Array.isArray(draft.assets) || draft.assets.length > 4 || !draft.assets.every(validAsset))
    return false;
  if (!["low_risk", "review_required", "blocked"].includes(draft.riskClass)) return false;

  if (draft.kind === "quote_post") {
    if (draft.quotedPostId === null || !POST_ID_PATTERN.test(draft.quotedPostId)) return false;
  } else if (draft.quotedPostId !== null) {
    return false;
  }

  if (draft.kind === "poll") {
    if (draft.poll === null) return false;
    if (draft.assets.length > 0) return false;
    if (draft.poll.options.length < 2 || draft.poll.options.length > 4) return false;
    if (
      new Set(draft.poll.options.map((option) => option.trim().toLowerCase())).size !==
      draft.poll.options.length
    ) {
      return false;
    }
    if (draft.poll.options.some((option) => !boundedText(option, 100))) return false;
    if (!Number.isInteger(draft.poll.durationMinutes) || draft.poll.durationMinutes < 5)
      return false;
  } else if (draft.poll !== null) {
    return false;
  }

  return true;
}

export function resolveMarketingXPublishEligibility(
  draft: MarketingXPostDraft,
  matrix: MarketingXCapabilityMatrix,
): MarketingXPublishEligibility {
  if (!validateMarketingXPostDraft(draft)) return { kind: "blocked", reason: "invalid_draft" };
  if (draft.riskClass === "blocked") return { kind: "blocked", reason: "risk_blocked" };
  if (!providerReady(matrix)) {
    if (["Disabled", "Unavailable", "Degraded", "RateLimited"].includes(matrix.connectivity)) {
      return { kind: "blocked", reason: "provider_unavailable" };
    }
    return { kind: "blocked", reason: "provider_unverified" };
  }
  const capability = capabilityForDraft(draft, matrix);
  if (capability === "Unsupported") return { kind: "blocked", reason: "capability_unsupported" };
  if (capability !== "Supported") return { kind: "blocked", reason: "capability_not_verified" };
  return { kind: "eligible" };
}

export function validateMarketingXThread(thread: MarketingXThread): boolean {
  if (!UUID_PATTERN.test(thread.threadId) || !UUID_PATTERN.test(thread.sourceCreativeId))
    return false;
  if (!Number.isInteger(thread.revision) || thread.revision < 1) return false;
  if (!Number.isInteger(thread.sourceCreativeRevision) || thread.sourceCreativeRevision < 1)
    return false;
  if (!ACCOUNT_PATTERN.test(thread.authorAccountRef)) return false;
  if (!Array.isArray(thread.nodes) || thread.nodes.length < 2 || thread.nodes.length > 50)
    return false;
  if (new Set(thread.nodes.map((node) => node.nodeId)).size !== thread.nodes.length) return false;

  return thread.nodes.every((node, index) => {
    if (!UUID_PATTERN.test(node.nodeId)) return false;
    if (node.order !== index + 1) return false;
    if (!validateMarketingXPostDraft(node.draft)) return false;
    if (node.draft.authorAccountRef !== thread.authorAccountRef) return false;
    if (!marketingXThreadNodeStates.includes(node.state)) return false;
    if (node.externalPostId !== null && !POST_ID_PATTERN.test(node.externalPostId)) return false;
    if (node.parentExternalPostId !== null && !POST_ID_PATTERN.test(node.parentExternalPostId))
      return false;
    if (!Number.isInteger(node.attempt) || node.attempt < 0) return false;
    if (node.state === "published_verified" && node.externalPostId === null) return false;
    return true;
  });
}

export function resolveMarketingXThreadResumePlan(
  thread: MarketingXThread,
): MarketingXThreadResumePlan {
  if (!validateMarketingXThread(thread))
    return { kind: "blocked", reason: "prior_node_unverified" };

  for (let index = 0; index < thread.nodes.length; index += 1) {
    const node = thread.nodes[index];
    if (!node) return { kind: "blocked", reason: "prior_node_unverified" };
    if (node.state === "outcome_unknown") return { kind: "blocked", reason: "outcome_unknown" };
    if (node.state === "failed_permanent") return { kind: "blocked", reason: "permanent_failure" };
    if (node.state === "published_verified") continue;

    const prior = index === 0 ? null : thread.nodes[index - 1];
    if (prior && (prior.state !== "published_verified" || prior.externalPostId === null)) {
      return { kind: "blocked", reason: "prior_node_unverified" };
    }
    return {
      kind: "publish_next",
      nodeId: node.nodeId,
      parentExternalPostId: prior?.externalPostId ?? null,
    };
  }

  return { kind: "complete" };
}

export function validateMarketingXActorEvidence(evidence: MarketingXActorEvidence): boolean {
  if (!UUID_PATTERN.test(evidence.evidenceId)) return false;
  if (!ACCOUNT_PATTERN.test(evidence.providerAccountRef)) return false;
  if (!POST_ID_PATTERN.test(evidence.externalPostId)) return false;
  if (!marketingXActorEvidenceKinds.includes(evidence.kind)) return false;
  if (!instant(evidence.observedAtUtc)) return false;
  if (evidence.source !== "provider_verified" && evidence.source !== "manual_review") return false;

  if (evidence.kind === "aggregate_only") {
    return (
      evidence.actorProviderUserId === null &&
      evidence.actorHandle === null &&
      evidence.aggregateValue !== null &&
      Number.isFinite(evidence.aggregateValue) &&
      evidence.aggregateValue >= 0
    );
  }

  if (evidence.kind === "unsupported") {
    return (
      evidence.actorProviderUserId === null &&
      evidence.actorHandle === null &&
      evidence.aggregateValue === null
    );
  }

  return (
    boundedText(evidence.actorProviderUserId, 160) &&
    boundedText(evidence.actorHandle, 160) &&
    evidence.aggregateValue === null
  );
}

export function resolveMarketingXReplyEligibility(
  matrix: MarketingXCapabilityMatrix,
  context: MarketingXReplyContext,
): MarketingXReplyEligibility {
  if (!providerReady(matrix)) return { kind: "blocked", reason: "provider_unverified" };
  if (matrix.replies === "Unsupported") {
    return { kind: "blocked", reason: "reply_capability_unsupported" };
  }
  if (matrix.replies !== "Supported") {
    return { kind: "blocked", reason: "reply_capability_not_verified" };
  }
  if (context.sensitiveMedicalQuestion) {
    return { kind: "blocked", reason: "sensitive_medical_review_required" };
  }
  if (!context.ownedPost && !context.accountSummonedByMentionOrQuote) {
    return { kind: "blocked", reason: "provider_rule_not_satisfied" };
  }
  return { kind: "eligible" };
}

export function resolveMarketingXScheduleTruth(
  requestedMode: "lifemate_worker" | "provider_native",
  matrix: MarketingXCapabilityMatrix,
  providerNativeScheduling: MarketingCapabilityState,
): MarketingXScheduleTruth {
  if (requestedMode === "lifemate_worker") {
    return {
      requestedMode,
      effectiveLabel: "LifeMate scheduled",
      providerNativeVerified: false,
    };
  }
  if (providerReady(matrix) && providerNativeScheduling === "Supported") {
    return {
      requestedMode,
      effectiveLabel: "Provider-native scheduled",
      providerNativeVerified: true,
    };
  }
  return {
    requestedMode,
    effectiveLabel: "Scheduling unavailable",
    providerNativeVerified: false,
  };
}

export const marketingXBoundary = {
  credentialInBrowserOrLogAllowed: false,
  privateProfileScrapingAllowed: false,
  providerActorIdentityJoinToLifeMateAccountAllowed: false,
  aggregateReactionExpandedIntoActorsAllowed: false,
  unsupportedCapabilityAssumedAvailable: false,
  blindThreadRetryAfterOutcomeUnknownAllowed: false,
  autonomousSensitiveMedicalReplyAllowed: false,
  providerNativeSchedulingClaimWithoutVerificationAllowed: false,
  crossProviderOpaqueScoreAllowed: false,
} as const;
