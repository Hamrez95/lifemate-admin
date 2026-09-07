export const creativeSignalSourceTypes = [
  "instagram",
  "linkedin",
  "website",
  "ooh",
  "campaign",
  "other",
] as const;

export type CreativeSignalSourceType = (typeof creativeSignalSourceTypes)[number];

export const creativePatternCodes = [
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
] as const;

export type CreativePatternCode = (typeof creativePatternCodes)[number];

export const creativeProductionEfforts = ["low", "medium", "high"] as const;
export type CreativeProductionEffort = (typeof creativeProductionEfforts)[number];

export const creativeRiskFlags = [
  "health_claim",
  "copyright",
  "privacy",
  "brand_safety",
  "unsupported_source",
] as const;
export type CreativeRiskFlag = (typeof creativeRiskFlags)[number];

export const creativeRadarAiBoundary = Object.freeze({
  publishAllowed: false,
  rawHealthAllowed: false,
  arbitraryPromptAllowed: false,
  competitorCreativeRecreationAllowed: false,
  viralityPredictionAllowed: false,
} as const);

export type CreativeReferenceAsset = {
  assetRef: string;
  kind: "image" | "screenshot";
  provenanceNote: string | null;
  usage: "reference_only";
  publishEligible: false;
};

export type NormalizedCreativeSignalCapture = {
  sourceUrl: string;
  normalizedSourceIdentity: string;
  sourceType: CreativeSignalSourceType;
  title: string | null;
  operatorNote: string | null;
  referenceBrand: string | null;
  tags: string[];
  productTags: string[];
  patternCodes: CreativePatternCode[];
  referenceAssets: CreativeReferenceAsset[];
};

export type CreativeSignalCaptureErrorCode =
  | "invalid_payload"
  | "invalid_source_url"
  | "non_public_source_url"
  | "invalid_source_type"
  | "field_too_long"
  | "too_many_tags"
  | "invalid_pattern_code"
  | "invalid_reference_asset";

export type CreativeSignalCaptureResult =
  | { kind: "valid"; data: NormalizedCreativeSignalCapture }
  | { kind: "invalid"; code: CreativeSignalCaptureErrorCode };

export type CreativeSignalAnalysis = {
  patternCodes: CreativePatternCode[];
  hookMechanism: string;
  targetEmotions: string[];
  participationMechanism: string | null;
  engagementTriggers: string[];
  formatStructure: string;
  productRevealTiming: string | null;
  ctaStyle: string | null;
  productionEffort: CreativeProductionEffort;
  riskFlags: CreativeRiskFlag[];
  lifeMateRelevance: string;
  originalLifeMateAdaptations: string[];
  sourceContentAvailability: "available" | "partial" | "unavailable";
  generation: {
    provider: string;
    model: string;
    policyVersion: string;
    generatedAtUtc: string;
  };
  boundary: typeof creativeRadarAiBoundary;
};

const TRACKING_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
]);

const MAX_URL_LENGTH = 2_048;
const MAX_TITLE_LENGTH = 240;
const MAX_NOTE_LENGTH = 4_000;
const MAX_REFERENCE_BRAND_LENGTH = 160;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 64;
const MAX_ASSETS = 8;
const MAX_ASSET_REF_LENGTH = 512;
const MAX_PROVENANCE_LENGTH = 500;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizedOptionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (normalized.length > maxLength) return undefined;
  return normalized.length > 0 ? normalized : null;
}

function isSourceType(value: unknown): value is CreativeSignalSourceType {
  return (
    typeof value === "string" &&
    creativeSignalSourceTypes.includes(value as CreativeSignalSourceType)
  );
}

function isPatternCode(value: unknown): value is CreativePatternCode {
  return typeof value === "string" && creativePatternCodes.includes(value as CreativePatternCode);
}

function isProductionEffort(value: unknown): value is CreativeProductionEffort {
  return (
    typeof value === "string" &&
    creativeProductionEfforts.includes(value as CreativeProductionEffort)
  );
}

