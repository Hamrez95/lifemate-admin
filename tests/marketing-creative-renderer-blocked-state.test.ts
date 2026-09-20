import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("app/marketing/creative-renderer/page.tsx", "utf8");

describe("Creative Renderer truthful blocked workspace", () => {
  it("does not fabricate a template preview or generated asset without a canonical renderer", () => {
    expect(page).toContain('state="unavailable"');
    expect(page).toMatch(/preview یا asset تولیدشده جعل نمی‌کنیم/);
    expect(page).toMatch(/JavaScript\s+آزاد\s+ندارد/);
    expect(page).toContain('href="/marketing"');
  });
});
