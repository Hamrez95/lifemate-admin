export const marketingAutomationLevels = ["manual", "assist", "operational"] as const;
export const marketingOrchestratorActionClasses = [
  "suggestion",
  "draft_job",
  "mechanical",
  "human_approval",
  "external_publish",
] as const;
export const marketingWeeklyPlanItemStates = [
  "pinned",
  "proposed",
  "selected",
  "script_ready",
  "shoot_planned",
  "media_pending",
  "processing",
  "derivatives_pending",
  "review_pending",
  "approved",
  "scheduled",
  "published",
  "blocked",
  "cancelled",
] as const;
export const marketingOrchestratorRunStates = [
  "queued",
  "running",
  "completed",
  "completed_with_blockers",
  "failed",
  "cancelled",
] as const;
export const marketingBriefFactAvailability = ["available", "unavailable", "stale"] as const;

export type MarketingAutomationLevel = (typeof marketingAutomationLevels)[number];
export type MarketingOrchestratorActionClass = (typeof marketingOrchestratorActionClasses)[number];
export type MarketingWeeklyPlanItemState = (typeof marketingWeeklyPlanItemStates)[number];
export type MarketingOrchestratorRunState = (typeof marketingOrchestratorRunStates)[number];
export type MarketingBriefFactAvailability = (typeof marketingBriefFactAvailability)[number];

export type MarketingWeeklyCapacity = {
  maxReels: number;
  maxCarousels: number;
  maxStories: number;
  maxLinkedInPosts: number;
  maxRecordingMinutes: number;
  preferredShootWeekday: number | null;
  availableActorCodes: string[];
  prioritizedProductCodes: string[];
  blackoutDates: string[];
};

export type MarketingWeeklyPlanItem = {
  itemId: string;
  planId: string;
  state: MarketingWeeklyPlanItemState;
  pinned: boolean;
  sourceIdeaId: string | null;
  sourceIdeaRevision: number | null;
  productCode: string;
  formatCode: string;
  goalCode: string;
  plannedDate: string | null;
  estimatedRecordingMinutes: number;
  actorCodes: string[];
  hookPatternCode: string | null;
  ctaCode: string | null;
  plannedChannelCode: string;
  scheduledExecutionId: string | null;
  blockerCodes: string[];
};

export type MarketingWeeklyPlan = {
  planId: string;
  weekStartDate: string;
  timezone: "Asia/Tehran" | "UTC";
  policyVersion: string;
  capacityVersion: string;
  generationIdempotencyKey: string;
  automationLevel: MarketingAutomationLevel;
  items: MarketingWeeklyPlanItem[];
  createdAtUtc: string;
};

export type MarketingOrchestratorRule = {
  ruleCode: string;
  eventCode: string;
  actionCode: string;
  actionClass: MarketingOrchestratorActionClass;
  enabled: boolean;
  killSwitchActive: boolean;
  idempotencyScope: "event" | "plan_item" | "weekly_plan";
  requiresProviderReady: boolean;
  requiresFreshMetrics: boolean;
  requiresHumanApproval: boolean;
};

export type MarketingOrchestratorTransitionContext = {
  automationLevel: MarketingAutomationLevel;
  providerReady: boolean;
  freshMetricsAvailable: boolean;
  humanApprovalPresent: boolean;
};

export type MarketingOrchestratorTransitionDecision =
  | { kind: "allowed" }
  | {
      kind: "blocked";
      reason:
        | "rule_disabled"
        | "kill_switch"
        | "automation_level"
        | "provider_unavailable"
        | "metrics_unavailable"
        | "human_approval_required"
        | "autonomous_publish_forbidden";
    };

export type MarketingOrchestratorRun = {
  runId: string;
  ruleCode: string;
  eventId: string;
  targetPlanId: string;
  targetItemId: string | null;
  idempotencyKey: string;
  correlationId: string;
  state: MarketingOrchestratorRunState;
  attempt: number;
  scheduledForUtc: string | null;
  startedAtUtc: string | null;
  finishedAtUtc: string | null;
  resultCode: string | null;
  blockerCodes: string[];
};

