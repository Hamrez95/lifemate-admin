import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Commerce transactions semantic surfaces", () => {
  it("keeps transaction list states, flow cards and responsive grids theme-safe", () => {
    const transactionsCss = read("app/commerce/transactions/transactions.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(transactionsCss).toContain("var(--lm-surface-raised)");
    expect(transactionsCss).toContain("var(--lm-focus)");
    expect(transactionsCss).toContain("var(--lm-danger)");
    expect(transactionsCss).toContain(".summaryGrid");
    expect(transactionsCss).toContain("@media (max-width: 640px)");
    expect(transactionsCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Commerce transactions semantic-surface wave");
  });
});
