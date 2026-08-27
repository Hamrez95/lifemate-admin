"use server";

import { revalidatePath } from "next/cache";

import {
  openCommerceReconciliationCase,
  requestCommerceRefund,
  setCommerceRenewalIntent,
  type CommercePaymentMutationResult,
} from "@/src/lib/admin-api/commerce-payment-operations-v2";

export type CommerceOperationsActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialCommerceOperationsActionState: CommerceOperationsActionState = {
  status: "idle",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY = /^[A-Za-z0-9._:-]{8,180}$/;
const KEY = /^[a-z][a-z0-9._-]{2,79}$/;
const MAX_BIGINT = 9223372036854775807n;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function idempotency(formData: FormData): string | null {
  const value = text(formData, "idempotencyKey");
  return IDEMPOTENCY.test(value) ? value : null;
}

function reason(formData: FormData): string | null {
  const value = text(formData, "reason");
  return value.length >= 10 && value.length <= 1000 ? value : null;
}

function mapped(
  result: CommercePaymentMutationResult,
  success: string,
): CommerceOperationsActionState {
  if (result.kind === "ok") {
    return {
      status: "success",
      message: result.replayed ? `${success} (replay امن)` : success,
    };
  }
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? "مجوز این عملیات Commerce وجود ندارد."
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "invalid") {
    return { status: "invalid", message: result.message ?? "درخواست معتبر نیست." };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message: result.message ?? "وضعیت رکورد تغییر کرده است؛ داده را تازه کنید.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس Commerce در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس Commerce فعلاً در دسترس نیست.",
  };
}

function refresh() {
  revalidatePath("/commerce");
  revalidatePath("/commerce/operations");
  revalidatePath("/commerce/transactions");
  revalidatePath("/commerce/subscriptions");
}

export async function requestRefundAction(
  _previous: CommerceOperationsActionState,
  formData: FormData,
): Promise<CommerceOperationsActionState> {
  const idempotencyKey = idempotency(formData);
  const operationReason = reason(formData);
  if (!idempotencyKey) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  if (!operationReason) {
    return { status: "invalid", message: "دلیل باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }
  const transactionId = text(formData, "transactionId");
  const amountMinor = text(formData, "amountMinor");
  if (!UUID.test(transactionId)) {
    return { status: "invalid", message: "Transaction ID باید UUID معتبر باشد." };
  }
  if (!/^[1-9]\d{0,18}$/.test(amountMinor)) {
    return { status: "invalid", message: "مبلغ refund باید مقدار مثبت minor-unit باشد." };
  }
  try {
    if (BigInt(amountMinor) > MAX_BIGINT) throw new Error("overflow");
  } catch {
    return { status: "invalid", message: "مبلغ refund خارج از محدوده مجاز است." };
  }
  if (text(formData, "confirmation") !== "confirm-refund-request") {
    return { status: "invalid", message: "تأیید صریح درخواست refund لازم است." };
  }
  const state = mapped(
    await requestCommerceRefund({
      transactionId,
      amountMinor,
      reason: operationReason,
      idempotencyKey,
    }),
    "درخواست refund ثبت و وارد workflow بررسی شد.",
  );
  if (state.status === "success") refresh();
  return state;
}

export async function openReconciliationAction(
  _previous: CommerceOperationsActionState,
  formData: FormData,
): Promise<CommerceOperationsActionState> {
  const idempotencyKey = idempotency(formData);
  const operationReason = reason(formData);
  if (!idempotencyKey) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  if (!operationReason) {
    return { status: "invalid", message: "دلیل باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }
  const transactionRaw = text(formData, "transactionId");
  const transactionId = transactionRaw || null;
  const caseType = text(formData, "caseType");
  if (transactionId && !UUID.test(transactionId)) {
    return { status: "invalid", message: "Transaction ID باید UUID معتبر باشد." };
  }
  if (caseType.length < 5 || caseType.length > 40) {
    return { status: "invalid", message: "Case Type باید بین ۵ تا ۴۰ نویسه باشد." };
  }
  if (text(formData, "confirmation") !== "confirm-reconciliation-open") {
    return { status: "invalid", message: "تأیید صریح ایجاد reconciliation case لازم است." };
  }
  const state = mapped(
    await openCommerceReconciliationCase({
      transactionId,
      caseType,
      reason: operationReason,
      idempotencyKey,
    }),
    "Reconciliation case ثبت شد؛ provider facts بدون تغییر حفظ شدند.",
  );
  if (state.status === "success") refresh();
  return state;
}

export async function renewalIntentAction(
  _previous: CommerceOperationsActionState,
  formData: FormData,
): Promise<CommerceOperationsActionState> {
  const idempotencyKey = idempotency(formData);
  if (!idempotencyKey) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  const subscriptionId = text(formData, "subscriptionId");
  const expectedVersionRaw = text(formData, "expectedVersion");
  const reasonCode = text(formData, "reasonCode").toLowerCase();
  const reasonTextRaw = text(formData, "reasonText");
  if (!UUID.test(subscriptionId)) {
    return { status: "invalid", message: "Subscription ID باید UUID معتبر باشد." };
  }
  if (!/^\d+$/.test(expectedVersionRaw) || Number(expectedVersionRaw) < 1) {
    return { status: "invalid", message: "نسخه subscription معتبر نیست." };
  }
  const expectedVersion = Number(expectedVersionRaw);
  if (!Number.isSafeInteger(expectedVersion)) {
    return { status: "invalid", message: "نسخه subscription خارج از محدوده است." };
  }
  if (!KEY.test(reasonCode)) {
    return { status: "invalid", message: "Reason Code معتبر نیست." };
  }
  if (reasonTextRaw.length > 1000) {
    return { status: "invalid", message: "توضیح لغو بیش از حد طولانی است." };
  }
  if (text(formData, "confirmation") !== "confirm-renewal-intent") {
    return { status: "invalid", message: "تأیید صریح تغییر renewal intent لازم است." };
  }
  const cancelAtPeriodEnd = formData.get("cancelAtPeriodEnd") === "on";
  const state = mapped(
    await setCommerceRenewalIntent({
      subscriptionId,
      expectedVersion,
      cancelAtPeriodEnd,
      reasonCode,
      reasonText: reasonTextRaw || null,
      idempotencyKey,
    }),
    cancelAtPeriodEnd
      ? "تمدید خودکار متوقف شد؛ entitlement تا پایان دوره معتبر می‌ماند."
      : "Renewal intent برای ادامه تمدید ثبت شد.",
  );
  if (state.status === "success") refresh();
  return state;
}