export type MarketingBriefFact = {
  factCode: string;
  availability: MarketingBriefFactAvailability;
  value: number | null;
  unit: "count" | "minutes" | "percent" | "ratio";
  evidenceRefs: string[];
  asOfUtc: string | null;
  limitation: string | null;
};

export type MarketingWorkflowNudge = {
  nudgeId: string;
  dedupeKey: string;
  actionCode: string;
  targetRef: string;
  priority: "normal" | "high";
  reasonCode: string;
  createdAtUtc: string;
  expiresAtUtc: string | null;
  resolvedAtUtc: string | null;
};

export type MarketingFatigueObservation = {
  code: "repeated_hook" | "product_concentration" | "direct_ad_concentration" | "repeated_cta";
  severity: "notice" | "warning";
  evidenceCount: number;
  threshold: number;
  advisoryOnly: true;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,127}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_COLLECTION = 32;

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function nullableInstant(value: unknown): value is string | null {
  return value === null || instant(value);
}

function validCodes(values: string[], maxItems = MAX_COLLECTION): boolean {
  return (
    Array.isArray(values) &&
    values.length <= maxItems &&
    values.every((value) => boundedText(value, 128) && CODE_PATTERN.test(value)) &&
    new Set(values).size === values.length
  );
}

export function validateMarketingWeeklyCapacity(value: MarketingWeeklyCapacity): boolean {
  const boundedCounts = [
    value.maxReels,
    value.maxCarousels,
    value.maxStories,
    value.maxLinkedInPosts,
  ];
  if (boundedCounts.some((count) => !Number.isInteger(count) || count < 0 || count > 50)) {
    return false;
  }
  if (
    !Number.isInteger(value.maxRecordingMinutes) ||
    value.maxRecordingMinutes < 0 ||
    value.maxRecordingMinutes > 2_400
  ) {
    return false;
  }
  if (
    value.preferredShootWeekday !== null &&
    (!Number.isInteger(value.preferredShootWeekday) ||
      value.preferredShootWeekday < 1 ||
      value.preferredShootWeekday > 7)
  ) {
    return false;
  }
  if (!validCodes(value.availableActorCodes, 32) || !validCodes(value.prioritizedProductCodes, 32)) {
    return false;
  }
  if (
    !Array.isArray(value.blackoutDates) ||
    value.blackoutDates.length > 100 ||
    value.blackoutDates.some((date) => !DATE_PATTERN.test(date)) ||
    new Set(value.blackoutDates).size !== value.blackoutDates.length
  ) {
    return false;
  }
  return true;
}

function validateMarketingWeeklyPlanItem(value: MarketingWeeklyPlanItem, planId: string): boolean {
  if (!UUID_PATTERN.test(value.itemId) || value.planId !== planId) return false;
  if (!marketingWeeklyPlanItemStates.includes(value.state) || typeof value.pinned !== "boolean") {
    return false;
  }
  if (value.sourceIdeaId !== null && !UUID_PATTERN.test(value.sourceIdeaId)) return false;
  if (
    value.sourceIdeaRevision !== null &&
    (!Number.isInteger(value.sourceIdeaRevision) || value.sourceIdeaRevision < 1)
  ) {
    return false;
  }
  if ((value.sourceIdeaId === null) !== (value.sourceIdeaRevision === null)) return false;
  if (
    !CODE_PATTERN.test(value.productCode) ||
    !CODE_PATTERN.test(value.formatCode) ||
    !CODE_PATTERN.test(value.goalCode) ||
    !CODE_PATTERN.test(value.plannedChannelCode)
  ) {
    return false;
  }
  if (value.plannedDate !== null && !DATE_PATTERN.test(value.plannedDate)) return false;
  if (
    !Number.isInteger(value.estimatedRecordingMinutes) ||
    value.estimatedRecordingMinutes < 0 ||
    value.estimatedRecordingMinutes > 480
  ) {
    return false;
  }
  if (!validCodes(value.actorCodes, 16) || !validCodes(value.blockerCodes, 32)) return false;
  if (value.hookPatternCode !== null && !CODE_PATTERN.test(value.hookPatternCode)) return false;
  if (value.ctaCode !== null && !CODE_PATTERN.test(value.ctaCode)) return false;
  if (value.scheduledExecutionId !== null && !UUID_PATTERN.test(value.scheduledExecutionId)) return false;
  return true;
}

