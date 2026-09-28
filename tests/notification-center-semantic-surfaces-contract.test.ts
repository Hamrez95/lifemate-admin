import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("ADM-UX-05 Notification center semantic surfaces", () => {
  it("keeps notification states, mobile sheet and focus behavior theme-safe", () => {
    const notificationCss = read("src/components/shell/notification-center.module.css");
    const research = read("docs/qa/BUFFER_REFERENCE_2026-09-26.md");

    expect(notificationCss).toContain("var(--lm-surface-raised)");
    expect(notificationCss).toContain("var(--lm-focus)");
    expect(notificationCss).toContain("var(--lm-danger)");
    expect(notificationCss).toContain("width: 44px");
    expect(notificationCss).toContain("@media (max-width: 760px)");
    expect(notificationCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba\(/);
    expect(research).toContain("Notification center semantic-surface wave");
  });
});
