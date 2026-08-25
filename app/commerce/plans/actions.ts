"use server";

import { revalidatePath } from "next/cache";

import {
  configureCommerceTrial,
  createCommercePlan,
  scheduleCommercePrice,
  updateCommercePlan,
  type CommerceCatalogMutationResult,
} from "@/src/lib/admin-api/commerce-catalog";
import { tehranLocalDateTimeToUtc } from "@/src/lib/time-zone";

export type CatalogActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialCatalogActionState: CatalogActionState = { status: "idle" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const PLAN_CODE_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9._:-]{1,39}$/;
const AMOUNT_PATTERN = /^\d+$/;
const POSTGRES_BIGINT_MAX = 9_223_372_036_854_775_807n;
const PLAN_CHANGE_CONFIRMATION = "confirm-plan-change";
const PRICE_CHANGE_CONFIRMATION = "confirm-price-version";
const TRIAL_CHANGE_CONFIRMATION = "confirm-trial-policy";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mutationState(
  result: CommerceCatalogMutationResult,
  successMessage: string,
): CatalogActionState {
  if (result.kind === "ok") return { status: "success", message: successMessage };
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? (result.message ?? "مجوز لازم برای این تغییر وجود ندارد.")
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message: result.message ?? "این تغییر با وضعیت فعلی کاتالوگ تعارض دارد.",
    };
  }
  if (result.kind === "invalid" || result.kind === "not_found") {
    return {
      status: "invalid",
      message: result.message ?? "اطلاعات ارسال‌شده معتبر نیست.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس تجارت در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس تجارت فعلاً در دسترس نیست؛ دوباره تلاش کنید.",
  };
}

function validIdempotency(formData: FormData): string | null {
  const key = text(formData, "idempotencyKey");
  return IDEMPOTENCY_PATTERN.test(key) ? key : null;
}

export async function createPlanAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const idempotencyKey = validIdempotency(formData);
  const productId = text(formData, "productId");
  const code = text(formData, "code").toLowerCase();
  const name = text(formData, "name");
  const reason = text(formData, "reason");

  if (!idempotencyKey) return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  if (!UUID_PATTERN.test(productId)) return { status: "invalid", message: "محصول معتبر نیست." };
  if (!PLAN_CODE_PATTERN.test(code)) {
    return { status: "invalid", message: "کد پلن باید ۲ تا ۶۴ نویسه لاتین امن باشد." };
  }
  if (name.length < 2 || name.length > 120) {
    return { status: "invalid", message: "نام پلن باید بین ۲ تا ۱۲۰ نویسه باشد." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }

  const state = mutationState(
    await createCommercePlan({ productId, code, name, reason }, idempotencyKey),
    "پلن جدید با موفقیت ساخته شد.",
  );
  if (state.status === "success") {
    revalidatePath("/commerce");
    revalidatePath("/commerce/plans");
  }
  return state;
}

export async function updatePlanAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const idempotencyKey = validIdempotency(formData);
  const planId = text(formData, "planId");
  const name = text(formData, "name");
  const status = text(formData, "status");
  const reason = text(formData, "reason");
  const confirmation = text(formData, "confirmation");

  if (!idempotencyKey) return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  if (confirmation !== PLAN_CHANGE_CONFIRMATION) {
    return { status: "invalid", message: "تأیید صریح تغییر lifecycle لازم است." };
  }
  if (!UUID_PATTERN.test(planId)) return { status: "invalid", message: "شناسه پلن معتبر نیست." };
  if (name.length < 2 || name.length > 120) {
    return { status: "invalid", message: "نام پلن باید بین ۲ تا ۱۲۰ نویسه باشد." };
  }
  if (status !== "Active" && status !== "Retired") {
    return { status: "invalid", message: "وضعیت پلن معتبر نیست." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }

  const state = mutationState(
    await updateCommercePlan(planId, { name, status, reason }, idempotencyKey),
    "تغییرات پلن ثبت و Audit شد.",
  );
  if (state.status === "success") {
    revalidatePath("/commerce");
    revalidatePath("/commerce/plans");
    revalidatePath(`/commerce/plans/${planId}`);
  }
  return state;
}

