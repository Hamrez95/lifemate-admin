export const marketingAspectFamilies = ["square_1_1", "portrait_4_5", "vertical_9_16"] as const;
export const marketingDirectionModes = ["auto", "rtl", "ltr"] as const;
export const marketingTemplateStates = ["current", "deprecated"] as const;
export const marketingTemplateSlotKinds = [
  "title",
  "subtitle",
  "body",
  "badge",
  "cta",
  "product_label",
  "image",
  "video_thumbnail",
  "app_screenshot",
  "icon",
  "progress",
  "slide_number",
  "logo",
] as const;
export const marketingInteractiveKinds = [
  "puzzle",
  "hidden_object",
  "spot_difference",
  "quiz",
  "this_or_that",
  "story_poll_concept",
] as const;

export type MarketingAspectFamily = (typeof marketingAspectFamilies)[number];
export type MarketingDirectionMode = (typeof marketingDirectionModes)[number];
export type MarketingTemplateState = (typeof marketingTemplateStates)[number];
export type MarketingTemplateSlotKind = (typeof marketingTemplateSlotKinds)[number];
export type MarketingInteractiveKind = (typeof marketingInteractiveKinds)[number];

export type MarketingBrandKit = {
  version: string;
  masterPaletteRef: string;
  productPaletteRefs: Record<string, string>;
  typographyRefs: string[];
  spacingScaleRef: string;
  radiusScaleRef: string;
  shadowScaleRef: string;
  logoVariantRefs: string[];
  iconSetRef: string;
  safeAreaPolicyRef: string;
  ctaStyleRefs: string[];
  rtlPolicyRef: string;
  ltrPolicyRef: string;
  approvedPhraseRefs: string[];
  contrastPolicyRef: string;
};

export type MarketingTemplateSlot = {
  key: string;
  kind: MarketingTemplateSlotKind;
  required: boolean;
  maxCharacters: number | null;
  assetUsage: "none" | "publish_asset" | "approved_screenshot" | "concept_mockup";
};

export type MarketingCreativeTemplate = {
  templateId: string;
  version: number;
  state: MarketingTemplateState;
  brandKitVersion: string;
  productScope: string;
  formatCode: string;
  aspectFamily: MarketingAspectFamily;
  directionMode: MarketingDirectionMode;
  rendererCode: string;
  layoutCode: string;
  fontFallbackPolicy: "block" | "approved_fallback";
  overflowPolicy: "block" | "needs_review";
  arbitraryRemoteFetchAllowed: false;
  arbitraryExecutableTemplateAllowed: false;
  slots: MarketingTemplateSlot[];
};

export type MarketingRenderSlotValue =
  | { kind: "text"; value: string }
  | {
      kind: "asset";
      assetId: string;
      usage: "publish_asset" | "approved_screenshot" | "concept_mockup" | "reference_only";
    }
  | { kind: "number"; value: number };

export type MarketingRenderRequest = {
  requestId: string;
  templateId: string;
  templateVersion: number;
  brandKitVersion: string;
  locale: "fa-IR" | "en-US";
  direction: "rtl" | "ltr";
  inputs: Record<string, MarketingRenderSlotValue>;
  availableFontRefs: string[];
  outputScale: 1 | 2 | 3;
};

export type MarketingRenderValidation =
  | { kind: "valid" }
  | {
      kind: "invalid";
      code:
        | "template_mismatch"
        | "brand_kit_mismatch"
        | "direction_mismatch"
        | "missing_slot"
        | "unknown_slot"
        | "slot_type_mismatch"
        | "text_overflow"
        | "restricted_asset"
        | "invalid_identifier"
        | "missing_font";
    }
  | { kind: "needs_review"; code: "text_overflow" };

export type MarketingRenderJob = {
  jobId: string;
  requestFingerprint: string;
  status: "queued" | "rendering" | "ready" | "failed" | "needs_review";
  attempt: number;
  idempotencyKey: string;
  outputAssetId: string | null;
  outputChecksumSha256: string | null;
  templateId: string;
  templateVersion: number;
  brandKitVersion: string;
  rendererVersion: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  failureCode: string | null;
};

