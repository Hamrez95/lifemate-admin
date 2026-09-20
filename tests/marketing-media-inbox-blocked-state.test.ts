import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/media-inbox/page.tsx", "utf8");

describe("Media Inbox truthful blocked workspace", () => {
  it("does not fabricate an upload, processing result, or public asset while its API is absent", () => {
    expect(page).toContain('state="unavailable"');
    expect(page).toMatch(
      /هیچ\s+فایل،\s+thumbnail،\s+transcript،\s+progress یا نتیجهٔ ساختگی نشان نمی‌دهد/,
    );
    expect(page).toMatch(/raw asset\s+تغییرناپذیر است/);
    expect(page).toContain('href="/marketing"');
  });
});
