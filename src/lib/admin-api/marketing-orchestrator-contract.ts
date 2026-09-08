export const marketingAutomationModes = ["manual", "assist", "operational"] as const;
export const marketingAutomationFamilies = [
  "idea_script",
  "shoot_plan",
  "media_processing",
  "derivative_generation",
  "review_queue",
  "publish_execution",
  "metric_sync",
  "weekly_learning",
  "notification_nudge",
] as const;
export const marketingOrchestratorEventStates = [
  "queued",
  "running",
  "succeeded",
  "blocked",
  "failed_retryable",
  "failed_permanent",
  "cancelled",
] as const;
export const marketingPlanGoals = [
  "reach",
  "trust",
  "product_value",
  "education",
  "founder",
  "conversion",
] as const;

export type MarketingAutomationMode = (typeof marketingAutomationModes)[number];
export type MarketingAutomationFamily = (typeof marketingAutomationFamilies)[number];
export type MarketingOrchestratorEventState = (typeof marketingOrchestratorEventStates)[number];
export type MarketingPlanGoal = (typeof marketingPlanGoals)[number];

export type MarketingWeeklyCapacity = {
  maxItems: number;
  maxReels: number;
  maxCarousels: number;
  maxStories: number;
  maxRecordingMinutes: number;
  maxRecordingMinutesPerSession: number;
  availableActors: string[];
  preferredShootWeekday: number | null;
  productPriorities: string[];
  blackoutDates: string[];
};

export type MarketingPlanCandidate = {
  candidateId: string;
  revision: number;
  title: string;
  productScope: string;
  format: "reel" | "carousel" | "story" | "other";
  goal: MarketingPlanGoal;
  estimatedRecordingMinutes: number;
  actors: string[];
  patternCode: string;
  ctaCode: string | null;
  pinned: boolean;
  manuallyAdded: boolean;
  intendedDate: string | null;
};

export type MarketingWeeklyPlan = {
  planId: string;
  revision: number;
  weekStartDate: string;
  timezone: string;
  policyVersion: string;
  mode: MarketingAutomationMode;
  items: MarketingPlanCandidate[];
  excludedCandidateIds: string[];
  capacityConflict: boolean;
  createdBy: "operator" | "automation";
  approvalRequiredForPublish: true;
};

export type MarketingCapacityResult =
  | { kind: "valid"; plan: MarketingWeeklyPlan }
  | {
      kind: "capacity_conflict";
      reason: "pinned_items_exceed_capacity" | "invalid_capacity";
      conflictingCandidateIds: string[];
    };

export type MarketingAutomationPolicy = {
  mode: MarketingAutomationMode;
  disabledFamilies: MarketingAutomationFamily[];
  allowMechanicalAutoAdvance: boolean;
  requireHumanCreativeReview: true;
  requireHumanPublishApproval: true;
  autonomousPublishAllowed: false;
};

export type MarketingWorkflowAction =
  | "create_script_draft"
  | "propose_shoot_plan"
  | "enqueue_media_processing"
  | "propose_derivatives"
  | "enqueue_review"
  | "create_publish_execution"
  | "queue_metric_sync"
  | "refresh_weekly_learning"
  | "send_nudge"
  | "approve_content"
  | "publish_external";

export type MarketingAutomationDecision =
  | { kind: "automatic" }
  | { kind: "suggest_only" }
  | {
      kind: "blocked";
      reason:
        | "family_disabled"
        | "manual_mode"
        | "human_review_required"
        | "human_publish_required"
        | "provider_unavailable";
    };

