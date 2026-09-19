export type ExperimentMutationExpectation =
  | { kind: "create"; experimentKey: string }
  | {
      kind: "set-status";
      experimentKey: string;
      status: string;
      expectedVersion: number;
    };

export type ExperimentMutationSuccess = {
  experimentKey: string;
  status: string;
  version: number;
  replayed: boolean;
};

const KEY = /^[a-z][a-z0-9._-]{2,95}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function canonicalKey(value: string): string | null {
  const key = value.trim().toLowerCase();
  return KEY.test(key) ? key : null;
}

export function parseExperimentMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: ExperimentMutationExpectation,
): ExperimentMutationSuccess | null {
  const body = record(value);
  const experimentKey = canonicalKey(expected.experimentKey);
  if (
    !body ||
    !experimentKey ||
    body.experimentKey !== experimentKey ||
    !Number.isSafeInteger(body.version) ||
    typeof body.status !== "string" ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  if (expected.kind === "create") {
    if (
      httpStatus !== 201 ||
      body.httpStatus !== 201 ||
      body.code !== "created" ||
      body.status !== "Draft" ||
      body.version !== 1
    ) {
      return null;
    }
  } else {
    const nextVersion = expected.expectedVersion + 1;
    if (
      httpStatus !== 200 ||
      body.httpStatus !== 200 ||
      body.code !== "ok" ||
      body.status !== expected.status ||
      !Number.isSafeInteger(nextVersion) ||
      body.version !== nextVersion
    ) {
      return null;
    }
  }

  return {
    experimentKey,
    status: body.status,
    version: Number(body.version),
    replayed: body.replayed,
  };
}
