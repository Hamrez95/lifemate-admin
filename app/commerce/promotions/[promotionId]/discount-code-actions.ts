"use server";

import { revalidatePath } from "next/cache";

import {
  issueCommerceDiscountCodes,
  setCommerceDiscountCodeStatus,
  type DiscountCodeMutationResult,
} from "@/src/lib/admin-api/commerce-discount-codes";

export type DiscountCodeActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialDiscountCodeActionState: DiscountCodeActionState = { status: "idle" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;
const PREFIX_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,19}$/;
const ISSUE_CONFIRMATION = "confirm-discount-code-issue";
const STATUS_CONFIRMATION = "confirm-discount-code-status";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mutationState(
  result: DiscountCodeMutationResult,
  successMessage: string,
): DiscountCodeActionState {
  if (result.kind === "ok") return { status: "success", message: successMessage };
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? (result.message ?? "مجوز لازم برای تغییر کد تخفیف وجود ندارد.")
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message: result.message ?? "نسخه کد تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.",
    };
  }
  if (result.kind === "invalid" || result.kind === "not_found") {
    return { status: "invalid", message: result.message ?? "درخواست کد تخفیف معتبر نیست." };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس تجارت در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس تجارت فعلاً در دسترس نیست.",
  };
}

export async function issueDiscountCodesAction(
  _previous: DiscountCodeActionState,
  formData: FormData,
): Promise<DiscountCodeActionState> {
  const promotionId = text(formData, "promotionId");
  const mode = text(formData, "mode");
  const codesRaw = text(formData, "codes");
  const countRaw = text(formData, "generateCount");
  const prefixRaw = text(formData, "prefix").toUpperCase();
  const maxRaw = text(formData, "maxRedemptions");
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  const confirmation = text(formData, "confirmation");

  if (!UUID_PATTERN.test(promotionId)) {
    return { status: "invalid", message: "شناسه پروموشن معتبر نیست." };
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  if (confirmation !== ISSUE_CONFIRMATION) {
    return { status: "invalid", message: "تأیید صریح صدور کد لازم است." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل صدور باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }

  let maxRedemptions: number | null = null;
  if (maxRaw) {
    if (!/^\d+$/.test(maxRaw)) {
      return { status: "invalid", message: "سقف استفاده معتبر نیست." };
    }
    maxRedemptions = Number(maxRaw);
    if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 10_000_000) {
      return { status: "invalid", message: "سقف استفاده خارج از محدوده مجاز است." };
    }
  }

  let codes: string[] | null = null;
  let generateCount: number | null = null;
  let prefix: string | null = null;
  if (mode === "explicit") {
    codes = codesRaw
      .split(/[\s,]+/)
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean);
    if (
      codes.length < 1 ||
      codes.length > 50 ||
      codes.some((code) => !CODE_PATTERN.test(code)) ||
      new Set(codes).size !== codes.length
    ) {
      return { status: "invalid", message: "بین ۱ تا ۵۰ کد یکتای معتبر وارد کنید." };
    }
  } else if (mode === "generated") {
    if (!/^\d+$/.test(countRaw)) {
      return { status: "invalid", message: "تعداد کد تولیدی معتبر نیست." };
    }
    generateCount = Number(countRaw);
    if (!Number.isInteger(generateCount) || generateCount < 1 || generateCount > 50) {
      return { status: "invalid", message: "تعداد کد تولیدی باید بین ۱ تا ۵۰ باشد." };
    }
    prefix = prefixRaw || null;
    if (prefix && !PREFIX_PATTERN.test(prefix)) {
      return { status: "invalid", message: "Prefix کد معتبر نیست." };
    }
  } else {
    return { status: "invalid", message: "روش صدور کد معتبر نیست." };
  }

  const state = mutationState(
    await issueCommerceDiscountCodes({
      promotionId,
      codes,
      generateCount,
      prefix,
      maxRedemptions,
      reason,
      idempotencyKey,
    }),
    "کدهای تخفیف با محدودیت و Audit صادر شدند.",
  );
  if (state.status === "success") {
    revalidatePath(`/commerce/promotions/${promotionId}`);
    revalidatePath("/commerce/promotions");
  }
  return state;
}

export async function setDiscountCodeStatusAction(
  _previous: DiscountCodeActionState,
  formData: FormData,
): Promise<DiscountCodeActionState> {
  const promotionId = text(formData, "promotionId");
  const codeId = text(formData, "codeId");
  const status = text(formData, "status");
  const versionRaw = text(formData, "expectedVersion");
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  const confirmation = text(formData, "confirmation");

  if (!UUID_PATTERN.test(promotionId) || !UUID_PATTERN.test(codeId)) {
    return { status: "invalid", message: "شناسه کد تخفیف معتبر نیست." };
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  if (confirmation !== STATUS_CONFIRMATION) {
    return { status: "invalid", message: "تأیید صریح تغییر وضعیت کد لازم است." };
  }
  if (status !== "Active" && status !== "Disabled") {
    return { status: "invalid", message: "وضعیت کد معتبر نیست." };
  }
  if (!/^\d+$/.test(versionRaw) || Number(versionRaw) < 1) {
    return { status: "invalid", message: "نسخه کد معتبر نیست؛ صفحه را refresh کنید." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }

  const state = mutationState(
    await setCommerceDiscountCodeStatus({
      promotionId,
      codeId,
      status,
      expectedVersion: Number(versionRaw),
      reason,
      idempotencyKey,
    }),
    "وضعیت کد تخفیف با نسخه‌بندی و Audit تغییر کرد.",
  );
  if (state.status === "success") {
    revalidatePath(`/commerce/promotions/${promotionId}`);
    revalidatePath("/commerce/promotions");
  }
  return state;
}
