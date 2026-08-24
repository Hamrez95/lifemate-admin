import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("Support references 7 / 8", () => {
  it("uses the support hero asset through next/image", () => {
    const page = source("app/support/page.tsx");
    expect(page).toContain('import Image from "next/image"');
    expect(page).toContain("/design-assets/support-hero-v1.png");
    expect(page).toContain("sizes=");
  });

  it("only exposes canonical supported ticket actions", () => {
    const operations = source("app/support/[ticketId]/TicketOperations.tsx");
    for (const action of ["add_note", "set_status", "set_priority", "set_assignee"]) {
      expect(operations).toContain(`value=\"${action}\"`);
    }
    expect(operations).not.toContain("reply_to_user");
    expect(operations).not.toContain("upload_attachment");
  });

  it("keeps idempotency, pending and network-safe feedback", () => {
    const operations = source("app/support/[ticketId]/TicketOperations.tsx");
    const actions = source("app/support/[ticketId]/actions.ts");
    expect(operations).toContain("idempotencyKey");
    expect(operations).toContain("aria-busy={pending}");
    expect(operations).toContain("disabled={pending}");
    expect(operations).toContain("spinner");
    expect(actions).toContain("اتصال به Admin API برقرار نشد");
    expect(actions).toContain("رویداد audit ثبت شد");
  });

  it("guards long mixed-language content and mobile layout", () => {
    const css = source("app/support/support.css");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain("word-break: break-word");
    expect(css).toContain("@media (max-width: 390px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (max-width: 1024px)");
  });
});
