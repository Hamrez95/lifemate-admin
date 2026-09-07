export const marketingIdeaGoals = [
  "reach",
  "engagement",
  "education",
  "trust",
  "launch",
  "conversion",
  "retention",
] as const;

export const marketingIdeaStates = [
  "proposed",
  "shortlisted",
  "selected",
  "rejected",
  "converted_to_production",
] as const;

export const marketingIdeaProvenance = ["operator", "signal", "ai", "campaign"] as const;
export const marketingProductionEfforts = ["low", "medium", "high"] as const;
export const marketingHealthRiskClasses = [
  "low_risk_lifestyle",
  "product_feature",
  "health_education_review_required",
  "sensitive_women_health_review_required",
  "promotion_claim_review_required",
  "blocked_clinical_or_emergency",
] as const;

export type MarketingIdeaGoal = (typeof marketingIdeaGoals)[number];
export type MarketingIdeaState = (typeof marketingIdeaStates)[number];
export type MarketingIdeaProvenance = (typeof marketingIdeaProvenance)[number];
export type MarketingProductionEffort = (typeof marketingProductionEfforts)[number];
export type MarketingHealthRiskClass = (typeof marketingHealthRiskClasses)[number];

export type MarketingCreativeIdea = {
  id: string;
  revision: number;
  internalTitle: string;
  concept: string;
  productScope: string;
  formatCode: string;
  goal: MarketingIdeaGoal;
  audiencePersona: string | null;
  hooks: string[];
  conflict: string | null;
  payoff: string | null;
  productRevealTiming: string | null;
  ctaMechanic: string | null;
  estimatedDurationSeconds: number | null;
  productionEffort: MarketingProductionEffort;
  actors: string[];
  location: string | null;
  props: string[];
  healthRiskClass: MarketingHealthRiskClass;
  provenance: MarketingIdeaProvenance;
  sourceSignalId: string | null;
  campaignId: string | null;
  state: MarketingIdeaState;
  brandContextVersion: string;
  createdAtUtc: string;
};

export type MarketingIdeaParseResult =
  | { kind: "valid"; data: MarketingCreativeIdea }
  | {
      kind: "invalid";
      code:
        | "invalid_shape"
        | "invalid_identifier"
        | "invalid_enum"
        | "field_too_long"
        | "invalid_hooks"
        | "invalid_duration"
        | "blocked_health_risk";
    };

export type MarketingScriptScene = {
  startSecond: number;
  endSecond: number;
  actor: string | null;
  dialogue: string | null;
  onScreenText: string | null;
  cameraSuggestion: string | null;
  productReveal: boolean;
};

export type MarketingScriptDraft = {
  ideaId: string;
  ideaRevision: number;
  scriptRevision: number;
  hooks: string[];
  scenes: MarketingScriptScene[];
  finalCta: string | null;
  captionDraft: string | null;
  coverHeadlines: string[];
  brandContextVersion: string;
  policyVersion: string;
  generationMode: "manual" | "model";
  provider: string | null;
  model: string | null;
  generatedAtUtc: string;
  publishAllowed: false;
};

export type MarketingScriptParseResult =
  | { kind: "valid"; data: MarketingScriptDraft }
  | {
      kind: "invalid";
      code:
        | "invalid_shape"
        | "invalid_identifier"
        | "invalid_revision"
        | "invalid_hooks"
        | "invalid_scene"
        | "field_too_long"
        | "unsafe_generation_metadata";
    };

export type MarketingIdeaScoreFactors = {
  relatability: number;
  curiosity: number;
  emotionalClarity: number;
  participation: number;
  speedOfUnderstanding: number;
  productFit: number;
  productionSimplicity: number;
};

export type MarketingIdeaHeuristicScore = {
  score: number;
  factors: MarketingIdeaScoreFactors;
  explanation: string[];
  predictsVirality: false;
  rankingAuthority: "operator_override_allowed";
};

export type ShootPlanCandidate = {
  ideaId: string;
  ideaRevision: number;
  title: string;
  actors: string[];
  location: string | null;
  props: string[];
  estimatedSetupMinutes: number;
  estimatedRecordingMinutes: number;
  deviceScreenRequired: boolean;
  clothingContinuityKey: string | null;
};

export type ShootPlanGroup = {
  groupKey: string;
  actors: string[];
  location: string | null;
  clothingContinuityKey: string | null;
  sharedProps: string[];
  totalEstimatedMinutes: number;
  items: ShootPlanCandidate[];
};

