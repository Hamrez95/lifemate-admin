import { describe, expect, it } from "vitest";

import {
  buildMarketingRenderCanonicalPayload,
  marketingCreativeRendererBoundary,
  parseMarketingBrandKit,
  parseMarketingCreativeTemplate,
  parseMarketingInteractiveCreativeSpec,
  parseMarketingRenderJob,
  validateMarketingCarouselSeries,
  validateMarketingRenderRequest,
  type MarketingBrandKit,
  type MarketingCreativeTemplate,
  type MarketingRenderRequest,
} from "./marketing-creative-renderer-contract";
import { buildMarketingRenderFingerprint } from "./marketing-creative-renderer-server";

const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const ASSET_ID = "22222222-2222-4222-8222-222222222222";
const ANSWER_ASSET_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_SLIDE_ID = "44444444-4444-4444-8444-444444444444";
const JOB_ID = "55555555-5555-4555-8555-555555555555";
const SHA = "a".repeat(64);

function brandKitInput() {
  return {
    version: "lifemate-brand-v1",
    masterPaletteRef: "brand/palette/master-v1",
    productPaletteRefs: {
      lifemate: "brand/palette/lifemate-v1",
      wellmate: "brand/palette/wellmate-v1",
    },
    typographyRefs: ["font/vazirmatn", "font/inter"],
    spacingScaleRef: "brand/spacing/v1",
    radiusScaleRef: "brand/radius/v1",
    shadowScaleRef: "brand/shadow/v1",
    logoVariantRefs: ["brand/logo/lifemate-primary"],
    iconSetRef: "brand/icons/v1",
    safeAreaPolicyRef: "brand/safe-area/social-v1",
    ctaStyleRefs: ["brand/cta/primary-v1"],
    rtlPolicyRef: "brand/layout/rtl-v1",
    ltrPolicyRef: "brand/layout/ltr-v1",
    approvedPhraseRefs: ["brand/phrases/core-v1"],
    contrastPolicyRef: "brand/contrast/wcag-v1",
  };
}

function templateInput(overrides: Record<string, unknown> = {}) {
  return {
    templateId: "reel_cover",
    version: 1,
    state: "current",
    brandKitVersion: "lifemate-brand-v1",
    productScope: "lifemate",
    formatCode: "instagram_reel_cover",
    aspectFamily: "vertical_9_16",
    directionMode: "auto",
    rendererCode: "svg_social_v1",
    layoutCode: "hero_title_v1",
    fontFallbackPolicy: "block",
    overflowPolicy: "needs_review",
    arbitraryRemoteFetchAllowed: false,
    arbitraryExecutableTemplateAllowed: false,
    slots: [
      {
        key: "title",
        kind: "title",
        required: true,
        maxCharacters: 40,
        assetUsage: "none",
      },
      {
        key: "screenshot",
        kind: "app_screenshot",
        required: false,
        maxCharacters: null,
        assetUsage: "approved_screenshot",
      },
    ],
    ...overrides,
  };
}

function parsedFixtures(): {
  brandKit: MarketingBrandKit;
  template: MarketingCreativeTemplate;
} {
  const brandKit = parseMarketingBrandKit(brandKitInput());
  const template = parseMarketingCreativeTemplate(templateInput());
  if (!brandKit || !template) throw new Error("test fixture contract is invalid");
  return { brandKit, template };
}

function requestInput(overrides: Partial<MarketingRenderRequest> = {}): MarketingRenderRequest {
  return {
    requestId: REQUEST_ID,
    templateId: "reel_cover",
    templateVersion: 1,
    brandKitVersion: "lifemate-brand-v1",
    locale: "fa-IR",
    direction: "rtl",
    inputs: {
      title: { kind: "text", value: "یک عنوان کوتاه برای لایف‌میت" },
      screenshot: {
        kind: "asset",
        assetId: ASSET_ID,
        usage: "approved_screenshot",
      },
    },
    availableFontRefs: ["font/vazirmatn", "font/inter"],
    outputScale: 2,
    ...overrides,
  };
}

