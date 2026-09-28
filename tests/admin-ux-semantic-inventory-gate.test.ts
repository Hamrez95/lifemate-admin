import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const colorLiteral = /#[0-9a-fA-F]{3,8}\\b|rgba?\\([^)]*\\)/g;

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return absolute.endsWith(".css") ? [absolute] : [];
  });
}

function relative(absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}

describe("ADM-UX-05 semantic inventory gate", () => {
  it("keeps route CSS on semantic tokens and isolates raw literals to the token foundation", () => {
    const cssFiles = ["app", "src"].flatMap((directory) => walk(path.join(root, directory)));
    const hotspots = cssFiles
      .map((file) => ({
        file: relative(file),
        count: readFileSync(file, "utf8").match(colorLiteral)?.length ?? 0,
      }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count);

    expect(hotspots).toEqual([{ file: "app/design-system.css", count: 44 }]);

    const inventory = JSON.parse(
      readFileSync(path.join(root, "docs/project/UX_V2_UI_INVENTORY.json"), "utf8"),
    );
    expect(inventory.counts.rawColorLiterals).toBe(44);
    expect(inventory.rawColorHotspots).toEqual(hotspots);
  });

  it("keeps the token foundation ready for both themes, focus and motion preferences", () => {
    const designSystem = readFileSync(path.join(root, "app/design-system.css"), "utf8");

    for (const token of ["--lm-surface-raised", "--lm-focus", "--lm-shadow"]) {
      expect(designSystem).toContain(token);
    }
    expect(designSystem).toContain('[data-theme="dark"]');
    expect(designSystem).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
