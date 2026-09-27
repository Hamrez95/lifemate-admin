import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Support ticket semantic surfaces", () => {
  it("keeps ticket operations readable, theme-safe and responsive", () => {
    const ticketCss = read("app/support/[ticketId]/ticket-detail.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(ticketCss).toContain("var(--lm-surface-raised)");
    expect(ticketCss).toContain("var(--lm-focus)");
    expect(ticketCss).toContain("var(--lm-text-muted)");
    expect(ticketCss).toContain("var(--lm-violet-soft)");
    expect(ticketCss).toContain(".operationGrid");
    expect(ticketCss).toContain("@media (max-width: 680px)");
    expect(ticketCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Support ticket semantic-surface wave");
  });
});
