import { describe, expect, it } from "vitest";

import {
  formatPersianDate,
  formatPersianDateTime,
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

  it("renders Persian UI dates using the Jalali calendar", () => {
    const value = "2026-03-21T12:00:00.000Z";
    expect(formatPersianDate(value)).toContain("1405");
    expect(formatPersianDateTime(value)).toContain("1405");
  });

  it("returns a safe placeholder for invalid display dates", () => {
    expect(formatPersianDate("not-a-date")).toBe("—");
    expect(formatPersianDateTime(null)).toBe("—");
  });

  it("rejects malformed local date-time values", () => {
    expect(() => localDateTimeToUtc("2026-08-15 09:30", "Asia/Tehran")).toThrow(RangeError);
  });
});
