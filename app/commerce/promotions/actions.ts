"use server";

import { revalidatePath } from "next/cache";

import {
  createCommercePromotion,
  type PromotionDiscountType,
  type PromotionWritePayload,
} from "@/src/lib/admin-api/commerce-promotions";
import { tehranLocalDateTimeToUtc } from "@/src/lib/time-zone";

export type PromotionActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialPromotionActionState: PromotionActionState = { status: "idle" };

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

function mutationState(
  result: Awaited<ReturnType<typeof createCommercePromotion>>,
): PromotionActionState {
  if (result.kind === "ok") {
    return { status: "success", message: "پروموشن به‌صورت Draft ساخته شد." };
  }
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
    return {
      status: "conflict",
      message:
        result.code === "discount_code_conflict"
          ? "این کد تخفیف از قبل وجود دارد."
          : (result.message ?? "این تغییر با وضعیت فعلی داده تعارض دارد."),
    };
  }
  if (result.kind === "invalid" || result.kind === "not_found") {
    return {
      status: "invalid",
      message: result.message ?? "اطلاعات پروموشن معتبر نیست.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس تجارت در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس تجارت فعلاً در دسترس نیست؛ دوباره تلاش کنید.",
  };
}

export async function createPromotionAction(
  _previous: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const idempotencyKey = text(formData, "idempotencyKey");
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
  const codeMaxRedemptions = optionalPositiveInteger(text(formData, "codeMaxRedemptions"));
  const reason = text(formData, "reason");

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  if (productIdRaw && !UUID_PATTERN.test(productIdRaw)) {
    return { status: "invalid", message: "محصول انتخاب‌شده معتبر نیست." };
  }
  if (name.length < 2 || name.length > 160 || description.length > 1000) {
    return { status: "invalid", message: "نام یا توضیح پروموشن معتبر نیست." };
  }
  if (!CODE_PATTERN.test(primaryCode)) {
    return { status: "invalid", message: "فرمت کد تخفیف معتبر نیست." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }
  if (maxRedemptions === undefined || codeMaxRedemptions === undefined) {
    return { status: "invalid", message: "محدودیت استفاده باید یک عدد مثبت معتبر باشد." };
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
    if (!/^\d+$/.test(percentageRaw)) {
      return { status: "invalid", message: "درصد تخفیف معتبر نیست." };
    }
    const percentage = Number(percentageRaw);
    if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100) {
      return { status: "invalid", message: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد." };
    }
    percentageBasisPoints = percentage * 100;
  } else if (discountType === "FixedAmount") {
    if (!AMOUNT_PATTERN.test(fixedAmountMinor) || BigInt(fixedAmountMinor) <= 0n) {
      return { status: "invalid", message: "مبلغ ثابت معتبر نیست." };
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return { status: "invalid", message: "کد ارز باید سه حرف بزرگ مانند IRR باشد." };
    }
    fixed = fixedAmountMinor;
    fixedCurrency = currency;
  } else {
    return { status: "invalid", message: "نوع تخفیف معتبر نیست." };
  }

  const payload: PromotionWritePayload = {
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
    codeMaxRedemptions,
    reason,
  };

  const result = await createCommercePromotion(payload, idempotencyKey);
  const state = mutationState(result);
  if (state.status === "success") {
    revalidatePath("/commerce");
    revalidatePath("/commerce/promotions");
  }
  return state;
}
