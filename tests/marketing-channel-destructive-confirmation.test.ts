import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "app/marketing/channels/ChannelStatusControl.tsx"),
  "utf8",
);

describe("Marketing channel destructive confirmation", () => {
  it("requires acknowledgement before a channel is disabled", () => {
    expect(source).toContain("const isDestructive = !nextEnabled");
    expect(source).toContain("isDestructive && !confirmed");
    expect(source).toContain('name="operatorConfirmed"');
    expect(source).toMatch(/وضعیت واقعی\s+اجرا فقط پس از پاسخ سرور مشخص می‌شود/);
  });
});