export function validateMarketingWeeklyPlan(
  value: MarketingWeeklyPlan,
  capacity: MarketingWeeklyCapacity,
): boolean {
  if (!UUID_PATTERN.test(value.planId) || !DATE_PATTERN.test(value.weekStartDate)) return false;
  if (value.timezone !== "Asia/Tehran" && value.timezone !== "UTC") return false;
  if (!VERSION_PATTERN.test(value.policyVersion) || !VERSION_PATTERN.test(value.capacityVersion)) {
    return false;
  }
  if (!IDEMPOTENCY_PATTERN.test(value.generationIdempotencyKey)) return false;
  if (!marketingAutomationLevels.includes(value.automationLevel)) return false;
  if (!instant(value.createdAtUtc)) return false;
  if (!Array.isArray(value.items) || value.items.length > 100) return false;
  if (new Set(value.items.map((item) => item.itemId)).size !== value.items.length) return false;
  if (value.items.some((item) => !validateMarketingWeeklyPlanItem(item, value.planId))) return false;

  const formatCount = (prefix: string) =>
    value.items.filter((item) => item.formatCode.startsWith(prefix) && item.state !== "cancelled").length;
  if (formatCount("reel") > capacity.maxReels) return false;
  if (formatCount("carousel") > capacity.maxCarousels) return false;
  if (formatCount("story") > capacity.maxStories) return false;
  if (formatCount("linkedin") > capacity.maxLinkedInPosts) return false;
  const totalRecordingMinutes = value.items
    .filter((item) => item.state !== "cancelled")
    .reduce((sum, item) => sum + item.estimatedRecordingMinutes, 0);
  if (totalRecordingMinutes > capacity.maxRecordingMinutes) return false;
  if (
    value.items.some(
      (item) =>
        item.plannedDate !== null &&
        capacity.blackoutDates.includes(item.plannedDate) &&
        item.state !== "cancelled",
    )
  ) {
    return false;
  }
  return true;
}

export function validateMarketingOrchestratorRule(value: MarketingOrchestratorRule): boolean {
  return (
    CODE_PATTERN.test(value.ruleCode) &&
    CODE_PATTERN.test(value.eventCode) &&
    CODE_PATTERN.test(value.actionCode) &&
    marketingOrchestratorActionClasses.includes(value.actionClass) &&
    typeof value.enabled === "boolean" &&
    typeof value.killSwitchActive === "boolean" &&
    ["event", "plan_item", "weekly_plan"].includes(value.idempotencyScope) &&
    typeof value.requiresProviderReady === "boolean" &&
    typeof value.requiresFreshMetrics === "boolean" &&
    typeof value.requiresHumanApproval === "boolean"
  );
}

export function resolveMarketingOrchestratorTransition(
  rule: MarketingOrchestratorRule,
  context: MarketingOrchestratorTransitionContext,
): MarketingOrchestratorTransitionDecision {
  if (!rule.enabled) return { kind: "blocked", reason: "rule_disabled" };
  if (rule.killSwitchActive) return { kind: "blocked", reason: "kill_switch" };
  if (rule.actionClass === "external_publish") {
    return { kind: "blocked", reason: "autonomous_publish_forbidden" };
  }
  if (rule.requiresProviderReady && !context.providerReady) {
    return { kind: "blocked", reason: "provider_unavailable" };
  }
  if (rule.requiresFreshMetrics && !context.freshMetricsAvailable) {
    return { kind: "blocked", reason: "metrics_unavailable" };
  }
  if (rule.requiresHumanApproval && !context.humanApprovalPresent) {
    return { kind: "blocked", reason: "human_approval_required" };
  }
  if (rule.actionClass === "human_approval") {
    return { kind: "blocked", reason: "human_approval_required" };
  }
  if (context.automationLevel === "manual") {
    return rule.actionClass === "suggestion"
      ? { kind: "allowed" }
      : { kind: "blocked", reason: "automation_level" };
  }
  if (context.automationLevel === "assist") {
    return rule.actionClass === "suggestion" || rule.actionClass === "draft_job"
      ? { kind: "allowed" }
      : { kind: "blocked", reason: "automation_level" };
  }
  return rule.actionClass === "suggestion" ||
    rule.actionClass === "draft_job" ||
    rule.actionClass === "mechanical"
    ? { kind: "allowed" }
    : { kind: "blocked", reason: "automation_level" };
}

