import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync("src/lib/admin-api/marketing-ai-content.ts", "utf8");
const page = readFileSync("app/marketing/content-studio/page.tsx", "utf8");
const actions = readFileSync("app/marketing/content-studio/actions.ts", "utf8");
const marketingPage = readFileSync("app/marketing/page.tsx", "utf8");

describe("ADM-MKT-004 AI Content Studio security contract", () => {
  it("keeps generation server-only and bounded", () => {
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/ai-content/generations");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toMatch(
      /OPENAI_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL|SUPABASE_SERVICE_ROLE/i,
    );
  });

  it("requires both marketing source access and the AI marketing capability", () => {
    expect(page).toContain('admin.permissions.includes("marketing.read")');
    expect(page).toContain('admin.permissions.includes("ai.marketing.use")');
    expect(page).toContain("marketing.read و ai.marketing.use هر دو لازم‌اند");
  });

  it("keeps AI output draft-only and visibly human-reviewed", () => {
    expect(page).toContain("AI Draft · Not approved");
    expect(page).toContain("بازبینی انسانی کمپین");
    expect(page).toContain("این دکمه چیزی را auto-approve نمی‌کند");
    expect(page).toContain("Auto publish");
    expect(page).toContain("Blocked");
    expect(page).toContain("Raw Health context");
    expect(actions).not.toContain("requestMarketingCampaignPublish");
    expect(actions).not.toContain("setMarketingCampaignApproval");
  });

  it("uses structured allowlists instead of arbitrary tool-driving prompts", () => {
    expect(client).toContain("marketingAiContentGoals");
    expect(client).toContain("marketingAiContentTones");
    expect(client).toContain("marketingAiContentLanguages");
    expect(actions).toContain("keyMessage.length > 500");
    expect(actions).toContain("callToAction.length > 240");
    expect(page).toContain("Prompt آزاد وجود ندارد");
    expect(page).toContain("متن به‌عنوان data دیده می‌شود");
  });

  it("shows truthful model state and exposes no provider credential surface", () => {
    expect(page).toContain("not_configured");
    expect(page).toContain("deterministic_fallback");
    expect(page).toContain("Provider credential در browser صفر");
    expect(page).not.toMatch(
      /name=["'](?:accessToken|refreshToken|secret|credential|apiKey)["']/i,
    );
    expect(actions).not.toMatch(/accessToken|refreshToken|secretValue|apiKey/);
  });

  it("makes the Studio discoverable from the Marketing workspace", () => {
    expect(marketingPage).toContain('href="/marketing/content-studio"');
    expect(marketingPage).toContain("AI Content Studio");
  });
});
