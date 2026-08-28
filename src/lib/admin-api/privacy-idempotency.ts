const IDEMPOTENCY_SAFE = /[^A-Za-z0-9._:-]/g;

export function privacyRetireIdempotencyKey(input: {
  documentId: string;
  expectedUpdatedAt: string;
  reasonCode: string;
}): string {
  const stable =
    `privacy-retire:${input.documentId}:${input.expectedUpdatedAt}:${input.reasonCode}`.replace(
      IDEMPOTENCY_SAFE,
      "_",
    );
  return stable.slice(0, 180);
}
