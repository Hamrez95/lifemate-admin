import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const client = readFileSync("src/lib/admin-api/ai-advisor.ts", "utf8");
const page = readFileSync("app/ai/page.tsx", "utf8");
const workspaces = readFileSync("src/config/workspaces.ts", "utf8");

describe("ADM-AI-001 read-only advisor contract", () => {
  it("keeps the advisor API server-only with bounded no-store requests", () => {
    expect(client).toContain('import "server-only"');
    expect(client).toContain("createServerSupabaseClient");
    expect(client).toContain("/api/v1/ai/advisor/insights");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
  });

  it("never exposes model/provider/database secrets to browser code", () => {
    expect(page).not.toMatch(
      /OPENAI_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL|SUPABASE_SERVICE_ROLE/i,
    );
    expect(client).not.toMatch(
      /OPENAI_API_KEY|ANTHROPIC_API_KEY|DATABASE_URL|SUPABASE_SERVICE_ROLE/i,
    );
    expect(page).toContain("Approved read models only");
    expect(page).toContain("Raw Health / Women Health: blocked");
  });

  it("requires advisor permission and the underlying analytics permission", () => {
    expect(page).toContain('admin.permissions.includes("ai.advisor.read")');
    expect(page).toContain('admin.permissions.includes("analytics.read")');
    expect(workspaces).toContain('"ai.advisor.read"');
  });

  it("renders evidence, source, freshness and unavailable semantics instead of fake metrics", () => {
    expect(page).toContain("Evidence");
    expect(page).toContain("Freshness");
    expect(page).toContain("Source ID");
    expect(page).toContain("ناموجود");
    expect(page).toContain("Unavailable و partial");
  });

  it("does not present the feature as a generic autonomous chatbot", () => {
    expect(page).toContain("chatbot عمومی نیست");
    expect(page).toContain("No mutation");
    expect(page).toContain("untrusted context");
    expect(page).toContain("مدل خارجی در فاز اول فعال نیست");
  });
});
