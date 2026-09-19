import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/components/ui/OverlayPrimitives.tsx", "utf8");
const styles = readFileSync("src/components/ui/primitives.module.css", "utf8");

describe("canonical overlay primitives", () => {
  it("exports accessible dialog, drawer, menu, popover, tooltip and combobox primitives", () => {
    for (const primitive of ["Dialog", "Drawer", "Menu", "Popover", "Tooltip", "Combobox"]) {
      expect(source).toContain(`export function ${primitive}`);
    }
    expect(source).toContain("showModal()");
    expect(source).toContain('aria-haspopup="menu"');
    expect(source).toContain('role="tooltip"');
    expect(source).toContain("onOpenChange(false)");
  });

  it("keeps focus, logical RTL layout and reduced-motion styling in the primitive layer", () => {
    expect(styles).toContain("inset-inline-end");
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
