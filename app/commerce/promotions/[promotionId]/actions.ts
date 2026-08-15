"use server";

import { revalidatePath } from "next/cache";

import {
  setCommercePromotionStatus,
  updateCommercePromotion,
  type DiscountCodeStatus,
  type PromotionDiscountType,
  type PromotionMutationResult,
  type PromotionUpdatePayload,
} from "@/src/lib/admin-api/commerce-promotions";
import { tehranLocalDateTimeToUtc } from "@/src/lib/time-zone";

export type PromotionDetailActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialPromotionDetailActionState: PromotionDetailActionState = { status: "idle" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;
const AMOUNT_PATTERN = /^\d+$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalPositiveInteger(value: string): number | null | undefined {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10_000_000 ? parsed : undefined;
}

function stateFromMutation(
  result: PromotionMutationResult,
  successMessage: string,
): PromotionDetailActionState {
  if (result.kind === "ok") return { status: "success", message: successMessage };
  if (result.kind === "forbidden" || result.kind === "unauthenticated") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? (result.message ?? "مجوز commerce.promo.write برای این تغییر لازم است.")
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "conflict") {
    const messages: Record<string, string> = {
      discount_code_conflict: "این کد تخفیف از قبل وجود دارد.",
      promotion_must_be_paused: "برای ویرایش قوانین مالی، ابتدا پروموشن فعال را Pause کن.",
      promotion_expired: "پروموشن منقضی‌شده قابل تغییر نیست.",
      idempotency_conflict: "این درخواست امن قبلاً برای محتوای دیگری استفاده شده است.",
    };
    return {
      status: "conflict",
      message:
        (result.code && messages[result.code]) ||
        result.message ||
        "تغییر با وضعیت فعلی تعارض دارد.",
    };
  }
  if (result.kind === "invalid" || result.kind === "not_found") {
    return { status: "invalid", message: result.message ?? "اطلاعات درخواست معتبر نیست." };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس تجارت در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس تجارت فعلاً در دسترس نیست؛ دوباره تلاش کنید.",
  };
}

function validIdentity(formData: FormData): { promotionId: string; idempotencyKey: string } | null {
  const promotionId = text(formData, "promotionId").toLowerCase();
  const idempotencyKey = text(formData, "idempotencyKey");
  if (!UUID_PATTERN.test(promotionId) || !IDEMPOTENCY_PATTERN.test(idempotencyKey)) return null;
  return { promotionId, idempotencyKey };
}