export type MarketingInteractiveCreativeSpec = {
  kind: MarketingInteractiveKind;
  prompt: string;
  options: string[];
  answer: string | null;
  answerAssetId: string | null;
  difficulty: "easy" | "medium" | "hard" | null;
  timerPromptSeconds: number | null;
};

export type MarketingCarouselSlide = {
  slideId: string;
  order: number;
  templateId: string;
  templateVersion: number;
  renderFingerprint: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,95}$/;
const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const MAX_SHORT_TEXT = 240;
const MAX_BODY_TEXT = 2_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function buildMarketingRenderCanonicalPayload(request: MarketingRenderRequest): string {
  return stableStringify({
    templateId: request.templateId,
    templateVersion: request.templateVersion,
    brandKitVersion: request.brandKitVersion,
    locale: request.locale,
    direction: request.direction,
    inputs: request.inputs,
    outputScale: request.outputScale,
  });
}

export function parseMarketingBrandKit(value: unknown): MarketingBrandKit | null {
  if (!isRecord(value)) return null;
  if (!boundedText(value.version, 80) || !VERSION_PATTERN.test(value.version)) return null;
  if (!boundedText(value.masterPaletteRef, 120)) return null;
  if (!isRecord(value.productPaletteRefs)) return null;
  const productPaletteRefs: Record<string, string> = {};
  for (const [key, ref] of Object.entries(value.productPaletteRefs)) {
    if (!CODE_PATTERN.test(key) || !boundedText(ref, 120)) return null;
    productPaletteRefs[key] = ref;
  }

  const arrayFields = [
    value.typographyRefs,
    value.logoVariantRefs,
    value.ctaStyleRefs,
    value.approvedPhraseRefs,
  ];
  if (
    arrayFields.some(
      (field) =>
        !Array.isArray(field) ||
        field.length === 0 ||
        field.length > 32 ||
        field.some((item) => !boundedText(item, 120)),
    )
  ) {
    return null;
  }

  const scalarRefs = [
    value.spacingScaleRef,
    value.radiusScaleRef,
    value.shadowScaleRef,
    value.iconSetRef,
    value.safeAreaPolicyRef,
    value.rtlPolicyRef,
    value.ltrPolicyRef,
    value.contrastPolicyRef,
  ];
  if (scalarRefs.some((field) => !boundedText(field, 120))) return null;

  return {
    version: value.version,
    masterPaletteRef: value.masterPaletteRef,
    productPaletteRefs,
    typographyRefs: [...(value.typographyRefs as string[])],
    spacingScaleRef: value.spacingScaleRef as string,
    radiusScaleRef: value.radiusScaleRef as string,
    shadowScaleRef: value.shadowScaleRef as string,
    logoVariantRefs: [...(value.logoVariantRefs as string[])],
    iconSetRef: value.iconSetRef as string,
    safeAreaPolicyRef: value.safeAreaPolicyRef as string,
    ctaStyleRefs: [...(value.ctaStyleRefs as string[])],
    rtlPolicyRef: value.rtlPolicyRef as string,
    ltrPolicyRef: value.ltrPolicyRef as string,
    approvedPhraseRefs: [...(value.approvedPhraseRefs as string[])],
    contrastPolicyRef: value.contrastPolicyRef as string,
  };
}

function parseTemplateSlot(value: unknown): MarketingTemplateSlot | null {
  if (!isRecord(value)) return null;
  if (!boundedText(value.key, 64) || !CODE_PATTERN.test(value.key)) return null;
  if (
    typeof value.kind !== "string" ||
    !marketingTemplateSlotKinds.includes(value.kind as MarketingTemplateSlotKind) ||
    typeof value.required !== "boolean"
  ) {
    return null;
  }
  if (
    value.maxCharacters !== null &&
    (!Number.isInteger(value.maxCharacters) ||
      Number(value.maxCharacters) < 1 ||
      Number(value.maxCharacters) > MAX_BODY_TEXT)
  ) {
    return null;
  }
  if (
    value.assetUsage !== "none" &&
    value.assetUsage !== "publish_asset" &&
    value.assetUsage !== "approved_screenshot" &&
    value.assetUsage !== "concept_mockup"
  ) {
    return null;
  }
  return {
    key: value.key,
    kind: value.kind as MarketingTemplateSlotKind,
    required: value.required,
    maxCharacters: value.maxCharacters === null ? null : Number(value.maxCharacters),
    assetUsage: value.assetUsage,
  };
}

