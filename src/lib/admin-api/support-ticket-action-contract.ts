export type SupportTicketActionExpectation =
  | { ticketId: string; action: "add_note" }
  | { ticketId: string; action: "set_status"; status: string }
  | { ticketId: string; action: "set_priority"; priority: string }
  | { ticketId: string; action: "set_assignee"; assigneeAccountId: string | null };

export type SupportTicketActionSuccess = {
  ticketId: string;
  status: string;
  priority: string;
  assignedAdminAccountId: string | null;
  lastActivityAtUtc: string;
  action: "add_note" | "set_status" | "set_priority" | "set_assignee";
  replayed: boolean;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(["Open", "Pending", "WaitingOnUser", "Resolved", "Closed"]);
const PRIORITIES = new Set(["Low", "Normal", "High", "Urgent"]);

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameNullableUuid(value: unknown, expected: string | null): boolean {
  if (expected === null) return value === null;
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

export function parseSupportTicketActionSuccess(
  value: unknown,
  expected: SupportTicketActionExpectation,
): SupportTicketActionSuccess | null {
  const body = record(value);
  if (
    !body ||
    typeof body.ticketId !== "string" ||
    !UUID_PATTERN.test(body.ticketId) ||
    body.ticketId.toLowerCase() !== expected.ticketId.toLowerCase() ||
    typeof body.status !== "string" ||
    !STATUSES.has(body.status) ||
    typeof body.priority !== "string" ||
    !PRIORITIES.has(body.priority) ||
    !(
      body.assignedAdminAccountId === null ||
      (typeof body.assignedAdminAccountId === "string" &&
        UUID_PATTERN.test(body.assignedAdminAccountId))
    ) ||
    typeof body.lastActivityAtUtc !== "string" ||
    Number.isNaN(Date.parse(body.lastActivityAtUtc)) ||
    body.action !== expected.action ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  if (expected.action === "set_status" && body.status !== expected.status) return null;
  if (expected.action === "set_priority" && body.priority !== expected.priority) return null;
  if (
    expected.action === "set_assignee" &&
    !sameNullableUuid(body.assignedAdminAccountId, expected.assigneeAccountId)
  ) {
    return null;
  }

  return body as unknown as SupportTicketActionSuccess;
}
