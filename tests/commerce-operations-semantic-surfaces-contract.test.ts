import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Commerce operations semantic surfaces", () => {
  it("keeps payment operation controls and feedback theme-safe", () => {
    const operationsCss = read("app/commerce/operations/operations.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(operationsCss).toContain("var(--lm-surface-raised)");
    expect(operationsCss).toContain("var(--lm-focus)");
    expect(operationsCss).toContain("var(--lm-danger)");
    expect(operationsCss).toContain("@media (max-width: 720px)");
    expect(operationsCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Commerce operations semantic-surface wave");
  });
});