export async function updatePromotionAction(
  _previous: PromotionDetailActionState,
  formData: FormData,
): Promise<PromotionDetailActionState> {
  const identity = validIdentity(formData);
  if (!identity) return { status: "invalid", message: "شناسه درخواست معتبر نیست." };

  const productIdRaw = text(formData, "productId");
  const name = text(formData, "name");
  const description = text(formData, "description");
  const discountType = text(formData, "discountType") as PromotionDiscountType;
  const percentageRaw = text(formData, "percentage");
  const fixedAmountMinor = text(formData, "fixedAmountMinor");
  const currency = text(formData, "currency").toUpperCase();
  const startsAt = text(formData, "startsAt");
  const endsAt = text(formData, "endsAt");
  const maxRedemptions = optionalPositiveInteger(text(formData, "maxRedemptions"));
  const primaryCode = text(formData, "primaryCode").toUpperCase();
  const codeStatus = text(formData, "codeStatus") as DiscountCodeStatus;
  const codeMaxRedemptions = optionalPositiveInteger(text(formData, "codeMaxRedemptions"));
  const reason = text(formData, "reason");

  if (productIdRaw && !UUID_PATTERN.test(productIdRaw)) {
    return { status: "invalid", message: "محصول انتخاب‌شده معتبر نیست." };
  }
  if (name.length < 2 || name.length > 160 || description.length > 1000) {
    return { status: "invalid", message: "نام یا توضیح معتبر نیست." };
  }
  if (!CODE_PATTERN.test(primaryCode) || (codeStatus !== "Active" && codeStatus !== "Disabled")) {
    return { status: "invalid", message: "کد یا وضعیت کد معتبر نیست." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }
  if (maxRedemptions === undefined || codeMaxRedemptions === undefined) {
    return { status: "invalid", message: "سقف استفاده معتبر نیست." };
  }
  if (
    maxRedemptions !== null &&
    codeMaxRedemptions !== null &&
    codeMaxRedemptions > maxRedemptions
  ) {
    return { status: "invalid", message: "سقف کد نمی‌تواند از سقف پروموشن بیشتر باشد." };
  }

  let startsAtUtc: string;
  let endsAtUtc: string | null;
  try {
    startsAtUtc = tehranLocalDateTimeToUtc(startsAt);
    endsAtUtc = endsAt ? tehranLocalDateTimeToUtc(endsAt) : null;
  } catch {
    return { status: "invalid", message: "زمان شروع یا پایان معتبر نیست." };
  }
  if (endsAtUtc && Date.parse(endsAtUtc) <= Date.parse(startsAtUtc)) {
    return { status: "invalid", message: "پایان باید بعد از شروع باشد." };
  }

  let percentageBasisPoints: number | null = null;
  let fixed: string | null = null;
  let fixedCurrency: string | null = null;
  if (discountType === "Percentage") {
    const percentage = Number(percentageRaw);
    if (
      !/^\d+$/.test(percentageRaw) ||
      !Number.isInteger(percentage) ||
      percentage < 1 ||
      percentage > 100
    ) {
      return { status: "invalid", message: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد." };
    }
    percentageBasisPoints = percentage * 100;
  } else if (discountType === "FixedAmount") {
    if (!AMOUNT_PATTERN.test(fixedAmountMinor) || BigInt(fixedAmountMinor) <= 0n) {
      return { status: "invalid", message: "مبلغ ثابت معتبر نیست." };
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { status: "invalid", message: "کد ارز معتبر نیست." };
    }
    fixed = fixedAmountMinor;
    fixedCurrency = currency;
  } else {
    return { status: "invalid", message: "نوع تخفیف معتبر نیست." };
  }

  const payload: PromotionUpdatePayload = {
    productId: productIdRaw || null,
    name,
    description: description || null,
    discountType,
    percentageBasisPoints,
    fixedAmountMinor: fixed,
    currency: fixedCurrency,
    startsAtUtc,
    endsAtUtc,
    maxRedemptions,
    primaryCode,
    codeStatus,
    codeMaxRedemptions,
    reason,
  };

  const result = await updateCommercePromotion(
    identity.promotionId,
    payload,
    identity.idempotencyKey,
  );
  const state = stateFromMutation(result, "قوانین پروموشن با Audit به‌روزرسانی شد.");
  if (state.status === "success") {
    revalidatePath(`/commerce/promotions/${identity.promotionId}`);
    revalidatePath("/commerce/promotions");
  }
  return state;
}

export async function changePromotionStatusAction(
  _previous: PromotionDetailActionState,
  formData: FormData,
): Promise<PromotionDetailActionState> {
  const identity = validIdentity(formData);
  if (!identity) return { status: "invalid", message: "شناسه درخواست معتبر نیست." };
  const targetStatus = text(formData, "targetStatus");
  const reason = text(formData, "statusReason");
  if (targetStatus !== "Active" && targetStatus !== "Paused") {
    return { status: "invalid", message: "وضعیت هدف معتبر نیست." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر وضعیت باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }
  const result = await setCommercePromotionStatus(
    identity.promotionId,
    targetStatus,
    reason,
    identity.idempotencyKey,
  );
  const state = stateFromMutation(result, `وضعیت پروموشن به ${targetStatus} تغییر کرد.`);
  if (state.status === "success") {
    revalidatePath(`/commerce/promotions/${identity.promotionId}`);
    revalidatePath("/commerce/promotions");
  }
  return state;
}
