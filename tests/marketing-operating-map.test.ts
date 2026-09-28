import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Marketing operating map", () => {
  it("keeps the marketing flow discoverable without fabricating blocked capabilities", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app/marketing/page.tsx"),
      "utf8",
    );

    for (const href of [
      "/marketing/campaigns",
      "/marketing/creative-radar",
      "/marketing/idea-engine",
      "/marketing/content-studio",
      "/marketing/media-inbox",
      "/marketing/repurpose",
      "/marketing/content-calendar",
      "/marketing/review-publish",
      "/marketing/channels",
      "/marketing/organic-analytics",
    ]) {
      expect(source).toContain(href);
    }

    expect(source).toContain("Marketing operating system");
    expect(source).toContain('state: "blocked"');
    expect(source).toContain("قرارداد #380");
    expect(source).toContain("قرارداد #389");
    expect(source).not.toContain("auto-publish");
  });
});
