const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StaffMutationAction = "activate" | "disable" | "reenable" | "assign" | "revoke";

export type StaffMutationExpectation = {
  accountId: string;
  action: StaffMutationAction;
  roleCode: string | null;
};

export type StaffMutationSuccess = {
  accountId: string;
  action: StaffMutationAction;
  roleCode: string | null;
  status: string | null;
  previousStatus: string | null;
  noop: boolean;
  replayed: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameUuid(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" &&
    UUID.test(value) &&
    UUID.test(expected) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

function expectedMembershipState(action: StaffMutationAction) {
  if (action === "activate") {
    return { status: "Active", previous: new Set<string | null>([null, "Active"]) };
  }
  if (action === "disable") {
    return { status: "Disabled", previous: new Set<string | null>(["Active", "Disabled"]) };
  }
  if (action === "reenable") {
    return { status: "Active", previous: new Set<string | null>(["Active", "Disabled"]) };
  }
  return null;
}

export function parseStaffMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: StaffMutationExpectation,
): StaffMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    body.httpStatus !== httpStatus ||
    body.code !== "ok" ||
    !sameUuid(body.accountId, expectation.accountId) ||
    typeof body.noop !== "boolean" ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  const membership = expectedMembershipState(expectation.action);
  if (membership) {
    if (httpStatus !== 200 && !(expectation.action === "activate" && httpStatus === 201))
      return null;
    const previousStatus = body.previousStatus === null ? null : body.previousStatus;
    if (
      typeof body.status !== "string" ||
      body.status !== membership.status ||
      (previousStatus !== null && typeof previousStatus !== "string") ||
      !membership.previous.has(previousStatus as string | null)
    ) {
      return null;
    }
    return {
      accountId: String(body.accountId),
      action: expectation.action,
      roleCode: null,
      status: body.status,
      previousStatus: previousStatus as string | null,
      noop: body.noop,
      replayed: body.replayed,
    };
  }

  if (
    httpStatus !== 200 ||
    expectation.roleCode === null ||
    body.action !== expectation.action ||
    typeof body.roleCode !== "string" ||
    body.roleCode.toLowerCase() !== expectation.roleCode.toLowerCase()
  ) {
    return null;
  }

  return {
    accountId: String(body.accountId),
    action: expectation.action,
    roleCode: body.roleCode,
    status: null,
    previousStatus: null,
    noop: body.noop,
    replayed: body.replayed,
  };
}
