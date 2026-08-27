import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function source(path: string) {
  return await readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

describe("Commerce growth rewards workspace", () => {
  it("uses only the canonical server-side Core #494 Admin contract", async () => {
    const client = await source("src/lib/admin-api/growth-rewards.ts");
    expect(client).toContain('import "server-only"');
    expect(client).toContain("/api/v1/commerce/rewards/rules?limit=100");
    expect(client).toContain("/api/v1/commerce/rewards/sources/Referral?limit=100");
    expect(client).toContain("/api/v1/commerce/rewards/sources/Advocacy?limit=100");
    expect(client).toContain("/api/v1/commerce/rewards/events?limit=100");
    expect(client).toContain('cache: "no-store"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("keeps reward changes permissioned, idempotent and reviewable", async () => {
    const actions = await source("app/commerce/rewards/actions.ts");
    const controls = await source("app/commerce/rewards/GrowthRewardControls.tsx");
    expect(actions).toContain("idempotencyKey");
    expect(actions).toContain("expectedVersion");
    expect(actions).toContain("reason");
    expect(controls).toContain('state.status === "success"');
    expect(controls).toContain("handledSuccessRef.current !== state");
  });

  it("does not invent social evidence or bypass reward fulfillment approvals", async () => {
    const page = await source("app/commerce/rewards/page.tsx");
    expect(page).toMatch(/private profile scraping\s+وجود\s+ندارد/);
    expect(page).toMatch(/approval\/abuse policy را\s+در Core enforce می‌کند/);
    expect(page).toContain("growth.rewards.read");
    expect(page).toContain("growth.rewards.write");
    expect(page).not.toContain("fulfillment-requests");
    expect(page).not.toContain("/fulfill");
  });

  it("adds the rewards workspace to Commerce navigation", async () => {
    const header = await source("app/commerce/CommerceWorkspaceHeader.tsx");
    expect(header).toContain('| "rewards"');
    expect(header).toContain('href: "/commerce/rewards"');
  });
});