export const marketingIdeaGenerationBoundary = {
  publishAllowed: false,
  rawHealthDataAllowed: false,
  diagnosisAllowed: false,
  treatmentRecommendationAllowed: false,
  emergencyThresholdAllowed: false,
  clinicalClaimAllowed: false,
  viralityPredictionAllowed: false,
  operatorReviewRequired: true,
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STABLE_CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,79}$/;
const MAX_TITLE = 160;
const MAX_CONCEPT = 800;
const MAX_TEXT = 800;
const MAX_SHORT_TEXT = 240;
const MAX_COLLECTION = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInstant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isUuidOrNull(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && UUID_PATTERN.test(value));
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function nullableBoundedText(value: unknown, max: number): value is string | null {
  return value === null || (typeof value === "string" && value.trim().length <= max);
}

function uniqueBoundedStrings(value: unknown, maxItems = MAX_COLLECTION): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!boundedText(item, MAX_SHORT_TEXT)) return null;
    const normalized = item.trim();
    const key = normalized.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function enumValue<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && allowed.includes(value as T[number]);
}

export function parseMarketingCreativeIdea(value: unknown): MarketingIdeaParseResult {
  if (!isRecord(value)) return { kind: "invalid", code: "invalid_shape" };

  if (
    typeof value.id !== "string" ||
    !UUID_PATTERN.test(value.id) ||
    !Number.isInteger(value.revision) ||
    Number(value.revision) < 1
  ) {
    return { kind: "invalid", code: "invalid_identifier" };
  }

  if (
    !enumValue(value.goal, marketingIdeaGoals) ||
    !enumValue(value.state, marketingIdeaStates) ||
    !enumValue(value.provenance, marketingIdeaProvenance) ||
    !enumValue(value.productionEffort, marketingProductionEfforts) ||
    !enumValue(value.healthRiskClass, marketingHealthRiskClasses)
  ) {
    return { kind: "invalid", code: "invalid_enum" };
  }

  if (value.healthRiskClass === "blocked_clinical_or_emergency") {
    return { kind: "invalid", code: "blocked_health_risk" };
  }

  if (
    !boundedText(value.internalTitle, MAX_TITLE) ||
    !boundedText(value.concept, MAX_CONCEPT) ||
    !boundedText(value.productScope, MAX_SHORT_TEXT) ||
    !boundedText(value.formatCode, 80) ||
    !STABLE_CODE_PATTERN.test(value.formatCode) ||
    !nullableBoundedText(value.audiencePersona, MAX_TEXT) ||
    !nullableBoundedText(value.conflict, MAX_TEXT) ||
    !nullableBoundedText(value.payoff, MAX_TEXT) ||
    !nullableBoundedText(value.productRevealTiming, MAX_SHORT_TEXT) ||
    !nullableBoundedText(value.ctaMechanic, MAX_SHORT_TEXT) ||
    !nullableBoundedText(value.location, MAX_SHORT_TEXT) ||
    !boundedText(value.brandContextVersion, 80) ||
    !isInstant(value.createdAtUtc)
  ) {
    return { kind: "invalid", code: "field_too_long" };
  }

  const hooks = uniqueBoundedStrings(value.hooks, 5);
  const actors = uniqueBoundedStrings(value.actors, 8);
  const props = uniqueBoundedStrings(value.props, 16);
  if (!hooks || hooks.length < 1) return { kind: "invalid", code: "invalid_hooks" };
  if (!actors || !props) return { kind: "invalid", code: "invalid_shape" };

  if (
    value.estimatedDurationSeconds !== null &&
    (!Number.isInteger(value.estimatedDurationSeconds) ||
      Number(value.estimatedDurationSeconds) < 1 ||
      Number(value.estimatedDurationSeconds) > 900)
  ) {
    return { kind: "invalid", code: "invalid_duration" };
  }

  if (!isUuidOrNull(value.sourceSignalId) || !isUuidOrNull(value.campaignId)) {
    return { kind: "invalid", code: "invalid_identifier" };
  }

  return {
    kind: "valid",
    data: {
      id: value.id,
      revision: Number(value.revision),
      internalTitle: value.internalTitle.trim(),
      concept: value.concept.trim(),
      productScope: value.productScope.trim(),
      formatCode: value.formatCode,
      goal: value.goal,
      audiencePersona: value.audiencePersona === null ? null : value.audiencePersona.trim(),
      hooks,
      conflict: value.conflict === null ? null : value.conflict.trim(),
      payoff: value.payoff === null ? null : value.payoff.trim(),
      productRevealTiming:
        value.productRevealTiming === null ? null : value.productRevealTiming.trim(),
      ctaMechanic: value.ctaMechanic === null ? null : value.ctaMechanic.trim(),
      estimatedDurationSeconds:
        value.estimatedDurationSeconds === null ? null : Number(value.estimatedDurationSeconds),
      productionEffort: value.productionEffort,
      actors,
      location: value.location === null ? null : value.location.trim(),
      props,
      healthRiskClass: value.healthRiskClass,
      provenance: value.provenance,
      sourceSignalId: value.sourceSignalId,
      campaignId: value.campaignId,
      state: value.state,
      brandContextVersion: value.brandContextVersion.trim(),
      createdAtUtc: value.createdAtUtc,
    },
  };
}