describe("Marketing Creative Renderer contract", () => {
  it("parses a versioned Brand Kit with explicit RTL/LTR and contrast references", () => {
    const brandKit = parseMarketingBrandKit(brandKitInput());

    expect(brandKit).not.toBeNull();
    expect(brandKit?.version).toBe("lifemate-brand-v1");
    expect(brandKit?.typographyRefs).toEqual(["font/vazirmatn", "font/inter"]);
    expect(brandKit?.rtlPolicyRef).toBe("brand/layout/rtl-v1");
    expect(brandKit?.contrastPolicyRef).toBe("brand/contrast/wcag-v1");
  });

  it("accepts structured templates and rejects executable or remote-fetch template flags", () => {
    expect(parseMarketingCreativeTemplate(templateInput())).not.toBeNull();
    expect(
      parseMarketingCreativeTemplate(templateInput({ arbitraryRemoteFetchAllowed: true })),
    ).toBeNull();
    expect(
      parseMarketingCreativeTemplate(templateInput({ arbitraryExecutableTemplateAllowed: true })),
    ).toBeNull();
  });

  it("builds one canonical payload and SHA-256 fingerprint regardless of input key order", () => {
    const first = requestInput();
    const second = requestInput({
      inputs: {
        screenshot: {
          kind: "asset",
          assetId: ASSET_ID,
          usage: "approved_screenshot",
        },
        title: { kind: "text", value: "یک عنوان کوتاه برای لایف‌میت" },
      },
    });

    expect(buildMarketingRenderCanonicalPayload(first)).toBe(
      buildMarketingRenderCanonicalPayload(second),
    );
    expect(buildMarketingRenderFingerprint(first)).toBe(buildMarketingRenderFingerprint(second));
    expect(buildMarketingRenderFingerprint(first)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("enforces locale direction and exact template/Brand Kit versions", () => {
    const { brandKit, template } = parsedFixtures();

    expect(validateMarketingRenderRequest(requestInput(), template, brandKit)).toEqual({
      kind: "valid",
    });
    expect(
      validateMarketingRenderRequest(requestInput({ direction: "ltr" }), template, brandKit),
    ).toEqual({ kind: "invalid", code: "direction_mismatch" });
    expect(
      validateMarketingRenderRequest(
        requestInput({ brandKitVersion: "lifemate-brand-v2" }),
        template,
        brandKit,
      ),
    ).toEqual({ kind: "invalid", code: "brand_kit_mismatch" });
  });

  it("blocks missing fonts when the template requires exact approved fonts", () => {
    const { brandKit, template } = parsedFixtures();

    expect(
      validateMarketingRenderRequest(
        requestInput({ availableFontRefs: ["font/vazirmatn"] }),
        template,
        brandKit,
      ),
    ).toEqual({ kind: "invalid", code: "missing_font" });
  });

  it("marks bounded overflow for review and can hard-block it by template policy", () => {
    const { brandKit, template } = parsedFixtures();
    const longTitle = "x".repeat(41);

    expect(
      validateMarketingRenderRequest(
        requestInput({ inputs: { title: { kind: "text", value: longTitle } } }),
        template,
        brandKit,
      ),
    ).toEqual({ kind: "needs_review", code: "text_overflow" });

    const blockingTemplate = parseMarketingCreativeTemplate(
      templateInput({ overflowPolicy: "block" }),
    );
    expect(blockingTemplate).not.toBeNull();
    if (!blockingTemplate) return;
    expect(
      validateMarketingRenderRequest(
        requestInput({ inputs: { title: { kind: "text", value: longTitle } } }),
        blockingTemplate,
        brandKit,
      ),
    ).toEqual({ kind: "invalid", code: "text_overflow" });
  });

  it("never permits Creative Radar reference-only assets as publish/render assets", () => {
    const { brandKit, template } = parsedFixtures();

    expect(
      validateMarketingRenderRequest(
        requestInput({
          inputs: {
            title: { kind: "text", value: "Safe title" },
            screenshot: {
              kind: "asset",
              assetId: ASSET_ID,
              usage: "reference_only",
            },
          },
        }),
        template,
        brandKit,
      ),
    ).toEqual({ kind: "invalid", code: "restricted_asset" });
  });

  it("requires ready render jobs to carry an output asset and SHA-256 checksum", () => {
    const readyJob = {
      jobId: JOB_ID,
      requestFingerprint: SHA,
      status: "ready",
      attempt: 1,
      idempotencyKey: "render:request:11111111",
      outputAssetId: ASSET_ID,
      outputChecksumSha256: SHA,
      templateId: "reel_cover",
      templateVersion: 1,
      brandKitVersion: "lifemate-brand-v1",
      rendererVersion: "renderer-v1",
      createdAtUtc: "2026-09-07T16:00:00.000Z",
      updatedAtUtc: "2026-09-07T16:00:02.000Z",
      failureCode: null,
    };

    expect(parseMarketingRenderJob(readyJob)).not.toBeNull();
    expect(parseMarketingRenderJob({ ...readyJob, outputAssetId: null })).toBeNull();
    expect(parseMarketingRenderJob({ ...readyJob, status: "queued" })).toBeNull();
  });

  it("requires puzzle reveal data and keeps quiz choices bounded", () => {
    expect(
      parseMarketingInteractiveCreativeSpec({
        kind: "puzzle",
        prompt: "کدام گزینه متفاوت است؟",
        options: [],
        answer: null,
        answerAssetId: null,
        difficulty: "medium",
        timerPromptSeconds: 15,
      }),
    ).toBeNull();

    expect(
      parseMarketingInteractiveCreativeSpec({
        kind: "puzzle",
        prompt: "کدام گزینه متفاوت است؟",
        options: [],
        answer: null,
        answerAssetId: ANSWER_ASSET_ID,
        difficulty: "medium",
        timerPromptSeconds: 15,
      }),
    ).not.toBeNull();

    expect(
      parseMarketingInteractiveCreativeSpec({
        kind: "quiz",
        prompt: "انتخاب شما؟",
        options: ["A"],
        answer: "A",
        answerAssetId: null,
        difficulty: null,
        timerPromptSeconds: null,
      }),
    ).toBeNull();
  });

  it("validates ordered reproducible carousel groups and rejects duplicate slides", () => {
    const first = {
      slideId: REQUEST_ID,
      order: 1,
      templateId: "carousel_slide",
      templateVersion: 2,
      renderFingerprint: SHA,
    };
    const second = {
      slideId: SECOND_SLIDE_ID,
      order: 2,
      templateId: "carousel_slide",
      templateVersion: 2,
      renderFingerprint: "b".repeat(64),
    };

    expect(validateMarketingCarouselSeries([second, first])).toBe(true);
    expect(validateMarketingCarouselSeries([first, { ...second, slideId: first.slideId }])).toBe(
      false,
    );
    expect(validateMarketingCarouselSeries([first, { ...second, templateVersion: 3 }])).toBe(false);
    expect(validateMarketingCarouselSeries([first, { ...second, order: 3 }])).toBe(false);
  });

  it("keeps all dangerous renderer capabilities disabled and requires approval + lineage", () => {
    expect(marketingCreativeRendererBoundary).toEqual({
      arbitraryRemoteFetchAllowed: false,
      arbitraryHtmlAllowed: false,
      arbitraryCssAllowed: false,
      arbitraryJavascriptAllowed: false,
      referenceAssetPublishAllowed: false,
      fakeProductionScreenshotAllowed: false,
      rawProviderSecretAllowed: false,
      humanApprovalRequiredBeforePublish: true,
      outputAssetLineageRequired: true,
    });
  });
});
