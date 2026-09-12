export type CommercePaymentMutationSuccess = {
  code: string;
  replayed: boolean;
  message?: string;
};

export function parseCommercePaymentMutationSuccess(
  value: unknown,
): CommercePaymentMutationSuccess | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (!Number.isInteger(body.httpStatus)) return null;
  const httpStatus = Number(body.httpStatus);
  if (httpStatus < 200 || httpStatus >= 300) return null;
  if (typeof body.code !== "string" || body.code.trim().length === 0) return null;
  if (typeof body.replayed !== "boolean") return null;
  if (body.message !== undefined && typeof body.message !== "string") return null;
  return {
    code: body.code,
    replayed: body.replayed,
    ...(typeof body.message === "string" ? { message: body.message } : {}),
  };
}