function parseScene(value: unknown): MarketingScriptScene | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.startSecond !== "number" ||
    typeof value.endSecond !== "number" ||
    !Number.isFinite(value.startSecond) ||
    !Number.isFinite(value.endSecond) ||
    value.startSecond < 0 ||
    value.endSecond <= value.startSecond ||
    value.endSecond > 900 ||
    !nullableBoundedText(value.actor, MAX_SHORT_TEXT) ||
    !nullableBoundedText(value.dialogue, MAX_TEXT) ||
    !nullableBoundedText(value.onScreenText, MAX_TEXT) ||
    !nullableBoundedText(value.cameraSuggestion, MAX_TEXT) ||
    typeof value.productReveal !== "boolean"
  ) {
    return null;
  }
  return {
    startSecond: value.startSecond,
    endSecond: value.endSecond,
    actor: value.actor === null ? null : value.actor.trim(),
    dialogue: value.dialogue === null ? null : value.dialogue.trim(),
    onScreenText: value.onScreenText === null ? null : value.onScreenText.trim(),
    cameraSuggestion: value.cameraSuggestion === null ? null : value.cameraSuggestion.trim(),
    productReveal: value.productReveal,
  };
}

export function parseMarketingScriptDraft(value: unknown): MarketingScriptParseResult {
  if (!isRecord(value)) return { kind: "invalid", code: "invalid_shape" };
  if (typeof value.ideaId !== "string" || !UUID_PATTERN.test(value.ideaId)) {
    return { kind: "invalid", code: "invalid_identifier" };
  }
  if (
    !Number.isInteger(value.ideaRevision) ||
    Number(value.ideaRevision) < 1 ||
    !Number.isInteger(value.scriptRevision) ||
    Number(value.scriptRevision) < 1
  ) {
    return { kind: "invalid", code: "invalid_revision" };
  }

  const hooks = uniqueBoundedStrings(value.hooks, 5);
  const coverHeadlines = uniqueBoundedStrings(value.coverHeadlines, 5);
  if (!hooks || hooks.length < 2 || hooks.length > 5 || !coverHeadlines) {
    return { kind: "invalid", code: "invalid_hooks" };
  }
  if (!Array.isArray(value.scenes) || value.scenes.length < 1 || value.scenes.length > 30) {
    return { kind: "invalid", code: "invalid_scene" };
  }
  const scenes = value.scenes.map(parseScene);
  if (scenes.some((scene) => !scene)) return { kind: "invalid", code: "invalid_scene" };

  if (
    !nullableBoundedText(value.finalCta, MAX_SHORT_TEXT) ||
    !nullableBoundedText(value.captionDraft, 2_000) ||
    !boundedText(value.brandContextVersion, 80) ||
    !boundedText(value.policyVersion, 80) ||
    !isInstant(value.generatedAtUtc)
  ) {
    return { kind: "invalid", code: "field_too_long" };
  }

  if (
    (value.generationMode !== "manual" && value.generationMode !== "model") ||
    value.publishAllowed !== false
  ) {
    return { kind: "invalid", code: "unsafe_generation_metadata" };
  }
  if (
    value.generationMode === "manual" &&
    (value.provider !== null || value.model !== null)
  ) {
    return { kind: "invalid", code: "unsafe_generation_metadata" };
  }
  if (
    value.generationMode === "model" &&
    (!boundedText(value.provider, 120) || !boundedText(value.model, 120))
  ) {
    return { kind: "invalid", code: "unsafe_generation_metadata" };
  }

  return {
    kind: "valid",
    data: {
      ideaId: value.ideaId,
      ideaRevision: Number(value.ideaRevision),
      scriptRevision: Number(value.scriptRevision),
      hooks,
      scenes: scenes as MarketingScriptScene[],
      finalCta: value.finalCta === null ? null : value.finalCta.trim(),
      captionDraft: value.captionDraft === null ? null : value.captionDraft.trim(),
      coverHeadlines,
      brandContextVersion: value.brandContextVersion.trim(),
      policyVersion: value.policyVersion.trim(),
      generationMode: value.generationMode,
      provider: value.provider,
      model: value.model,
      generatedAtUtc: value.generatedAtUtc,
      publishAllowed: false,
    },
  };
}