function isRiskFlag(value: unknown): value is CreativeRiskFlag {
  return typeof value === "string" && creativeRiskFlags.includes(value as CreativeRiskFlag);
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || !host.includes(".")) return false;
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".home.arpa")) {
    return false;
  }
  // Manual capture is for public web references. Reject IP literals so a future
  // ingestion adapter cannot accidentally turn a saved signal into an SSRF target.
  if (/^[0-9.]+$/.test(host) || host.includes(":")) return false;
  return true;
}

export function normalizeCreativeSignalSourceUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || !isPublicHostname(url.hostname)) return null;

  url.hash = "";
  const keys = Array.from(url.searchParams.keys());
  for (const key of keys) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.startsWith("utm_") || TRACKING_QUERY_KEYS.has(normalizedKey)) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();

  return url.toString();
}

function normalizeStringList(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_TAGS) return null;

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return null;
    const text = item.trim().replace(/\s+/g, " ");
    if (!text || text.length > MAX_TAG_LENGTH) return null;
    const dedupeKey = text.toLocaleLowerCase("en-US");
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      normalized.push(text);
    }
  }
  return normalized;
}

function normalizePatternCodes(value: unknown): CreativePatternCode[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > creativePatternCodes.length) return null;
  const result: CreativePatternCode[] = [];
  for (const item of value) {
    if (!isPatternCode(item)) return null;
    if (!result.includes(item)) result.push(item);
  }
  return result;
}

function normalizeReferenceAssets(value: unknown): CreativeReferenceAsset[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_ASSETS) return null;

  const assets: CreativeReferenceAsset[] = [];
  for (const valueItem of value) {
    const item = record(valueItem);
    if (!item || (item.kind !== "image" && item.kind !== "screenshot")) return null;
    if (typeof item.assetRef !== "string") return null;
    const assetRef = item.assetRef.trim();
    if (
      !assetRef ||
      assetRef.length > MAX_ASSET_REF_LENGTH ||
      /[\u0000-\u001f\u007f]/.test(assetRef)
    ) {
      return null;
    }
    const provenanceNote = normalizedOptionalText(item.provenanceNote, MAX_PROVENANCE_LENGTH);
    if (provenanceNote === undefined) return null;
    assets.push({
      assetRef,
      kind: item.kind,
      provenanceNote,
      usage: "reference_only",
      publishEligible: false,
    });
  }
  return assets;
}

export function parseCreativeSignalManualCapture(value: unknown): CreativeSignalCaptureResult {
  const input = record(value);
  if (!input || typeof input.sourceUrl !== "string") {
    return { kind: "invalid", code: "invalid_payload" };
  }
  if (!isSourceType(input.sourceType)) {
    return { kind: "invalid", code: "invalid_source_type" };
  }

  const sourceUrl = normalizeCreativeSignalSourceUrl(input.sourceUrl);
  if (!sourceUrl) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(input.sourceUrl.trim());
    } catch {
      // handled below
    }
    if (
      parsed &&
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      (!isPublicHostname(parsed.hostname) || Boolean(parsed.username) || Boolean(parsed.password))
    ) {
      return { kind: "invalid", code: "non_public_source_url" };
    }
    return { kind: "invalid", code: "invalid_source_url" };
  }

  const title = normalizedOptionalText(input.title, MAX_TITLE_LENGTH);
  const operatorNote = normalizedOptionalText(input.operatorNote, MAX_NOTE_LENGTH);
  const referenceBrand = normalizedOptionalText(input.referenceBrand, MAX_REFERENCE_BRAND_LENGTH);
  if (title === undefined || operatorNote === undefined || referenceBrand === undefined) {
    return { kind: "invalid", code: "field_too_long" };
  }

  const tags = normalizeStringList(input.tags);
  const productTags = normalizeStringList(input.productTags);
  if (!tags || !productTags) return { kind: "invalid", code: "too_many_tags" };

  const patternCodes = normalizePatternCodes(input.patternCodes);
  if (!patternCodes) return { kind: "invalid", code: "invalid_pattern_code" };

  const referenceAssets = normalizeReferenceAssets(input.referenceAssets);
  if (!referenceAssets) return { kind: "invalid", code: "invalid_reference_asset" };

  return {
    kind: "valid",
    data: {
      sourceUrl,
      normalizedSourceIdentity: `public-url:${sourceUrl}`,
      sourceType: input.sourceType,
      title,
      operatorNote,
      referenceBrand,
      tags,
      productTags,
      patternCodes,
      referenceAssets,
    },
  };
}

function boundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function boundedStringArray(
  value: unknown,
  options: { min: number; max: number; itemMax: number },
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length >= options.min &&
    value.length <= options.max &&
    value.every((item) => boundedString(item, options.itemMax))
  );
}

export function parseCreativeSignalAnalysis(value: unknown): CreativeSignalAnalysis | null {
  const input = record(value);
  const generation = record(input?.generation);
  const boundary = record(input?.boundary);
  if (!input || !generation || !boundary) return null;

  const patternCodes = normalizePatternCodes(input.patternCodes);
  if (!patternCodes || patternCodes.length < 1 || patternCodes.length > 8) return null;
  if (!boundedString(input.hookMechanism, 800)) return null;
  if (!boundedStringArray(input.targetEmotions, { min: 0, max: 8, itemMax: 80 })) return null;
  const participationMechanism = normalizedOptionalText(input.participationMechanism, 800);
  if (participationMechanism === undefined) return null;
  if (!boundedStringArray(input.engagementTriggers, { min: 0, max: 8, itemMax: 160 })) return null;
  if (!boundedString(input.formatStructure, 1_200)) return null;
  const productRevealTiming = normalizedOptionalText(input.productRevealTiming, 400);
  const ctaStyle = normalizedOptionalText(input.ctaStyle, 400);
  if (productRevealTiming === undefined || ctaStyle === undefined) return null;
  if (!isProductionEffort(input.productionEffort)) return null;
  if (
    !Array.isArray(input.riskFlags) ||
    input.riskFlags.length > creativeRiskFlags.length ||
    input.riskFlags.some((flag) => !isRiskFlag(flag))
  ) {
    return null;
  }
  if (!boundedString(input.lifeMateRelevance, 1_500)) return null;
  if (
    !boundedStringArray(input.originalLifeMateAdaptations, {
      min: 3,
      max: 5,
      itemMax: 1_200,
    })
  ) {
    return null;
  }
  if (
    input.sourceContentAvailability !== "available" &&
    input.sourceContentAvailability !== "partial" &&
    input.sourceContentAvailability !== "unavailable"
  ) {
    return null;
  }
  if (
    !boundedString(generation.provider, 120) ||
    !boundedString(generation.model, 160) ||
    !boundedString(generation.policyVersion, 120) ||
    typeof generation.generatedAtUtc !== "string" ||
    Number.isNaN(Date.parse(generation.generatedAtUtc))
  ) {
    return null;
  }
  if (
    boundary.publishAllowed !== false ||
    boundary.rawHealthAllowed !== false ||
    boundary.arbitraryPromptAllowed !== false ||
    boundary.competitorCreativeRecreationAllowed !== false ||
    boundary.viralityPredictionAllowed !== false
  ) {
    return null;
  }

  return {
    patternCodes,
    hookMechanism: input.hookMechanism.trim(),
    targetEmotions: [...input.targetEmotions] as string[],
    participationMechanism,
    engagementTriggers: [...input.engagementTriggers] as string[],
    formatStructure: input.formatStructure.trim(),
    productRevealTiming,
    ctaStyle,
    productionEffort: input.productionEffort,
    riskFlags: Array.from(new Set(input.riskFlags as CreativeRiskFlag[])),
    lifeMateRelevance: input.lifeMateRelevance.trim(),
    originalLifeMateAdaptations: [...input.originalLifeMateAdaptations] as string[],
    sourceContentAvailability: input.sourceContentAvailability,
    generation: {
      provider: generation.provider.trim(),
      model: generation.model.trim(),
      policyVersion: generation.policyVersion.trim(),
      generatedAtUtc: generation.generatedAtUtc,
    },
    boundary: creativeRadarAiBoundary,
  };
}
