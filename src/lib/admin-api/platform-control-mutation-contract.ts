export type PlatformControlMutationExpectation =
  | {
      kind: "control-create";
      controlKey: string;
      controlKind: "FeatureFlag" | "Config";
      valueType: "Boolean" | "Integer" | "String" | "Json";
    }
  | {
      kind: "control-update";
      controlKey: string;
      expectedVersion: number;
      status: "Active" | "Retired";
      description: string;
      failClosed: boolean;
    }
  | {
      kind: "rule-create";
      controlKey: string;
      priority: number;
      targetType: "Global" | "Product" | "Segment" | "Percentage" | "Beta" | "Account";
      status: "Active" | "Disabled" | "Retired";
    }
  | {
      kind: "rule-update";
      ruleId: string;
      expectedVersion: number;
      priority: number;
      targetType: "Global" | "Product" | "Segment" | "Percentage" | "Beta" | "Account";
      status: "Active" | "Disabled" | "Retired";
    }
  | { kind: "rollback"; controlKey: string; expectedVersion: number }
  | { kind: "kill-switch"; controlKey: string; expectedVersion: number };

export type PlatformControlMutationSuccess = {
  replayed: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function sameKey(value: unknown, expected: string): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === expected.trim().toLowerCase();
}

function positiveInteger(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 1 ? Number(value) : null;
}

export function parsePlatformControlMutationSuccess(
  value: unknown,
  httpStatus: number,
  expectation: PlatformControlMutationExpectation,
): PlatformControlMutationSuccess | null {
  const body = record(value);
  const item = record(body?.item);
  if (!body || !item || typeof body.replayed !== "boolean") return null;

  const version = positiveInteger(item.version);
  if (version === null) return null;

  if (expectation.kind === "control-create") {
    if (
      httpStatus !== 201 ||
      !sameKey(item.control_key, expectation.controlKey) ||
      item.control_kind !== expectation.controlKind ||
      item.value_type !== expectation.valueType ||
      item.status !== "Active" ||
      version !== 1
    ) {
      return null;
    }
    return { replayed: body.replayed };
  }

  if (expectation.kind === "control-update") {
    if (
      httpStatus !== 200 ||
      !sameKey(item.control_key, expectation.controlKey) ||
      item.status !== expectation.status ||
      item.description !== expectation.description ||
      item.fail_closed !== expectation.failClosed ||
      version !== expectation.expectedVersion + 1
    ) {
      return null;
    }
    return { replayed: body.replayed };
  }

  if (expectation.kind === "rule-create") {
    if (
      httpStatus !== 201 ||
      typeof item.id !== "string" ||
      !UUID.test(item.id) ||
      !sameKey(item.control_key, expectation.controlKey) ||
      item.priority !== expectation.priority ||
      item.target_type !== expectation.targetType ||
      item.status !== expectation.status ||
      version !== 1
    ) {
      return null;
    }
    return { replayed: body.replayed };
  }

  if (expectation.kind === "rule-update") {
    if (
      httpStatus !== 200 ||
      typeof item.id !== "string" ||
      item.id.toLowerCase() !== expectation.ruleId.toLowerCase() ||
      item.priority !== expectation.priority ||
      item.target_type !== expectation.targetType ||
      item.status !== expectation.status ||
      version !== expectation.expectedVersion + 1
    ) {
      return null;
    }
    return { replayed: body.replayed };
  }

  if (
    httpStatus !== 200 ||
    !sameKey(item.control_key, expectation.controlKey) ||
    version !== expectation.expectedVersion + 1
  ) {
    return null;
  }

  if (expectation.kind === "kill-switch") {
    if (item.default_value !== false || item.fail_closed !== true) return null;
  }

  return { replayed: body.replayed };
}
