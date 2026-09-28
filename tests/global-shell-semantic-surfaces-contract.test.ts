import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Global shell semantic surfaces", () => {
  it("keeps the shared shell theme-safe and responsive", () => {
    const globalsCss = read("app/globals.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(globalsCss).toContain("var(--lm-focus)");
    expect(globalsCss).toContain("var(--lm-sidebar-width)");
    expect(globalsCss).toContain("@media (max-width: 680px)");
    expect(globalsCss).toContain("@media (prefers-reduced-motion: reduce)");
    expect(globalsCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Global shell semantic-surface wave");
  });
});
