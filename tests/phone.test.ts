import { describe, expect, it } from "vitest";

import { normalizeAdminPhone } from "../src/lib/auth/phone";

describe("admin phone normalization", () => {
  it("normalizes Iranian local numbers to E.164", () => {
    expect(normalizeAdminPhone("0912 123 4567")).toBe("+989121234567");
  });

  it("accepts an already-valid international number", () => {
    expect(normalizeAdminPhone("+994501234567")).toBe("+994501234567");
  });

  it("rejects ambiguous invalid input", () => {
    expect(normalizeAdminPhone("12345")).toBeNull();
  });
});
