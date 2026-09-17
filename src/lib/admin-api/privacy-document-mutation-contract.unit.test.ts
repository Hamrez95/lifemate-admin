import { describe, expect, it } from "vitest";

import { isPrivacyDocumentMutationSuccess } from "./privacy-document-mutation-contract";

const DOCUMENT_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_DOCUMENT_ID = "123e4567-e89b-42d3-a456-426614174001";

describe("privacy document mutation success contract", () => {
  it("accepts only the canonical create draft envelope", () => {
    const body = {
      httpStatus: 201,
      code: "ok",
      documentId: DOCUMENT_ID,
      status: "Draft",
      updatedAtUtc: "2026-09-16T14:00:00.000Z",
      replayed: false,
    };

    expect(isPrivacyDocumentMutationSuccess(body, 201, { kind: "create" })).toBe(true);
    expect(
      isPrivacyDocumentMutationSuccess({ ...body, status: "Active" }, 201, { kind: "create" }),
    ).toBe(false);
    expect(isPrivacyDocumentMutationSuccess(body, 200, { kind: "create" })).toBe(false);
  });

  it("binds publish success to the exact document and Active state", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      documentId: DOCUMENT_ID,
      status: "Active",
      updatedAtUtc: "2026-09-16T14:01:00.000Z",
      replayed: true,
    };

    expect(
      isPrivacyDocumentMutationSuccess(body, 200, {
        kind: "publish",
        documentId: DOCUMENT_ID,
      }),
    ).toBe(true);
    expect(
      isPrivacyDocumentMutationSuccess({ ...body, documentId: OTHER_DOCUMENT_ID }, 200, {
        kind: "publish",
        documentId: DOCUMENT_ID,
      }),
    ).toBe(false);
    expect(
      isPrivacyDocumentMutationSuccess({ ...body, status: "Draft" }, 200, {
        kind: "publish",
        documentId: DOCUMENT_ID,
      }),
    ).toBe(false);
  });

  it("binds retire success to the exact document and retirement metadata", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      documentId: DOCUMENT_ID,
      status: "Retired",
      retiredAtUtc: "2026-09-16T14:02:00.000Z",
      updatedAtUtc: "2026-09-16T14:02:00.000Z",
      noop: false,
      replayed: false,
    };

    expect(
      isPrivacyDocumentMutationSuccess(body, 200, {
        kind: "retire",
        documentId: DOCUMENT_ID,
      }),
    ).toBe(true);
    expect(
      isPrivacyDocumentMutationSuccess({ ...body, retiredAtUtc: "invalid" }, 200, {
        kind: "retire",
        documentId: DOCUMENT_ID,
      }),
    ).toBe(false);
    expect(
      isPrivacyDocumentMutationSuccess({ ...body, noop: "false" }, 200, {
        kind: "retire",
        documentId: DOCUMENT_ID,
      }),
    ).toBe(false);
  });

  it("fails closed on malformed success envelopes", () => {
    const body = {
      httpStatus: 200,
      code: "ok",
      documentId: DOCUMENT_ID,
      status: "Active",
      updatedAtUtc: "2026-09-16T14:01:00.000Z",
      replayed: false,
    };
    const expected = { kind: "publish", documentId: DOCUMENT_ID } as const;

    expect(isPrivacyDocumentMutationSuccess({ ...body, httpStatus: 201 }, 200, expected)).toBe(
      false,
    );
    expect(isPrivacyDocumentMutationSuccess({ ...body, code: "accepted" }, 200, expected)).toBe(
      false,
    );
    expect(isPrivacyDocumentMutationSuccess({ ...body, replayed: "false" }, 200, expected)).toBe(
      false,
    );
    expect(
      isPrivacyDocumentMutationSuccess({ ...body, updatedAtUtc: "invalid" }, 200, expected),
    ).toBe(false);
    expect(isPrivacyDocumentMutationSuccess(null, 200, expected)).toBe(false);
  });
});
