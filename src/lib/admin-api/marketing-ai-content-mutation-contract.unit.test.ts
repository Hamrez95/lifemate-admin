import { describe, expect, it } from "vitest";

import { isMarketingAiContentMutationSuccess } from "./marketing-ai-content-mutation-contract";

const CAMPAIGN_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_CAMPAIGN_ID = "123e4567-e89b-42d3-a456-426614174001";

const expected = {
  campaignId: CAMPAIGN_ID,
  goal: "awareness",
  tone: "warm",
  language: "fa",
  keyMessage: "  پیام   اصلی  ",
  callToAction: "  بیشتر   بدانید ",
};

const generation = {
  campaignId: CAMPAIGN_ID,
  goal: "awareness",
  tone: "warm",
  language: "fa",
  keyMessage: "پیام اصلی",
  callToAction: "بیشتر بدانید",
  generationMode: "deterministic_fallback",
  modelStatus: "not_configured",
};

describe("marketing AI content mutation success contract", () => {
  it("accepts a new canonical generation only as HTTP 201", () => {
    const body = { generation, replayed: false };

    expect(isMarketingAiContentMutationSuccess(body, 201, expected)).toBe(true);
    expect(isMarketingAiContentMutationSuccess(body, 200, expected)).toBe(false);
  });

  it("accepts an idempotent replay only as HTTP 200", () => {
    const body = { generation, replayed: true };

    expect(isMarketingAiContentMutationSuccess(body, 200, expected)).toBe(true);
    expect(isMarketingAiContentMutationSuccess(body, 201, expected)).toBe(false);
  });

  it("binds success to the exact campaign and normalized request fields", () => {
    const body = { generation, replayed: false };

    expect(
      isMarketingAiContentMutationSuccess(
        { ...body, generation: { ...generation, campaignId: OTHER_CAMPAIGN_ID } },
        201,
        expected,
      ),
    ).toBe(false);
    expect(
      isMarketingAiContentMutationSuccess(
        { ...body, generation: { ...generation, goal: "launch" } },
        201,
        expected,
      ),
    ).toBe(false);
    expect(
      isMarketingAiContentMutationSuccess(
        { ...body, generation: { ...generation, keyMessage: "پیام دیگر" } },
        201,
        expected,
      ),
    ).toBe(false);
  });

  it("preserves the deterministic fallback / no-model truth boundary", () => {
    const body = { generation, replayed: false };

    expect(
      isMarketingAiContentMutationSuccess(
        { ...body, generation: { ...generation, generationMode: "model" } },
        201,
        expected,
      ),
    ).toBe(false);
    expect(
      isMarketingAiContentMutationSuccess(
        { ...body, generation: { ...generation, modelStatus: "available" } },
        201,
        expected,
      ),
    ).toBe(false);
    expect(isMarketingAiContentMutationSuccess(null, 201, expected)).toBe(false);
  });
});
