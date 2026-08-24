import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Marketing references 12/13/23", () => {
  it("uses the approved marketing hero across Studio, Campaigns and Calendar", () => {
    const studioCss = source("app/marketing/content-studio/studio.module.css");
    const campaignsCss = source("app/marketing/campaigns/campaigns.module.css");
    const calendarCss = source("app/marketing/content-calendar/calendar.module.css");

    for (const css of [studioCss, campaignsCss, calendarCss]) {
      expect(css).toContain("/design-assets/marketing-hero-v1.png");
      expect(css).toContain("prefers-reduced-motion");
      expect(css).toContain(":focus-visible");
    }
  });

  it("keeps Campaign attribution metrics unavailable instead of fabricating KPIs", () => {
    const page = source("app/marketing/campaigns/page.tsx");

    expect(page).toContain("Attribution · Unavailable");
    expect(page).toContain("ROAS، CAC و conversion فقط با قرارداد canonical نمایش داده می‌شوند");
    expect(page).toContain("هیچ");
    expect(page).toContain("KPI");
    expect(page).not.toContain("Math.random");
    expect(page).not.toContain("fakeRoas");
  });

  it("keeps AI Studio draft-only and never gives AI publish authority", () => {
    const page = source("app/marketing/content-studio/page.tsx");
    const actions = source("app/marketing/content-studio/actions.ts");

    expect(page).toContain("AI Draft · Not approved");
    expect(page).toContain("Auto publish");
    expect(page).toContain("Blocked");
    expect(page).toContain("not_configured");
    expect(actions).not.toContain("requestMarketingCampaignPublish");
    expect(actions).not.toContain("setMarketingCampaignApproval");
  });

  it("keeps Calendar truthful, RTL and robust for long Persian content", () => {
    const page = source("app/marketing/content-calendar/page.tsx");
    const css = source("app/marketing/content-calendar/calendar.module.css");

    expect(page).toContain("event نمایشی");
    expect(page).toContain("OutcomeUnknown");
    expect(page).toContain("Connectivity: NotVerified");
    expect(css).toContain("direction: rtl");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("word-break: break-word");
    expect(css).toContain("white-space: pre-wrap");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("max-width: 680px");
  });

  // This suite intentionally guards truthful unavailable states as part of the visual references.
});