export async function configureTrialAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const idempotencyKey = validIdempotency(formData);
  const planId = text(formData, "planId");
  const durationRaw = text(formData, "durationDays");
  const expectedVersionRaw = text(formData, "expectedVersion");
  const status = text(formData, "status");
  const reason = text(formData, "reason");
  const confirmation = text(formData, "confirmation");

  if (!idempotencyKey) return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  if (!UUID_PATTERN.test(planId)) return { status: "invalid", message: "شناسه پلن معتبر نیست." };
  if (confirmation !== TRIAL_CHANGE_CONFIRMATION) {
    return { status: "invalid", message: "تأیید صریح تغییر Trial policy لازم است." };
  }
  if (!/^\d+$/.test(durationRaw) || !/^\d+$/.test(expectedVersionRaw)) {
    return { status: "invalid", message: "مدت یا نسخه Trial معتبر نیست." };
  }
  const durationDays = Number(durationRaw);
  const expectedVersion = Number(expectedVersionRaw);
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
    return { status: "invalid", message: "مدت Trial باید بین ۱ تا ۳۶۵ روز باشد." };
  }
  if (
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 0 ||
    expectedVersion > 1_000_000_000
  ) {
    return { status: "invalid", message: "نسخه Trial معتبر نیست؛ صفحه را دوباره بارگذاری کنید." };
  }
  if (status !== "Active" && status !== "Disabled") {
    return { status: "invalid", message: "وضعیت Trial معتبر نیست." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }

  const state = mutationState(
    await configureCommerceTrial(
      planId,
      {
        durationDays,
        eligibilityRule: "NoPriorTrialForProduct",
        status,
        expectedVersion,
        reason,
      },
      idempotencyKey,
    ),
    "سیاست Trial با نسخه‌بندی و Audit ثبت شد.",
  );
  if (state.status === "success") {
    revalidatePath(`/commerce/plans/${planId}`);
    revalidatePath(`/commerce/plans/${planId}/manage`);
  }
  return state;
}

export async function schedulePriceAction(
  _previous: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  const idempotencyKey = validIdempotency(formData);
  const planId = text(formData, "planId");
  const countryRaw = text(formData, "countryCode").toUpperCase();
  const currency = text(formData, "currency").toUpperCase();
  const storeProvider = text(formData, "storeProvider").toLowerCase();
  const periodRaw = text(formData, "billingPeriodMonths");
  const amountMinor = text(formData, "amountMinor");
  const effectiveFrom = text(formData, "effectiveFrom");
  const reason = text(formData, "reason");
  const confirmation = text(formData, "confirmation");

  if (!idempotencyKey) return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  if (confirmation !== PRICE_CHANGE_CONFIRMATION) {
    return { status: "invalid", message: "تأیید صریح نسخه جدید قیمت لازم است." };
  }
  if (!UUID_PATTERN.test(planId)) return { status: "invalid", message: "شناسه پلن معتبر نیست." };
  if (countryRaw && !COUNTRY_PATTERN.test(countryRaw)) {
    return { status: "invalid", message: "کد کشور باید دو حرف مانند IR باشد." };
  }
  if (!CURRENCY_PATTERN.test(currency)) {
    return { status: "invalid", message: "کد ارز باید سه حرف مانند IRR باشد." };
  }
  if (!PROVIDER_PATTERN.test(storeProvider)) {
    return { status: "invalid", message: "شناسه کانال فروش معتبر نیست." };
  }
  if (!/^\d+$/.test(periodRaw)) {
    return { status: "invalid", message: "دوره پرداخت معتبر نیست." };
  }
  const billingPeriodMonths = Number(periodRaw);
  if (
    !Number.isSafeInteger(billingPeriodMonths) ||
    billingPeriodMonths < 1 ||
    billingPeriodMonths > 120
  ) {
    return { status: "invalid", message: "دوره پرداخت باید بین ۱ تا ۱۲۰ ماه باشد." };
  }
  if (!AMOUNT_PATTERN.test(amountMinor)) {
    return { status: "invalid", message: "مبلغ باید عدد صحیح در واحد کوچک ارز باشد." };
  }
  const amount = BigInt(amountMinor);
  if (amount < 0n || amount > POSTGRES_BIGINT_MAX) {
    return { status: "invalid", message: "مبلغ خارج از محدوده مجاز است." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }

  let effectiveFromUtc: string;
  try {
    effectiveFromUtc = tehranLocalDateTimeToUtc(effectiveFrom);
  } catch {
    return { status: "invalid", message: "زمان شروع قیمت معتبر نیست." };
  }

  const state = mutationState(
    await scheduleCommercePrice(
      planId,
      {
        countryCode: countryRaw || null,
        currency,
        storeProvider,
        billingPeriodMonths,
        amountMinor: amount.toString(),
        effectiveFromUtc,
        reason,
      },
      idempotencyKey,
    ),
    "نسخه جدید قیمت زمان‌بندی شد؛ مبلغ تاریخی قبلی تغییر نکرد.",
  );
  if (state.status === "success") {
    revalidatePath("/commerce");
    revalidatePath("/commerce/plans");
    revalidatePath(`/commerce/plans/${planId}`);
  }
  return state;
}
