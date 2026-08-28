import { describe, expect, it } from "vitest";

import { privacyRetireIdempotencyKey } from "../src/lib/admin-api/privacy-idempotency";

const input = {
  documentId: "33333333-3333-4333-8333-333333333333",
  expectedUpdatedAt: "2026-08-28T07:24:11.000Z",
  reasonCode: "superseded_version",
};

describe("privacy retire idempotency", () => {
  it("is stable for retries of the same optimistic-concurrency request", () => {
    expect(privacyRetireIdempotencyKey(input)).toBe(privacyRetireIdempotencyKey(input));
    expect(privacyRetireIdempotencyKey(input)).toMatch(/^[A-Za-z0-9._:-]{8,180}$/);
  });

  it("changes when the optimistic version changes", () => {
    expect(
      privacyRetireIdempotencyKey({
        ...input,
        expectedUpdatedAt: "2026-08-28T07:25:11.000Z",
      }),
    ).not.toBe(privacyRetireIdempotencyKey(input));
  });
});
