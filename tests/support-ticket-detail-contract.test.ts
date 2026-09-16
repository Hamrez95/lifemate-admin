import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseSupportTicketActionSuccess } from "../src/lib/admin-api/support-ticket-action-contract";

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
    expect(client).toContain("parseSupportTicketActionSuccess");
    expect(client).toContain("response.json().catch(() => null)");
    expect(client).not.toContain(".from(");
    expect(client).not.toContain("service_role");
  });

  it("binds mutation success to the exact ticket, action and requested target state", () => {
    const ticketId = "123e4567-e89b-42d3-a456-426614174000";
    const assignee = "123e4567-e89b-42d3-a456-426614174001";
    const otherAssignee = "123e4567-e89b-42d3-a456-426614174002";
    const canonical = {
      ticketId,
      status: "Resolved",
      priority: "High",
      assignedAdminAccountId: assignee,
      lastActivityAtUtc: "2026-09-16T12:00:00.000Z",
      action: "set_status",
      replayed: false,
    };

    expect(
      parseSupportTicketActionSuccess(canonical, 200, {
        ticketId,
        action: "set_status",
        status: "Resolved",
      }),
    ).toEqual(canonical);
    expect(
      parseSupportTicketActionSuccess(
        { ...canonical, ticketId: assignee },
        200,
        {
          ticketId,
          action: "set_status",
          status: "Resolved",
        },
      ),
    ).toBeNull();
    expect(
      parseSupportTicketActionSuccess(
        { ...canonical, action: "set_priority" },
        200,
        {
          ticketId,
          action: "set_status",
          status: "Resolved",
        },
      ),
    ).toBeNull();
    expect(
      parseSupportTicketActionSuccess(
        { ...canonical, status: "Pending" },
        200,
        {
          ticketId,
          action: "set_status",
          status: "Resolved",
        },
      ),
    ).toBeNull();
    expect(
      parseSupportTicketActionSuccess(
        { ...canonical, action: "set_priority", priority: "High" },
        200,
        { ticketId, action: "set_priority", priority: "Urgent" },
      ),
    ).toBeNull();
    expect(
      parseSupportTicketActionSuccess(
        { ...canonical, action: "set_assignee" },
        200,
        { ticketId, action: "set_assignee", assigneeAccountId: assignee },
      ),
    ).not.toBeNull();
    expect(
      parseSupportTicketActionSuccess(
        { ...canonical, action: "set_assignee", assignedAdminAccountId: otherAssignee },
        200,
        { ticketId, action: "set_assignee", assigneeAccountId: assignee },
      ),
    ).toBeNull();
    expect(
      parseSupportTicketActionSuccess(
        { ...canonical, action: "set_assignee", assignedAdminAccountId: assignee },
        200,
        { ticketId, action: "set_assignee", assigneeAccountId: null },
      ),
    ).toBeNull();
  });

  it("fails closed on non-canonical HTTP success and malformed replay or timestamps", () => {
    const ticketId = "123e4567-e89b-42d3-a456-426614174000";
    const canonical = {
      ticketId,
      status: "Resolved",
      priority: "High",
      assignedAdminAccountId: null,
      lastActivityAtUtc: "2026-09-16T12:00:00.000Z",
      action: "add_note",
      replayed: false,
    };
    const expected = { ticketId, action: "add_note" } as const;

    expect(parseSupportTicketActionSuccess(canonical, 201, expected)).toBeNull();
    expect(
      parseSupportTicketActionSuccess({ ...canonical, replayed: "false" }, 200, expected),
    ).toBeNull();
    expect(
      parseSupportTicketActionSuccess(
        { ...canonical, lastActivityAtUtc: "not-a-date" },
        200,
        expected,
      ),
    ).toBeNull();
    expect(parseSupportTicketActionSuccess(null, 200, expected)).toBeNull();
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