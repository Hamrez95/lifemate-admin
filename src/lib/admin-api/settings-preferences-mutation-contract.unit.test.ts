import { describe, expect, it } from "vitest";

import { parseCommandCenterPreferencesMutationSuccess } from "./settings-preferences-mutation-contract";

const EXPECTED = {
  locale: "fa-IR",
  timeZone: "  Asia/Tehran ",
  displayName: "  LifeMate Command Center ",
  expectedVersion: 4,
};

const SUCCESS = {
  preferences: {
    locale: "fa-IR",
    timeZone: "Asia/Tehran",
    displayName: "LifeMate Command Center",
    version: 5,
    updatedAtUtc: "2026-09-19T09:00:00.000Z",
  },
  replayed: false,
};

describe("command center preference mutation success contract", () => {
  it("accepts canonical HTTP 200 bound to normalized requested values and next version", () => {
    expect(parseCommandCenterPreferencesMutationSuccess(SUCCESS, 200, EXPECTED)).toEqual({
      ...SUCCESS.preferences,
      replayed: false,
    });
  });

  it("accepts an idempotent replay only when the same canonical result is returned", () => {
    expect(
      parseCommandCenterPreferencesMutationSuccess({ ...SUCCESS, replayed: true }, 200, EXPECTED)
        ?.replayed,
    ).toBe(true);
  });

  it("fails closed on wrong state, version or HTTP status", () => {
    expect(
      parseCommandCenterPreferencesMutationSuccess(
        {
          ...SUCCESS,
          preferences: { ...SUCCESS.preferences, locale: "en-US" },
        },
        200,
        EXPECTED,
      ),
    ).toBeNull();
    expect(
      parseCommandCenterPreferencesMutationSuccess(
        {
          ...SUCCESS,
          preferences: { ...SUCCESS.preferences, version: 4 },
        },
        200,
        EXPECTED,
      ),
    ).toBeNull();
    expect(parseCommandCenterPreferencesMutationSuccess(SUCCESS, 201, EXPECTED)).toBeNull();
  });

  it("fails closed on malformed timestamps and replay metadata", () => {
    expect(
      parseCommandCenterPreferencesMutationSuccess(
        {
          ...SUCCESS,
          preferences: { ...SUCCESS.preferences, updatedAtUtc: "not-a-date" },
        },
        200,
        EXPECTED,
      ),
    ).toBeNull();
    expect(
      parseCommandCenterPreferencesMutationSuccess(
        { ...SUCCESS, replayed: "false" },
        200,
        EXPECTED,
      ),
    ).toBeNull();
    expect(parseCommandCenterPreferencesMutationSuccess(null, 200, EXPECTED)).toBeNull();
  });
});
