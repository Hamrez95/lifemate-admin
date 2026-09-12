import { parseCommercePaymentMutationSuccess } from "./commerce-payment-mutation-contract";

export type GiftTestFinalizeSuccess = {
  giftIntentId: string;
  status: string;
  replayed: boolean;
};

export function parseGiftTestFinalizeSuccess(
  value: unknown,
  expectedGiftIntentId: string,
): GiftTestFinalizeSuccess | null {
  const generic = parseCommercePaymentMutationSuccess(value);
  if (!generic || generic.code !== "ok") return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const body = value as Record<string, unknown>;
  if (body.giftIntentId !== expectedGiftIntentId) return null;
  if (typeof body.status !== "string" || body.status.trim().length === 0 || body.status.length > 64) {
    return null;
  }

  return {
    giftIntentId: expectedGiftIntentId,
    status: body.status,
    replayed: generic.replayed,
  };
}
