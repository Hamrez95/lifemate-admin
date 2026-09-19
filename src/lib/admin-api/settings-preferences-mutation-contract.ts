export type CommandCenterPreferencesMutationExpectation = {
  locale: string;
  timeZone: string;
  displayName: string;
  expectedVersion: number;
};

export type CommandCenterPreferencesMutationSuccess = {
  locale: string;
  timeZone: string;
  displayName: string;
  version: number;
  updatedAtUtc: string;
  replayed: boolean;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function instant(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function parseCommandCenterPreferencesMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: CommandCenterPreferencesMutationExpectation,
): CommandCenterPreferencesMutationSuccess | null {
  const body = record(value);
  const preferences = record(body?.preferences);
  const expectedVersion = expected.expectedVersion + 1;

  if (
    httpStatus !== 200 ||
    !body ||
    !preferences ||
    preferences.locale !== expected.locale ||
    preferences.timeZone !== expected.timeZone.trim() ||
    preferences.displayName !== expected.displayName.trim() ||
    !Number.isSafeInteger(expectedVersion) ||
    preferences.version !== expectedVersion ||
    !instant(preferences.updatedAtUtc) ||
    typeof body.replayed !== "boolean"
  ) {
    return null;
  }

  return {
    locale: preferences.locale as string,
    timeZone: preferences.timeZone as string,
    displayName: preferences.displayName as string,
    version: Number(preferences.version),
    updatedAtUtc: preferences.updatedAtUtc,
    replayed: body.replayed,
  };
}