export function validateMarketingOrchestratorRun(value: MarketingOrchestratorRun): boolean {
  if (!UUID_PATTERN.test(value.runId) || !UUID_PATTERN.test(value.eventId)) return false;
  if (!UUID_PATTERN.test(value.targetPlanId)) return false;
  if (value.targetItemId !== null && !UUID_PATTERN.test(value.targetItemId)) return false;
  if (!CODE_PATTERN.test(value.ruleCode)) return false;
  if (!IDEMPOTENCY_PATTERN.test(value.idempotencyKey)) return false;
  if (!boundedText(value.correlationId, 180)) return false;
  if (!marketingOrchestratorRunStates.includes(value.state)) return false;
  if (!Number.isInteger(value.attempt) || value.attempt < 1 || value.attempt > 100) return false;
  if (!nullableInstant(value.scheduledForUtc)) return false;
  if (!nullableInstant(value.startedAtUtc) || !nullableInstant(value.finishedAtUtc)) return false;
  if (value.resultCode !== null && !CODE_PATTERN.test(value.resultCode)) return false;
  if (!validCodes(value.blockerCodes, 32)) return false;
  return true;
}

export function validateMarketingBriefFact(value: MarketingBriefFact): boolean {
  if (!CODE_PATTERN.test(value.factCode)) return false;
  if (!marketingBriefFactAvailability.includes(value.availability)) return false;
  if (!["count", "minutes", "percent", "ratio"].includes(value.unit)) return false;
  if (!Array.isArray(value.evidenceRefs) || value.evidenceRefs.length > 100) return false;
  if (value.evidenceRefs.some((ref) => !boundedText(ref, 240))) return false;
  if (value.availability === "unavailable") {
    return value.value === null && value.limitation !== null && boundedText(value.limitation, 500);
  }
  if (value.value === null || !Number.isFinite(value.value)) return false;
  if (!nullableInstant(value.asOfUtc)) return false;
  if (value.limitation !== null && !boundedText(value.limitation, 500)) return false;
  return true;
}

export function validateMarketingWorkflowNudge(value: MarketingWorkflowNudge): boolean {
  if (!UUID_PATTERN.test(value.nudgeId) || !IDEMPOTENCY_PATTERN.test(value.dedupeKey)) return false;
  if (!CODE_PATTERN.test(value.actionCode) || !boundedText(value.targetRef, 240)) return false;
  if (value.priority !== "normal" && value.priority !== "high") return false;
  if (!CODE_PATTERN.test(value.reasonCode) || !instant(value.createdAtUtc)) return false;
  if (!nullableInstant(value.expiresAtUtc) || !nullableInstant(value.resolvedAtUtc)) return false;
  return true;
}

export function plannedMoveMayReschedulePublishedExecution(): false {
  return false;
}

export function validateMarketingFatigueObservation(value: MarketingFatigueObservation): boolean {
  if (!["repeated_hook", "product_concentration", "direct_ad_concentration", "repeated_cta"].includes(value.code)) {
    return false;
  }
  if (value.severity !== "notice" && value.severity !== "warning") return false;
  if (!Number.isInteger(value.evidenceCount) || value.evidenceCount < 0) return false;
  if (!Number.isInteger(value.threshold) || value.threshold < 1) return false;
  return value.advisoryOnly === true;
}

export const marketingOrchestratorBoundary = {
  autonomousPublishAllowed: false,
  aiApprovalAllowed: false,
  aiMayFabricateMetrics: false,
  aiMayInferSensitiveHealthState: false,
  providerBlockOverrideAllowed: false,
  approvalBlockOverrideAllowed: false,
  planningMoveReschedulesExecution: false,
  successfulMechanicalStepNotificationRequired: false,
  automationRunsRequireIdempotency: true,
  automationKillSwitchRequired: true,
  missingMetricStateMustRemainUnavailable: true,
} as const;
