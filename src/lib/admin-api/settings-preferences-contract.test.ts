import { describe, expect, it } from "vitest";

import { parseCommandCenterPreferencesResponse } from "./settings-preferences-contract";

const valid = {
  preferences: {
    locale: "fa-IR",
    timeZone: "Asia/Tehran",
    displayName: "LifeMate Command Center",
    version: 3,
    updatedAtUtc: "2026-08-25T22:20:00.000Z",
  },
  capabilities: {
    mutableFields: ["locale", "timeZone", "displayName"],
    supportedLocales: ["fa-IR", "en-US"],
    timeZoneValidation: "iana",
    secretsEditable: false,
  },
};

describe("parseCommandCenterPreferencesResponse", () => {
  it("accepts the canonical bounded settings shape", () => {
    expect(parseCommandCenterPreferencesResponse(valid)).toEqual({
      preferences: valid.preferences,
      supportedLocales: ["fa-IR", "en-US"],
    });
  });

  it("rejects malformed versions and capabilities fail-closed", () => {
    expect(
      parseCommandCenterPreferencesResponse({
        ...valid,
        preferences: { ...valid.preferences, version: 0 },
      }),
    ).toBeNull();
    expect(
      parseCommandCenterPreferencesResponse({
        ...valid,
        capabilities: { ...valid.capabilities, secretsEditable: true },
      }),
    ).toBeNull();
    expect(
      parseCommandCenterPreferencesResponse({
        ...valid,
        capabilities: { ...valid.capabilities, mutableFields: ["locale", "apiKey"] },
      }),
    ).toBeNull();
  });

  it("does not invent timestamps or missing mutable fields", () => {
    expect(
      parseCommandCenterPreferencesResponse({
        ...valid,
        preferences: { ...valid.preferences, updatedAtUtc: undefined },
      }),
    ).toBeNull();
    expect(
      parseCommandCenterPreferencesResponse({
        ...valid,
        capabilities: { ...valid.capabilities, supportedLocales: "fa-IR" },
      }),
    ).toBeNull();
  });
});
