import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync("src/lib/admin-api/ai-advisor.ts", "utf8");
const briefClient = readFileSync("src/lib/admin-api/ai-daily-brief.ts", "utf8");
const advisorPage = readFileSync("app/ai/page.tsx", "utf8");
const briefPage = readFileSync("app/ai/daily-brief/page.tsx", "utf8");
const loading = readFileSync("app/ai/loading.tsx", "utf8");
const error = readFileSync("app/ai/error.tsx", "utf8");
const workspaces = readFileSync("src/config/workspaces.ts", "utf8");

describe("ADM-AI-001 canonical AI surfaces", () => {
  it("keeps Advisor API server-only with bounded no-store requests", () => {
    expect(client).toContain('import "server-only"');
    expect(client).toContain("createServerSupabaseClient");
    expect(client).toContain("/api/v1/ai/advisor/insights");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
  });

  it("uses the approved AI illustration only as a supporting hero visual", () => {
    expect(advisorPage).toContain('src="/design-assets/ai-advisor-hero-v1.png"');
    expect(briefPage).toContain('src="/design-assets/ai-advisor-hero-v1.png"');
    expect(advisorPage).toContain("<Image");
    expect(briefPage).toContain("<Image");
  });

  it("requires Advisor permission plus its underlying analytics permission", () => {
    expect(advisorPage).toContain('admin.permissions.includes("ai.advisor.read")');
    expect(advisorPage).toContain('admin.permissions.includes("analytics.read")');
    expect(workspaces).toContain('"ai.advisor.read"');
  });

  it("consumes Daily Brief only through the canonical server-side Core contract", () => {
    expect(briefPage).toContain('admin.permissions.includes("ai.business.read")');
    expect(briefPage).toContain("getDailyBrief()");
    expect(briefPage).toContain("هیچ summary جایگزین ساخته نمی‌شود");
    expect(briefClient).toContain('import "server-only"');
    expect(briefClient).toContain("/api/v1/ai/daily-brief");
    expect(briefClient).toContain('cache: "no-store"');
    expect(briefClient).toContain("AbortSignal.timeout(10_000)");
    expect(briefPage).not.toMatch(/fetch\s*\(/);
  });

  it("keeps raw health, medical advice and sensitive input outside the AI UI", () => {
    expect(advisorPage).toContain("بدون داده سلامت خام");
    expect(advisorPage).toContain("اطلاعات هویتی، سلامت، پزشکی یا متن حساس وارد نکنید");
    expect(briefPage).toContain("بدون توصیه پزشکی");
    expect(advisorPage).not.toMatch(
      /OPENAI_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL|SUPABASE_SERVICE_ROLE/i,
    );
  });

  it("renders evidence and unavailable semantics instead of fake metrics", () => {
    expect(advisorPage).toContain("داده‌های پشتیبان پاسخ");
    expect(advisorPage).toContain("منبع canonical");
    expect(advisorPage).toContain("ناموجود");
    expect(advisorPage).toContain("هیچ پاسخ جایگزین یا ساختگی نمایش داده نمی‌شود");
  });

  it("keeps loading and error states short, Persian and fail-closed", () => {
    expect(loading).toContain("در حال دریافت پاسخ امن…");
    expect(error).toContain("خطا در بارگذاری بخش هوشمند.");
    expect(error).toContain("هیچ پاسخ جایگزین یا داده حساسی نمایش داده نشد.");
    expect(error).toContain("تلاش دوباره");
  });
});
