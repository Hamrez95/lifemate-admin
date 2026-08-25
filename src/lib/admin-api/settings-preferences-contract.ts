export type CommandCenterPreferences = {
  locale: string;
  timeZone: string;
  displayName: string;
  version: number;
  updatedAtUtc: string | null;
};

export type CommandCenterPreferencesResponse = {
  preferences: CommandCenterPreferences;
  supportedLocales: string[];
};

export function parseCommandCenterPreferencesResponse(value: unknown): CommandCenterPreferencesResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const preferencesValue = body.preferences;
  const capabilitiesValue = body.capabilities;
  if (!preferencesValue || typeof preferencesValue !== "object" || Array.isArray(preferencesValue)) return null;
  if (!capabilitiesValue || typeof capabilitiesValue !== "object" || Array.isArray(capabilitiesValue)) return null;

  const preferences = preferencesValue as Record<string, unknown>;
  const capabilities = capabilitiesValue as Record<string, unknown>;
  if (
    typeof preferences.locale !== "string" ||
    typeof preferences.timeZone !== "string" ||
    typeof preferences.displayName !== "string" ||
    !Number.isInteger(preferences.version) ||
    Number(preferences.version) < 1 ||
    (preferences.updatedAtUtc !== null && typeof preferences.updatedAtUtc !== "string")
  ) return null;

  const supportedLocales = capabilities.supportedLocales;
  const mutableFields = capabilities.mutableFields;
  if (
    !Array.isArray(supportedLocales) ||
    !supportedLocales.every((item) => typeof item === "string") ||
    !Array.isArray(mutableFields) ||
    !mutableFields.every((item) => typeof item === "string") ||
    capabilities.secretsEditable !== false
  ) return null;

  const requiredFields = ["locale", "timeZone", "displayName"];
  if (!requiredFields.every((field) => mutableFields.includes(field))) return null;

  return {
    preferences: preferences as CommandCenterPreferences,
    supportedLocales,
  };
}
