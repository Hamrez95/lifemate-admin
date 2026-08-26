import { describe, expect, it } from "vitest";

import { parseDailyBrief } from "./ai-daily-brief-contract";

const valid = {
  state: "partial",
  changes: [
    {
      id: "change:accounts_created",
      severity: "info",
      title: "تغییر مستند",
      detail: "بر پایه series canonical",
      evidenceIds: ["analytics:accounts_created:v1"],
    },
  ],
  attention: [],
  actions: [],
  evidence: [
    {
      id: "analytics:accounts_created:v1",
      metric: "accounts_created",
      value: 21,
      state: "partial",
      source: "identity.accounts.created_at_utc",
      freshness: { status: "partial", asOfUtc: "2026-08-25T22:00:00.000Z" },
      caveat: "Relational fallback caveat.",
    },
  ],
  caveats: ["No fabricated trends."],
  generatedAtUtc: "2026-08-25T22:30:00.000Z",
};

describe("parseDailyBrief", () => {
  it("accepts the bounded evidence-backed Daily Brief shape", () => {
    expect(parseDailyBrief(valid)).toEqual(valid);
  });

  it("rejects malformed evidence and item references fail-closed", () => {
    expect(
      parseDailyBrief({
        ...valid,
        evidence: [{ ...valid.evidence[0], value: "21" }],
      }),
    ).toBeNull();
    expect(
      parseDailyBrief({
        ...valid,
        changes: [{ ...valid.changes[0], evidenceIds: "analytics:accounts_created:v1" }],
      }),
    ).toBeNull();
  });

  it("rejects fabricated or unsupported state values", () => {
    expect(parseDailyBrief({ ...valid, state: "healthy" })).toBeNull();
    expect(parseDailyBrief({ ...valid, caveats: [null] })).toBeNull();
  });
});
