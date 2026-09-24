import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/repurpose/page.tsx", "utf8");

describe("Repurpose Engine truthful blocked workspace", () => {
  it("does not fabricate derivatives, exports, or published social state", () => {
    expect(page).toContain('state="unavailable"');
    expect(page).toMatch(/Published\s+ساختگی نمایش داده نمی‌شود/);
    expect(page).toContain("Manual publish required");
    expect(page).toContain('href="/marketing"');
  });
});
