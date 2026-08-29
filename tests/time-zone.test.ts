import { describe, expect, it } from "vitest";

import {
  DEFAULT_ADMIN_LOCALE,
  formatAdminDate,
  formatAdminDateTime,
  localDateTimeToUtc,
  tehranDayBoundaryToUtc,
  tehranLocalDateTimeToUtc,
} from "../src/lib/time-zone";

describe("timezone conversion", () => {
  it("converts a Tehran operator local datetime to the correct UTC instant", () => {
    expect(tehranLocalDateTimeToUtc("2026-08-15T09:30")).toBe("2026-08-15T06:00:00.000Z");
  });

  it("keeps Tehran calendar day boundaries aligned to the operator day", () => {
    expect(tehranDayBoundaryToUtc("2026-08-15", "start")).toBe("2026-08-14T20:30:00.000Z");
    expect(tehranDayBoundaryToUtc("2026-08-15", "end")).toBe("2026-08-15T20:29:59.999Z");
  });

  it("rejects malformed local date-time values", () => {
    expect(() => localDateTimeToUtc("2026-08-15 09:30", "Asia/Tehran")).toThrow(RangeError);
  });
});

describe("Persian Admin presentation", () => {
  it("uses the Persian calendar as the single Admin locale", () => {
    expect(DEFAULT_ADMIN_LOCALE).toContain("ca-persian");
  });

  it("renders a known Gregorian instant as a Jalali date", () => {
    const rendered = formatAdminDate("2026-08-29T12:00:00.000Z");
    expect(rendered).toContain("1405");
    expect(rendered).not.toContain("2026");
  });

  it("renders Admin date-time in Tehran using the Jalali calendar", () => {
    const rendered = formatAdminDateTime("2026-08-29T12:00:00.000Z");
    expect(rendered).toContain("1405");
    expect(rendered).toMatch(/15:30|۱۵:۳۰/);
  });
});