function factor(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, Math.round(value * 10) / 10));
}

export function scoreMarketingIdeaHeuristic(
  input: MarketingIdeaScoreFactors,
): MarketingIdeaHeuristicScore {
  const factors: MarketingIdeaScoreFactors = {
    relatability: factor(input.relatability),
    curiosity: factor(input.curiosity),
    emotionalClarity: factor(input.emotionalClarity),
    participation: factor(input.participation),
    speedOfUnderstanding: factor(input.speedOfUnderstanding),
    productFit: factor(input.productFit),
    productionSimplicity: factor(input.productionSimplicity),
  };
  const entries = Object.entries(factors) as Array<[keyof MarketingIdeaScoreFactors, number]>;
  const average = entries.reduce((sum, [, value]) => sum + value, 0) / entries.length;
  const score = Math.round((average / 5) * 100);
  const labels: Record<keyof MarketingIdeaScoreFactors, string> = {
    relatability: "relatability",
    curiosity: "curiosity",
    emotionalClarity: "emotional clarity",
    participation: "participation mechanic",
    speedOfUnderstanding: "speed of understanding",
    productFit: "product fit",
    productionSimplicity: "production simplicity",
  };
  const explanation = entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, value]) => `${labels[key]}: ${value.toFixed(1)}/5`);

  return {
    score,
    factors,
    explanation,
    predictsVirality: false,
    rankingAuthority: "operator_override_allowed",
  };
}

function shootGroupKey(candidate: ShootPlanCandidate): string {
  const actors = [...candidate.actors].map((actor) => actor.trim().toLocaleLowerCase("en-US")).sort();
  const location = candidate.location?.trim().toLocaleLowerCase("en-US") ?? "none";
  const clothing = candidate.clothingContinuityKey?.trim().toLocaleLowerCase("en-US") ?? "none";
  return `${actors.join("+")}|${location}|${clothing}`;
}

export function groupShootPlanCandidates(candidates: ShootPlanCandidate[]): ShootPlanGroup[] {
  const groups = new Map<string, ShootPlanCandidate[]>();
  for (const candidate of candidates) {
    if (!UUID_PATTERN.test(candidate.ideaId)) continue;
    if (!Number.isInteger(candidate.ideaRevision) || candidate.ideaRevision < 1) continue;
    if (!boundedText(candidate.title, MAX_TITLE)) continue;
    if (!Array.isArray(candidate.actors) || candidate.actors.length > 8) continue;
    if (!Array.isArray(candidate.props) || candidate.props.length > 16) continue;
    if (
      !Number.isFinite(candidate.estimatedSetupMinutes) ||
      !Number.isFinite(candidate.estimatedRecordingMinutes) ||
      candidate.estimatedSetupMinutes < 0 ||
      candidate.estimatedRecordingMinutes < 0 ||
      candidate.estimatedSetupMinutes > 240 ||
      candidate.estimatedRecordingMinutes > 240
    ) {
      continue;
    }
    const key = shootGroupKey(candidate);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }

  return [...groups.entries()].map(([groupKey, items]) => {
    const first = items[0];
    const propCounts = new Map<string, number>();
    for (const item of items) {
      for (const prop of item.props) {
        const normalized = prop.trim();
        if (!normalized) continue;
        propCounts.set(normalized, (propCounts.get(normalized) ?? 0) + 1);
      }
    }
    const sharedProps = [...propCounts.entries()]
      .filter(([, count]) => count === items.length)
      .map(([prop]) => prop)
      .sort((a, b) => a.localeCompare(b));
    const totalEstimatedMinutes = items.reduce(
      (sum, item, index) =>
        sum + item.estimatedRecordingMinutes + (index === 0 ? item.estimatedSetupMinutes : 0),
      0,
    );

    return {
      groupKey,
      actors: [...first.actors].sort((a, b) => a.localeCompare(b)),
      location: first.location,
      clothingContinuityKey: first.clothingContinuityKey,
      sharedProps,
      totalEstimatedMinutes,
      items: [...items].sort((a, b) => a.title.localeCompare(b.title)),
    };
  });
}
