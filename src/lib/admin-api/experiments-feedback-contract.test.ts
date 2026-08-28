import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("Admin #191 experiments/feedback canonical boundary", () => {
  it("uses only the server Admin API with no direct Supabase/browser DB path", () => {
    const client = source("src/lib/admin-api/experiments-feedback.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("getServerAdminAccessToken");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).toContain('adminFetch("/api/v1/experiments")');
    expect(client).toContain("adminFetch(`/api/v1/feedback");
    expect(client).not.toContain("createClient(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain(".from(");
  });

  it("keeps experiment delivery constrained to canonical non-clinical surfaces", () => {
    const page = source("app/experiments/page.tsx");
    for (const surface of [
      "onboarding",
      "pricing",
      "paywall",
      "cta",
      "offer",
      "nonclinical_feature",
    ]) {
      expect(page).toContain(`value=\"${surface}\"`);
    }
    expect(page).not.toContain('value="medication"');
    expect(page).not.toContain('value="diagnosis"');
    expect(page).not.toContain('value="cycle"');
  });

  it("keeps raw feedback and aggregate-only trends on separate permissions", () => {
    const page = source("app/experiments/page.tsx");
    const sidebar = source("src/components/shell/Sidebar.tsx");
    expect(page).toContain('admin.permissions.includes("feedback.read")');
    expect(page).toContain('admin.permissions.includes("feedback.trends.read")');
    expect(page).toContain(
      "if (!canReadExperiments && !canReadFeedback && !canReadFeedbackTrends)",
    );
    expect(page).toContain(
      "const trends = canReadFeedbackTrends ? await listFeedbackTrends({ days: 30 }) : null;",
    );
    expect(page).toContain("{canReadFeedback ? (");
    expect(page).toContain("{canReadFeedbackTrends ? (");
    expect(sidebar).toContain('admin.permissions.includes("feedback.trends.read")');
  });

  it("fails closed when feedback Admin API is unavailable and never invents advocacy rewards", () => {
    const page = source("app/experiments/page.tsx");
    expect(page).toContain("Feedback Admin API هنوز آماده نیست");
    expect(page).toContain("direct DB fallback وجود ندارد");
    expect(page).toContain(
      "Advocacy reward execution هنوز تا وجود API canonical reward handoff غیرفعال است",
    );
    expect(page).toContain("no social scraping");
  });

  it("requires idempotency keys for all product-learning mutations", () => {
    const client = source("src/lib/admin-api/experiments-feedback.ts");
    expect(client.match(/Idempotency-Key/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    const actions = source("app/experiments/actions.ts");
    expect(actions).toContain("idempotencyKey");
  });
});