export function parseMarketingCreativeTemplate(value: unknown): MarketingCreativeTemplate | null {
  if (!isRecord(value)) return null;
  if (!boundedText(value.templateId, 96) || !CODE_PATTERN.test(value.templateId)) return null;
  if (!Number.isInteger(value.version) || Number(value.version) < 1) return null;
  if (!boundedText(value.brandKitVersion, 80) || !VERSION_PATTERN.test(value.brandKitVersion)) return null;
  if (!boundedText(value.productScope, 96) || !CODE_PATTERN.test(value.productScope)) return null;
  if (!boundedText(value.formatCode, 96) || !CODE_PATTERN.test(value.formatCode)) return null;
  if (!boundedText(value.rendererCode, 96) || !CODE_PATTERN.test(value.rendererCode)) return null;
  if (!boundedText(value.layoutCode, 96) || !CODE_PATTERN.test(value.layoutCode)) return null;
  if (
    typeof value.state !== "string" ||
    !marketingTemplateStates.includes(value.state as MarketingTemplateState) ||
    typeof value.aspectFamily !== "string" ||
    !marketingAspectFamilies.includes(value.aspectFamily as MarketingAspectFamily) ||
    typeof value.directionMode !== "string" ||
    !marketingDirectionModes.includes(value.directionMode as MarketingDirectionMode)
  ) {
    return null;
  }
  if (
    value.fontFallbackPolicy !== "block" &&
    value.fontFallbackPolicy !== "approved_fallback"
  ) {
    return null;
  }
  if (value.overflowPolicy !== "block" && value.overflowPolicy !== "needs_review") return null;
  if (
    value.arbitraryRemoteFetchAllowed !== false ||
    value.arbitraryExecutableTemplateAllowed !== false
  ) {
    return null;
  }
  if (!Array.isArray(value.slots) || value.slots.length === 0 || value.slots.length > 32) return null;
  const slots = value.slots.map(parseTemplateSlot);
  if (slots.some((slot) => slot === null)) return null;
  const concreteSlots = slots as MarketingTemplateSlot[];
  if (new Set(concreteSlots.map((slot) => slot.key)).size !== concreteSlots.length) return null;

  return {
    templateId: value.templateId,
    version: Number(value.version),
    state: value.state as MarketingTemplateState,
    brandKitVersion: value.brandKitVersion,
    productScope: value.productScope,
    formatCode: value.formatCode,
    aspectFamily: value.aspectFamily as MarketingAspectFamily,
    directionMode: value.directionMode as MarketingDirectionMode,
    rendererCode: value.rendererCode,
    layoutCode: value.layoutCode,
    fontFallbackPolicy: value.fontFallbackPolicy,
    overflowPolicy: value.overflowPolicy,
    arbitraryRemoteFetchAllowed: false,
    arbitraryExecutableTemplateAllowed: false,
    slots: concreteSlots,
  };
}

function expectedValueKind(slot: MarketingTemplateSlot): "text" | "asset" | "number" {
  if (["image", "video_thumbnail", "app_screenshot", "icon", "logo"].includes(slot.kind)) {
    return "asset";
  }
  if (["progress", "slide_number"].includes(slot.kind)) return "number";
  return "text";
}

