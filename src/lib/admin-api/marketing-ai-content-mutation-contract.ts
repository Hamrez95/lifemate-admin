export type MarketingAiContentMutationExpectation = {
  campaignId: string;
  goal: string;
  tone: string;
  language: string;
  keyMessage: string | null;
  callToAction: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeOptionalText(value: string | null): string | null {
  if (value === null || value === "") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
}

function sameUuid(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" &&
    UUID.test(value) &&
    UUID.test(expected) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

export function isMarketingAiContentMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: MarketingAiContentMutationExpectation,
): boolean {
  const body = record(value);
  const generation = record(body?.generation);
  if (
    !body ||
    !generation ||
    typeof body.replayed !== "boolean" ||
    !sameUuid(generation.campaignId, expected.campaignId) ||
    generation.goal !== expected.goal ||
    generation.tone !== expected.tone ||
    generation.language !== expected.language ||
    generation.keyMessage !== normalizeOptionalText(expected.keyMessage) ||
    generation.callToAction !== normalizeOptionalText(expected.callToAction) ||
    generation.generationMode !== "deterministic_fallback" ||
    generation.modelStatus !== "not_configured"
  ) {
    return false;
  }

  return body.replayed ? httpStatus === 200 : httpStatus === 201;
}
