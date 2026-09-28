import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Offline semantic surfaces", () => {
  it("keeps the offline recovery state theme-safe", () => {
    const offlineCss = read("app/offline/offline.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(offlineCss).toContain("var(--lm-surface-raised)");
    expect(offlineCss).toContain("var(--lm-focus)");
    expect(offlineCss).toContain("var(--lm-green-soft)");
    expect(offlineCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Offline state semantic-surface wave");
  });
});