export function validateMarketingRenderRequest(
  request: MarketingRenderRequest,
  template: MarketingCreativeTemplate,
  brandKit: MarketingBrandKit,
): MarketingRenderValidation {
  if (!UUID_PATTERN.test(request.requestId)) return { kind: "invalid", code: "invalid_identifier" };
  if (request.templateId !== template.templateId || request.templateVersion !== template.version) {
    return { kind: "invalid", code: "template_mismatch" };
  }
  if (
    request.brandKitVersion !== template.brandKitVersion ||
    request.brandKitVersion !== brandKit.version
  ) {
    return { kind: "invalid", code: "brand_kit_mismatch" };
  }
  if (
    (template.directionMode === "rtl" && request.direction !== "rtl") ||
    (template.directionMode === "ltr" && request.direction !== "ltr") ||
    (request.locale === "fa-IR" && request.direction !== "rtl") ||
    (request.locale === "en-US" && request.direction !== "ltr")
  ) {
    return { kind: "invalid", code: "direction_mismatch" };
  }

  const slotMap = new Map(template.slots.map((slot) => [slot.key, slot]));
  for (const key of Object.keys(request.inputs)) {
    if (!slotMap.has(key)) return { kind: "invalid", code: "unknown_slot" };
  }
  for (const slot of template.slots) {
    const value = request.inputs[slot.key];
    if (!value) {
      if (slot.required) return { kind: "invalid", code: "missing_slot" };
      continue;
    }
    if (value.kind !== expectedValueKind(slot)) {
      return { kind: "invalid", code: "slot_type_mismatch" };
    }
    if (value.kind === "text") {
      const maxCharacters = slot.maxCharacters ?? MAX_SHORT_TEXT;
      if (value.value.length > maxCharacters) {
        return template.overflowPolicy === "needs_review"
          ? { kind: "needs_review", code: "text_overflow" }
          : { kind: "invalid", code: "text_overflow" };
      }
    }
    if (value.kind === "asset") {
      if (!UUID_PATTERN.test(value.assetId)) return { kind: "invalid", code: "invalid_identifier" };
      if (value.usage === "reference_only") return { kind: "invalid", code: "restricted_asset" };
      if (slot.assetUsage !== "none" && value.usage !== slot.assetUsage) {
        return { kind: "invalid", code: "restricted_asset" };
      }
    }
    if (value.kind === "number" && !Number.isFinite(value.value)) {
      return { kind: "invalid", code: "slot_type_mismatch" };
    }
  }

  if (
    template.fontFallbackPolicy === "block" &&
    brandKit.typographyRefs.some((fontRef) => !request.availableFontRefs.includes(fontRef))
  ) {
    return { kind: "invalid", code: "missing_font" };
  }

  return { kind: "valid" };
}

export function parseMarketingRenderJob(value: unknown): MarketingRenderJob | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.jobId !== "string" ||
    !UUID_PATTERN.test(value.jobId) ||
    typeof value.requestFingerprint !== "string" ||
    !SHA256_PATTERN.test(value.requestFingerprint) ||
    !Number.isInteger(value.attempt) ||
    Number(value.attempt) < 1 ||
    typeof value.idempotencyKey !== "string" ||
    !IDEMPOTENCY_PATTERN.test(value.idempotencyKey) ||
    typeof value.templateId !== "string" ||
    !CODE_PATTERN.test(value.templateId) ||
    !Number.isInteger(value.templateVersion) ||
    Number(value.templateVersion) < 1 ||
    typeof value.brandKitVersion !== "string" ||
    !VERSION_PATTERN.test(value.brandKitVersion) ||
    typeof value.rendererVersion !== "string" ||
    !VERSION_PATTERN.test(value.rendererVersion) ||
    typeof value.createdAtUtc !== "string" ||
    Number.isNaN(Date.parse(value.createdAtUtc)) ||
    typeof value.updatedAtUtc !== "string" ||
    Number.isNaN(Date.parse(value.updatedAtUtc))
  ) {
    return null;
  }
  if (
    value.status !== "queued" &&
    value.status !== "rendering" &&
    value.status !== "ready" &&
    value.status !== "failed" &&
    value.status !== "needs_review"
  ) {
    return null;
  }
  if (
    value.outputAssetId !== null &&
    (typeof value.outputAssetId !== "string" || !UUID_PATTERN.test(value.outputAssetId))
  ) {
    return null;
  }
  if (
    value.outputChecksumSha256 !== null &&
    (typeof value.outputChecksumSha256 !== "string" ||
      !SHA256_PATTERN.test(value.outputChecksumSha256))
  ) {
    return null;
  }
  if (value.failureCode !== null && !boundedText(value.failureCode, 120)) return null;
  if (
    value.status === "ready" &&
    (value.outputAssetId === null || value.outputChecksumSha256 === null)
  ) {
    return null;
  }
  if (value.status !== "ready" && value.outputChecksumSha256 !== null) return null;

  return value as MarketingRenderJob;
}

