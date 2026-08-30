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
  it("keeps every user-visible app DateTimeFormat on the Persian/Jalali calendar", () => {
    expect(new Intl.DateTimeFormat("fa-IR").resolvedOptions().calendar).toBe("persian");

    const offenders: string[] = [];
    for (const file of tsxFiles("app")) {
      const source = readFileSync(path.join(root, file), "utf8");
      const formatterCalls = source.matchAll(
        /new Intl\.DateTimeFormat\(([^\n]*)(?:\n[\s\S]{0,320})?/g,
      );
      for (const match of formatterCalls) {
        const snippet = match[0];
        const isPersianDisplay =
          snippet.includes('"fa-IR"') ||
          snippet.includes('"fa-IR-u-ca-persian') ||
          snippet.includes('calendar: "persian"');
        const isGregorianMachineInput =
          snippet.includes('"en-CA"') &&
          snippet.includes("formatToParts") &&
          source.includes('type="datetime-local"');
        if (!isPersianDisplay && !isGregorianMachineInput) offenders.push(file);
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
