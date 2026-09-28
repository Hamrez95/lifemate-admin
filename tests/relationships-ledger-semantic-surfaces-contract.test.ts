import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Relationships ledger semantic surfaces", () => {
  it("keeps relationship timeline and filters theme-safe", () => {
    const ledgerCss = read("app/relationships/ledger/ledger.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(ledgerCss).toContain("var(--lm-surface-raised)");
    expect(ledgerCss).toContain("var(--lm-focus)");
    expect(ledgerCss).toContain("var(--lm-violet-soft)");
    expect(ledgerCss).toContain(".timelineItem");
    expect(ledgerCss).toContain("@media (max-width: 680px)");
    expect(ledgerCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Relationships ledger semantic-surface wave");
  });
});
