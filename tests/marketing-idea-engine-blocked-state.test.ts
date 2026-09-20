import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/idea-engine/page.tsx", "utf8");

describe("Idea Engine truthful blocked workspace", () => {
  it("does not fabricate ideas or publishing while the canonical API is unavailable", () => {
    expect(page).toContain('state="unavailable"');
    expect(page).toContain("هیچ ایده، score یا script نمایشی ساخته نمی‌شود");
    expect(page).toContain("انتشار خودکار صفر است");
    expect(page).toContain('href="/marketing/content-studio"');
  });
});
