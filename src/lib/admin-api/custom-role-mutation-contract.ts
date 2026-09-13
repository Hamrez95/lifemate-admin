export type CustomRoleMutationExpectation =
  | {
      kind: "create";
      roleCode: string;
      displayName: string;
      rank: number;
    }
  | {
      kind: "update";
      roleCode: string;
      displayName: string;
      rank: number;
      expectedVersion: number;
    }
  | {
      kind: "retire";
      roleCode: string;
      expectedVersion: number;
    }
  | {
      kind: "permission";
      roleCode: string;
      permissionCode: string;
      action: "assign" | "revoke";
      expectedVersion: number;
    };

export type CustomRoleMutationSuccess = {
  replayed: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameCode(value: unknown, expected: string): boolean {
  return (
    typeof value === "string" &&
    value.trim().toLowerCase() === expected.trim().toLowerCase()
  );
}

function positiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 1 ? Number(value) : null;
}

export function parseCustomRoleMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: CustomRoleMutationExpectation,
): CustomRoleMutationSuccess | null {
  const body = record(value);
  if (
    !body ||
    body.httpStatus !== httpStatus ||
    body.code !== "ok" ||
    !sameCode(body.roleCode, expectation.roleCode) ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  const version = positiveInteger(body.version);
  if (version === null) return null;

  if (expectation.kind === "create") {
    if (
      httpStatus !== 201 ||
      body.status !== "Active" ||
      version !== 1 ||
      body.displayName !== expectation.displayName ||
      body.rank !== expectation.rank
    ) {
      return null;
    }
    return { replayed: body.replayed };
  }

  if (expectation.kind === "update") {
    if (
      httpStatus !== 200 ||
      (body.status !== "Active" && body.status !== "Disabled") ||
      version !== expectation.expectedVersion + 1 ||
      body.displayName !== expectation.displayName ||
      body.rank !== expectation.rank
    ) {
      return null;
    }
    return { replayed: body.replayed };
  }

  if (typeof body.noop !== "boolean" || httpStatus !== 200) return null;

  const expectedVersion = expectation.expectedVersion + (body.noop ? 0 : 1);
  if (version !== expectedVersion) return null;

  if (expectation.kind === "retire") {
    if (body.status !== "Disabled") return null;
    return { replayed: body.replayed };
  }

  if (
    !sameCode(body.permissionCode, expectation.permissionCode) ||
    body.action !== expectation.action
  ) {
    return null;
  }

  return { replayed: body.replayed };
}
