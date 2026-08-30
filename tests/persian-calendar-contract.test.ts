import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function tsxFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(root, relativeDir);
  const files: string[] = [];
  for (const entry of readdirSync(absoluteDir)) {
    const absolute = path.join(absoluteDir, entry);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (statSync(absolute).isDirectory()) files.push(...tsxFiles(relative));
    else if (entry.endsWith(".tsx")) files.push(relative);
  }
  return files;
}

describe("Persian calendar UI contract", () => {
  it("never constructs a Gregorian DateTimeFormat directly inside app routes", () => {
    const offenders: string[] = [];

    for (const file of tsxFiles("app")) {
      const source = readFileSync(path.join(root, file), "utf8");
      const formatterCalls = source.matchAll(
        /new Intl\.DateTimeFormat\(([^\n]*)(?:\n[\s\S]{0,180})?/g,
      );
      for (const match of formatterCalls) {
        const snippet = match[0];
        if (!snippet.includes("u-ca-persian")) offenders.push(file);
      }
    }

    expect([...new Set(offenders)]).toEqual([]);
  });

  it("keeps the shared Persian formatter pinned to the Jalali calendar and Tehran timezone", () => {
    const source = readFileSync(path.join(root, "src/lib/time-zone.ts"), "utf8");
    expect(source).toContain('PERSIAN_LOCALE = "fa-IR-u-ca-persian-nu-latn"');
    expect(source).toContain('TEHRAN_TIME_ZONE = "Asia/Tehran"');
  });
});