export type MarketingOrchestratorEvent = {
  eventId: string;
  family: MarketingAutomationFamily;
  sourceType: string;
  sourceId: string;
  sourceRevision: number;
  idempotencyKey: string;
  correlationId: string;
  state: MarketingOrchestratorEventState;
  attempt: number;
  maxAttempts: number;
  nextAttemptAtUtc: string | null;
  resultCode: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type MarketingBriefAvailability = "available" | "unavailable" | "partial";

export type MarketingWeeklyBriefInput = {
  selectedCount: number;
  unrecordedCount: number;
  readyForReviewCount: number;
  scheduledCount: number;
  blockedCount: number;
  providerAvailability: MarketingBriefAvailability;
  metricsAvailability: MarketingBriefAvailability;
  learningAvailability: MarketingBriefAvailability;
  providerWarning: string | null;
  evidenceLearning: string | null;
};

export type MarketingWeeklyBrief = {
  selectedCount: number;
  unrecordedCount: number;
  readyForReviewCount: number;
  scheduledCount: number;
  blockedCount: number;
  providerAvailability: MarketingBriefAvailability;
  metricsAvailability: MarketingBriefAvailability;
  learningAvailability: MarketingBriefAvailability;
  providerWarning: string | null;
  evidenceLearning: string | null;
  fabricatedPerformanceAllowed: false;
};

export type MarketingFatigueObservation = {
  productScope: string;
  patternCode: string;
  ctaCode: string | null;
};

export type MarketingFatigueWarning = {
  kind: "repeated_pattern" | "product_dominance" | "repeated_cta";
  key: string;
  count: number;
  blocking: false;
};

export type MarketingScheduleTruth = {
  planItemId: string;
  plannedDate: string | null;
  canonicalExecutionId: string | null;
  canonicalScheduledForUtc: string | null;
  state: "planning_only" | "scheduled" | "published" | "execution_blocked";
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,95}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const MAX_TEXT = 240;

function boundedText(value: unknown, max = MAX_TEXT): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function validDate(value: string): boolean {
  return DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

function normalizedCodes(values: string[], max = 32): string[] | null {
  if (!Array.isArray(values) || values.length > max) return null;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!boundedText(value, 96) || !CODE_PATTERN.test(value)) return null;
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export function validateMarketingWeeklyCapacity(value: MarketingWeeklyCapacity): boolean {
  const numericLimits = [
    value.maxItems,
    value.maxReels,
    value.maxCarousels,
    value.maxStories,
    value.maxRecordingMinutes,
    value.maxRecordingMinutesPerSession,
  ];
  if (numericLimits.some((item) => !Number.isInteger(item) || item < 0 || item > 10_000)) {
    return false;
  }
  if (value.maxRecordingMinutesPerSession > value.maxRecordingMinutes) return false;
  if (
    value.preferredShootWeekday !== null &&
    (!Number.isInteger(value.preferredShootWeekday) ||
      value.preferredShootWeekday < 0 ||
      value.preferredShootWeekday > 6)
  ) {
    return false;
  }
  if (!normalizedCodes(value.availableActors, 32)) return false;
  if (!normalizedCodes(value.productPriorities, 32)) return false;
  if (!Array.isArray(value.blackoutDates) || value.blackoutDates.length > 64) return false;
  return value.blackoutDates.every(validDate);
}

export function validateMarketingPlanCandidate(value: MarketingPlanCandidate): boolean {
  return (
    UUID_PATTERN.test(value.candidateId) &&
    Number.isInteger(value.revision) &&
    value.revision >= 1 &&
    boundedText(value.title, 160) &&
    CODE_PATTERN.test(value.productScope) &&
    ["reel", "carousel", "story", "other"].includes(value.format) &&
    marketingPlanGoals.includes(value.goal) &&
    Number.isInteger(value.estimatedRecordingMinutes) &&
    value.estimatedRecordingMinutes >= 0 &&
    value.estimatedRecordingMinutes <= 480 &&
    Boolean(normalizedCodes(value.actors, 16)) &&
    CODE_PATTERN.test(value.patternCode) &&
    (value.ctaCode === null || CODE_PATTERN.test(value.ctaCode)) &&
    typeof value.pinned === "boolean" &&
    typeof value.manuallyAdded === "boolean" &&
    (value.intendedDate === null || validDate(value.intendedDate))
  );
}

function formatWithinCapacity(
  candidate: MarketingPlanCandidate,
  counters: { reels: number; carousels: number; stories: number },
  capacity: MarketingWeeklyCapacity,
): boolean {
  if (candidate.format === "reel") return counters.reels < capacity.maxReels;
  if (candidate.format === "carousel") return counters.carousels < capacity.maxCarousels;
  if (candidate.format === "story") return counters.stories < capacity.maxStories;
  return true;
}

function addFormatCounter(
  candidate: MarketingPlanCandidate,
  counters: { reels: number; carousels: number; stories: number },
): void {
  if (candidate.format === "reel") counters.reels += 1;
  if (candidate.format === "carousel") counters.carousels += 1;
  if (candidate.format === "story") counters.stories += 1;
}

function canAddCandidate(
  candidate: MarketingPlanCandidate,
  selected: MarketingPlanCandidate[],
  recordingMinutes: number,
  counters: { reels: number; carousels: number; stories: number },
  capacity: MarketingWeeklyCapacity,
): boolean {
  if (selected.length >= capacity.maxItems) return false;
  if (recordingMinutes + candidate.estimatedRecordingMinutes > capacity.maxRecordingMinutes) {
    return false;
  }
  return formatWithinCapacity(candidate, counters, capacity);
}

export function buildMarketingWeeklyPlan(
  planId: string,
  weekStartDate: string,
  timezone: string,
  policyVersion: string,
  mode: MarketingAutomationMode,
  capacity: MarketingWeeklyCapacity,
  candidates: MarketingPlanCandidate[],
): MarketingCapacityResult {
  if (!validateMarketingWeeklyCapacity(capacity)) {
    return { kind: "capacity_conflict", reason: "invalid_capacity", conflictingCandidateIds: [] };
  }
  if (!UUID_PATTERN.test(planId) || !validDate(weekStartDate) || !boundedText(timezone, 80)) {
    return { kind: "capacity_conflict", reason: "invalid_capacity", conflictingCandidateIds: [] };
  }
  if (!boundedText(policyVersion, 80) || !marketingAutomationModes.includes(mode)) {
    return { kind: "capacity_conflict", reason: "invalid_capacity", conflictingCandidateIds: [] };
  }
  if (!candidates.every(validateMarketingPlanCandidate)) {
    return { kind: "capacity_conflict", reason: "invalid_capacity", conflictingCandidateIds: [] };
  }

  const pinned = candidates.filter((candidate) => candidate.pinned || candidate.manuallyAdded);
  const selected: MarketingPlanCandidate[] = [];
  const counters = { reels: 0, carousels: 0, stories: 0 };
  let recordingMinutes = 0;

  for (const candidate of pinned) {
    if (!canAddCandidate(candidate, selected, recordingMinutes, counters, capacity)) {
      return {
        kind: "capacity_conflict",
        reason: "pinned_items_exceed_capacity",
        conflictingCandidateIds: pinned.map((item) => item.candidateId),
      };
    }
    selected.push(candidate);
    recordingMinutes += candidate.estimatedRecordingMinutes;
    addFormatCounter(candidate, counters);
  }

  const pinnedIds = new Set(pinned.map((candidate) => candidate.candidateId));
  for (const candidate of candidates) {
    if (pinnedIds.has(candidate.candidateId)) continue;
    if (!canAddCandidate(candidate, selected, recordingMinutes, counters, capacity)) continue;
    selected.push(candidate);
    recordingMinutes += candidate.estimatedRecordingMinutes;
    addFormatCounter(candidate, counters);
  }

  const selectedIds = new Set(selected.map((candidate) => candidate.candidateId));
  return {
    kind: "valid",
    plan: {
      planId,
      revision: 1,
      weekStartDate,
      timezone,
      policyVersion,
      mode,
      items: selected,
      excludedCandidateIds: candidates
        .filter((candidate) => !selectedIds.has(candidate.candidateId))
        .map((candidate) => candidate.candidateId),
      capacityConflict: false,
      createdBy: "operator",
      approvalRequiredForPublish: true,
    },
  };
}

export function marketingWeeklyPlanIdempotencyKey(
  weekStartDate: string,
  timezone: string,
  policyVersion: string,
): string | null {
  if (!validDate(weekStartDate) || !boundedText(timezone, 80) || !boundedText(policyVersion, 80)) {
    return null;
  }
  const normalizedTimezone = timezone.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const normalizedPolicy = policyVersion.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-");
  return `marketing-week:${weekStartDate}:${normalizedTimezone}:${normalizedPolicy}`;
}

function familyForAction(action: MarketingWorkflowAction): MarketingAutomationFamily {
  if (action === "create_script_draft") return "idea_script";
  if (action === "propose_shoot_plan") return "shoot_plan";
  if (action === "enqueue_media_processing") return "media_processing";
  if (action === "propose_derivatives") return "derivative_generation";
  if (action === "enqueue_review" || action === "approve_content") return "review_queue";
  if (action === "create_publish_execution" || action === "publish_external") {
    return "publish_execution";
  }
  if (action === "queue_metric_sync") return "metric_sync";
  if (action === "refresh_weekly_learning") return "weekly_learning";
  return "notification_nudge";
}

export function resolveMarketingAutomationDecision(
  policy: MarketingAutomationPolicy,
  action: MarketingWorkflowAction,
  providerAvailable = true,
): MarketingAutomationDecision {
  const family = familyForAction(action);
  if (policy.disabledFamilies.includes(family)) return { kind: "blocked", reason: "family_disabled" };
  if (action === "approve_content") return { kind: "blocked", reason: "human_review_required" };
  if (action === "publish_external") return { kind: "blocked", reason: "human_publish_required" };
  if (action === "create_publish_execution" && !providerAvailable) {
    return { kind: "blocked", reason: "provider_unavailable" };
  }
  if (policy.mode === "manual") return { kind: "blocked", reason: "manual_mode" };
  if (policy.mode === "assist") return { kind: "suggest_only" };
  if (!policy.allowMechanicalAutoAdvance) return { kind: "suggest_only" };
  return { kind: "automatic" };
}

export function validateMarketingOrchestratorEvent(value: MarketingOrchestratorEvent): boolean {
  return (
    UUID_PATTERN.test(value.eventId) &&
    marketingAutomationFamilies.includes(value.family) &&
    boundedText(value.sourceType, 80) &&
    boundedText(value.sourceId, 160) &&
    Number.isInteger(value.sourceRevision) &&
    value.sourceRevision >= 1 &&
    IDEMPOTENCY_PATTERN.test(value.idempotencyKey) &&
    boundedText(value.correlationId, 160) &&
    marketingOrchestratorEventStates.includes(value.state) &&
    Number.isInteger(value.attempt) &&
    value.attempt >= 0 &&
    Number.isInteger(value.maxAttempts) &&
    value.maxAttempts >= 1 &&
    value.maxAttempts <= 20 &&
    value.attempt <= value.maxAttempts &&
    (value.nextAttemptAtUtc === null || !Number.isNaN(Date.parse(value.nextAttemptAtUtc))) &&
    (value.resultCode === null || boundedText(value.resultCode, 120)) &&
    !Number.isNaN(Date.parse(value.createdAtUtc)) &&
    !Number.isNaN(Date.parse(value.updatedAtUtc))
  );
}

export function buildMarketingWeeklyBrief(input: MarketingWeeklyBriefInput): MarketingWeeklyBrief {
  const safeCount = (value: number) =>
    Number.isInteger(value) && value >= 0 ? value : 0;
  return {
    selectedCount: safeCount(input.selectedCount),
    unrecordedCount: safeCount(input.unrecordedCount),
    readyForReviewCount: safeCount(input.readyForReviewCount),
    scheduledCount: safeCount(input.scheduledCount),
    blockedCount: safeCount(input.blockedCount),
    providerAvailability: input.providerAvailability,
    metricsAvailability: input.metricsAvailability,
    learningAvailability: input.learningAvailability,
    providerWarning:
      input.providerAvailability === "available" ? input.providerWarning : input.providerWarning ?? "unavailable",
    evidenceLearning:
      input.learningAvailability === "available" && input.metricsAvailability === "available"
        ? input.evidenceLearning
        : null,
    fabricatedPerformanceAllowed: false,
  };
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

export function detectMarketingFatigue(
  recent: MarketingFatigueObservation[],
  threshold = 3,
): MarketingFatigueWarning[] {
  const safeThreshold = Math.max(2, Math.min(20, Math.floor(threshold)));
  const warnings: MarketingFatigueWarning[] = [];
  const dimensions: Array<[MarketingFatigueWarning["kind"], Map<string, number>]> = [
    ["repeated_pattern", countBy(recent.map((item) => item.patternCode))],
    ["product_dominance", countBy(recent.map((item) => item.productScope))],
    ["repeated_cta", countBy(recent.flatMap((item) => (item.ctaCode ? [item.ctaCode] : [])))],
  ];
  for (const [kind, counts] of dimensions) {
    for (const [key, count] of counts) {
      if (count >= safeThreshold) warnings.push({ kind, key, count, blocking: false });
    }
  }
  return warnings.sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function reconcileMarketingPlanSchedule(
  planItemId: string,
  plannedDate: string | null,
  execution: {
    executionId: string;
    scheduledForUtc: string | null;
    state: "scheduled" | "published" | "blocked";
  } | null,
): MarketingScheduleTruth {
  if (!execution) {
    return {
      planItemId,
      plannedDate,
      canonicalExecutionId: null,
      canonicalScheduledForUtc: null,
      state: "planning_only",
    };
  }
  return {
    planItemId,
    plannedDate,
    canonicalExecutionId: execution.executionId,
    canonicalScheduledForUtc: execution.scheduledForUtc,
    state: execution.state === "blocked" ? "execution_blocked" : execution.state,
  };
}

export function marketingNudgeDedupeKey(
  family: MarketingAutomationFamily,
  subjectId: string,
  reasonCode: string,
  windowDate: string,
): string | null {
  if (!marketingAutomationFamilies.includes(family)) return null;
  if (!boundedText(subjectId, 120) || !boundedText(reasonCode, 80) || !validDate(windowDate)) return null;
  const subject = subjectId.trim().replace(/[^A-Za-z0-9._:-]+/g, "-");
  const reason = reasonCode.trim().replace(/[^A-Za-z0-9._:-]+/g, "-");
  return `marketing-nudge:${family}:${subject}:${reason}:${windowDate}`;
}

export const marketingOrchestratorBoundary = {
  autonomousPublishAllowed: false,
  humanCreativeReviewRequired: true,
  humanPublishApprovalRequired: true,
  providerReadinessMayBeFabricated: false,
  missingMetricsMayBeInvented: false,
  rawHealthDataAllowed: false,
  privateMediaInTelemetryAllowed: false,
  rawProviderPayloadInTelemetryAllowed: false,
  planMoveMayRescheduleCanonicalExecution: false,
  automationKillSwitchRequired: true,
} as const;
