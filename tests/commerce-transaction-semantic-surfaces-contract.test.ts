import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Commerce transaction semantic surfaces", () => {
  it("keeps payment detail states and refund controls theme-safe", () => {
    const transactionCss = read(
      "app/commerce/transactions/[transactionId]/transaction-detail.module.css",
    );
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(transactionCss).toContain("var(--lm-surface)");
    expect(transactionCss).toContain("var(--lm-danger)");
    expect(transactionCss).toContain("var(--lm-focus)");
    expect(transactionCss).toContain(".refundPanel");
    expect(transactionCss).toContain("@media (max-width: 640px)");
    expect(transactionCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Commerce transaction semantic-surface wave");
  });
});