export function parseMarketingInteractiveCreativeSpec(
  value: unknown,
): MarketingInteractiveCreativeSpec | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.kind !== "string" ||
    !marketingInteractiveKinds.includes(value.kind as MarketingInteractiveKind) ||
    !boundedText(value.prompt, MAX_SHORT_TEXT) ||
    !Array.isArray(value.options) ||
    value.options.length > 4 ||
    value.options.some((option) => !boundedText(option, MAX_SHORT_TEXT))
  ) {
    return null;
  }
  if (value.kind === "quiz" || value.kind === "this_or_that") {
    if (value.options.length < 2) return null;
  }
  if (
    value.kind === "puzzle" ||
    value.kind === "hidden_object" ||
    value.kind === "spot_difference"
  ) {
    if (value.answer === null && value.answerAssetId === null) return null;
  }
  if (value.answer !== null && !boundedText(value.answer, MAX_SHORT_TEXT)) return null;
  if (
    value.answerAssetId !== null &&
    (typeof value.answerAssetId !== "string" || !UUID_PATTERN.test(value.answerAssetId))
  ) {
    return null;
  }
  if (
    value.difficulty !== null &&
    value.difficulty !== "easy" &&
    value.difficulty !== "medium" &&
    value.difficulty !== "hard"
  ) {
    return null;
  }
  if (
    value.timerPromptSeconds !== null &&
    (!Number.isInteger(value.timerPromptSeconds) ||
      Number(value.timerPromptSeconds) < 1 ||
      Number(value.timerPromptSeconds) > 120)
  ) {
    return null;
  }
  return {
    kind: value.kind as MarketingInteractiveKind,
    prompt: value.prompt.trim(),
    options: (value.options as string[]).map((option) => option.trim()),
    answer: value.answer === null ? null : String(value.answer).trim(),
    answerAssetId: value.answerAssetId as string | null,
    difficulty: value.difficulty as MarketingInteractiveCreativeSpec["difficulty"],
    timerPromptSeconds:
      value.timerPromptSeconds === null ? null : Number(value.timerPromptSeconds),
  };
}

export function validateMarketingCarouselSeries(slides: MarketingCarouselSlide[]): boolean {
  if (slides.length < 2 || slides.length > 20) return false;
  const ordered = [...slides].sort((a, b) => a.order - b.order);
  const templateId = ordered[0]?.templateId;
  const templateVersion = ordered[0]?.templateVersion;
  if (!templateId || !templateVersion) return false;
  if (new Set(ordered.map((slide) => slide.slideId)).size !== ordered.length) return false;
  return ordered.every(
    (slide, index) =>
      UUID_PATTERN.test(slide.slideId) &&
      slide.order === index + 1 &&
      slide.templateId === templateId &&
      slide.templateVersion === templateVersion &&
      SHA256_PATTERN.test(slide.renderFingerprint),
  );
}

export const marketingCreativeRendererBoundary = {
  arbitraryRemoteFetchAllowed: false,
  arbitraryHtmlAllowed: false,
  arbitraryCssAllowed: false,
  arbitraryJavascriptAllowed: false,
  referenceAssetPublishAllowed: false,
  fakeProductionScreenshotAllowed: false,
  rawProviderSecretAllowed: false,
  humanApprovalRequiredBeforePublish: true,
  outputAssetLineageRequired: true,
} as const;
