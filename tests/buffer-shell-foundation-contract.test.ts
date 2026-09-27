import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Buffer-inspired shell foundation", () => {
  it("keeps the shared shell calm, responsive and accessible", () => {
    const sidebar = read("src/components/shell/Sidebar.tsx");
    const globals = read("app/globals.css");
    const tokens = read("app/design-system.css");
    const primitives = read("src/components/ui/primitives.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(sidebar).toContain("aria-expanded={!collapsed}");
    expect(sidebar).toContain("باز کردن نوار کناری");
    expect(globals).toContain(".sidebar--collapsed");
    expect(globals).toContain(".app-shell:has(.sidebar--collapsed)");
    expect(globals).toContain(".nav-item[data-active="true"]::before");
    expect(globals).toContain(".nav-item > span:not(.nav-item__symbol)");
    expect(tokens).toContain("--lm-sidebar-collapsed-width");
    expect(tokens).toContain("--lm-surface-hover");
    expect(primitives).toContain("min-height: 44px");
    expect(primitives).toContain(".button:hover:not(:disabled)");
    expect(research).toContain("Buffer-inspired shell foundation wave");
  });
});
