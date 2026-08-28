const IDEMPOTENCY_SAFE = /[^A-Za-z0-9._:-]/g;

function stableKey(value: string): string {
  return value.replace(IDEMPOTENCY_SAFE, "_").slice(0, 180);
}

export function privacyCreateIdempotencyKey(input: {
  purpose: string;
  version: string;
  jurisdiction: string;
  documentHash: string;
  effectiveAtUtc: string;
  reasonCode: string;
}): string {
  return stableKey(
    `privacy-create:${input.purpose}:${input.version}:${input.jurisdiction}:${input.documentHash}:${input.effectiveAtUtc}:${input.reasonCode}`,
  );
}

export function privacyPublishIdempotencyKey(input: {
  documentId: string;
  expectedUpdatedAt: string;
  reasonCode: string;
}): string {
  return stableKey(
    `privacy-publish:${input.documentId}:${input.expectedUpdatedAt}:${input.reasonCode}`,
  );
}

export function privacyRetireIdempotencyKey(input: {
  documentId: string;
  expectedUpdatedAt: string;
  reasonCode: string;
}): string {
  return stableKey(
    `privacy-retire:${input.documentId}:${input.expectedUpdatedAt}:${input.reasonCode}`,
  );
}
