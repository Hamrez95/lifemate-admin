import { describe, expect, it } from "vitest";

import {
  privacyCreateIdempotencyKey,
  privacyPublishIdempotencyKey,
  privacyRetireIdempotencyKey,
} from "@/src/lib/admin-api/privacy-idempotency";

describe("privacy control idempotency", () => {
  it("keeps document creation retries stable while including the canonical version inputs", () => {
    const input = {
      purpose: "privacy_notice",
      version: "2026.08",
      jurisdiction: "GLOBAL",
      documentHash: "a".repeat(64),
      effectiveAtUtc: "2026-08-28T09:00:00.000Z",
      reasonCode: "new_legal_version",
    };

    const first = privacyCreateIdempotencyKey(input);
    const second = privacyCreateIdempotencyKey(input);
    expect(first).toBe(second);
    expect(first.length).toBeLessThanOrEqual(180);
    expect(first).toContain("privacy-create:privacy_notice:2026.08:GLOBAL");
  });

  it("separates publish and retire operations for the same document version", () => {
    const input = {
      documentId: "4dc1fd70-7bc0-4d48-aabe-f0e44d7a4ec1",
      expectedUpdatedAt: "2026-08-28T09:00:00.000Z",
      reasonCode: "superseded_version",
    };

    expect(privacyPublishIdempotencyKey(input)).not.toBe(privacyRetireIdempotencyKey(input));
  });
});
