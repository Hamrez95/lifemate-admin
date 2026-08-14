import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("ADM-SUP-002 Ticket Detail", () => {
  it("keeps reads and mutations behind the server Admin API", () => {
    const client = source("src/lib/admin-api/support-ticket.ts");

    expect(client).toContain("/api/v1/support/tickets/${ticketId}");
    expect(client).toContain("/events?");
    expect(client).toContain("/api/v1/support/assignees");
    expect(client).toContain('"Idempotency-Key": input.idempotencyKey');
    expect(client).toContain('method: "POST"');
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("enforces read and write permissions independently", () => {
    const page = source("app/support/[ticketId]/page.tsx");
    const operations = source("app/support/[ticketId]/TicketOperations.tsx");

    expect(page).toContain('admin.permissions.includes("support.read")');
    expect(page).toContain('admin.permissions.includes("support.write")');
    expect(page).toContain('admin.permissions.includes("users.read.basic")');
    expect(operations).toContain("حالت فقط مشاهده");
  });

  it("supports only audited ticket actions with duplicate-submit protection", () => {
    const actions = source("app/support/[ticketId]/actions.ts");
    const operations = source("app/support/[ticketId]/TicketOperations.tsx");

    for (const action of ["add_note", "set_status", "set_priority", "set_assignee"]) {
      expect(actions).toContain(action);
    }
    expect(operations).toContain('name="idempotencyKey"');
    expect(operations).toContain("disabled={pending}");
    expect(actions).toContain("performSupportTicketAction");
    expect(actions).toContain("revalidatePath(`/support/${ticketId}`)");
  });

  it("keeps internal note copy explicitly privacy-minimized", () => {
    const page = source("app/support/[ticketId]/page.tsx");
    const operations = source("app/support/[ticketId]/TicketOperations.tsx");

    expect(page).toContain("متن خام گفتگو، فایل ضمیمه، شماره تماس، داده درمانی و Women Health");
    expect(page).toContain("privacy-minimized");
    expect(operations).toContain("Audit metadata کپی نمی‌شود");
    expect(operations).toContain("اطلاعات سلامت، تماس یا جزئیات حساس غیرضروری");
  });

  it("uses server-paginated timeline and readable transition labels", () => {
    const page = source("app/support/[ticketId]/page.tsx");

    expect(page).toContain("AdminPagination");
    expect(page).toContain("eventPageHref(ticketId, data.page - 1)");
    expect(page).toContain("eventPageHref(ticketId, data.page + 1)");
    expect(page).toContain("eventLabels[event.eventType]");
    expect(page).toContain("event.fromValue");
    expect(page).toContain("event.toValue");
  });

  it("keeps polished RTL visuals accessible and motion-aware", () => {
    const page = source("app/support/[ticketId]/page.tsx");
    const css = source("app/support/[ticketId]/ticket-detail.module.css");

    expect(page).toContain('aria-labelledby="support-timeline-title"');
    expect(css).toContain("var(--lm-green)");
    expect(css).toContain("var(--lm-orange)");
    expect(css).toContain("var(--lm-violet)");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("max-width: 680px");
    expect(css).toContain("prefers-reduced-motion");
  });
});
