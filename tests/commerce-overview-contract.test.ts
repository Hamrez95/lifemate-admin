import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-COM-001 Commerce Overview", () => {
  it("reads commerce only through the Admin API", () => {
    const client = source("src/lib/admin-api/commerce-overview.ts");

    expect(client).toContain("/api/v1/commerce/overview?");
    expect(client).toContain('cache: "no-store"');
    expect(client).toContain("AbortSignal.timeout(10_000)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
    expect(client).not.toContain("provider_reference_hash");
    expect(client).not.toContain("source_key");
  });

  it("requires commerce.read before rendering the dashboard", () => {
    const page = source("app/commerce/page.tsx");

    expect(page).toContain('admin.permissions.includes("commerce.read")');
    expect(page).toContain('activeSlug="commerce"');
    expect(page).toContain('AdminPageState state="forbidden"');
  });

  it("keeps plan subscription and entitlement semantics separate", () => {
    const page = source("app/commerce/page.tsx");

    expect(page).toContain("Plan");
    expect(page).toContain("Subscription");
    expect(page).toContain("Entitlement");
    expect(page).toContain("توزیع پلن‌ها");
    expect(page).toContain("پوشش قابلیت‌ها");
    expect(page).toContain('title="Subscriptionها"');
  });

  it("uses real freshness and server pagination without fake revenue", () => {
    const page = source("app/commerce/page.tsx");

    expect(page).toContain("data.freshness.asOfUtc");
    expect(page).toContain("previousHref");
    expect(page).toContain("nextHref");
    expect(page).toContain("data.subscriptions.total");
    expect(page).not.toContain("MRR");
    expect(page).not.toContain("fake revenue");
  });

  it("supports keyboard, mobile and reduced motion", () => {
    const css = source("app/commerce/commerce.module.css");

    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 640px");
    expect(css).toContain("prefers-reduced-motion");
    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-blue)");
    expect(css).toContain("var(--lm-violet)");
  });
});
