"use server";

import { revalidatePath } from "next/cache";

import {
  executeEntitlementAdjustment,
  previewEntitlementAdjustment,
  requestEntitlementAdjustment,
  type EntitlementAdjustmentResult,
  type ManualEntitlementAdjustmentInput,
  type ManualEntitlementOperation,
  type ManualEntitlementSchedule,
  type ManualEntitlementTarget,
} from "@/src/lib/admin-api/entitlement-adjustments";
import { tehranLocalDateTimeToUtc } from "@/src/lib/time-zone";

export type EntitlementAdjustmentActionState = {
  status: "idle" | "preview" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
  data?: Record<string, unknown>;
};

export const initialEntitlementAdjustmentActionState: EntitlementAdjustmentActionState = {
  status: "idle",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const OPERATIONS = new Set<ManualEntitlementOperation>(["Grant", "Extend", "Reduce", "Revoke"]);
const TARGETS = new Set<ManualEntitlementTarget>(["Product", "Offer"]);
const SCHEDULES = new Set<ManualEntitlementSchedule>([
  "ExactExpiry",
  "AddDays",
  "AddMonths",
  "Immediate",
]);
const REASON_CATEGORIES = new Set([
  "Prize/raffle",
  "Goodwill",
  "Support remedy",
  "Partnership",
  "Internal beta",
  "Other",
]);

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalUuid(formData: FormData, key: string): string | null | undefined {
  const value = text(formData, key);
  if (!value) return null;
  return UUID_PATTERN.test(value) ? value : undefined;
}

function optionalPositiveInt(
  formData: FormData,
  key: string,
  max: number,
): number | null | undefined {
  const raw = text(formData, key);
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 1 && value <= max ? value : undefined;
}

function actionState(
  result: EntitlementAdjustmentResult,
  intent: "preview" | "request" | "execute",
): EntitlementAdjustmentActionState {
  if (result.kind === "ok") {
    return {
      status: intent === "preview" ? "preview" : "success",
      message:
        intent === "preview"
          ? "پیش‌نمایش canonical آماده است؛ قبل/بعد را بررسی کنید."
          : intent === "request"
            ? "درخواست adjustment ثبت شد و برای approval آماده است."
            : "adjustment با موفقیت اجرا و Audit شد.",
      data: result.data,
    };
  }
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? (result.message ?? "مجوز این عملیات وجود ندارد.")
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message: result.message ?? "وضعیت entitlement یا approval تغییر کرده؛ صفحه را تازه کنید.",
    };
  }
  if (result.kind === "invalid" || result.kind === "not_found") {
    return {
      status: "invalid",
      message: result.message ?? "اطلاعات adjustment معتبر نیست.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس Commerce در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس Commerce فعلاً در دسترس نیست؛ دوباره تلاش کنید.",
  };
}

function buildInput(
  formData: FormData,
):
  | { ok: true; input: ManualEntitlementAdjustmentInput; idempotencyKey: string }
  | { ok: false; state: EntitlementAdjustmentActionState } {
  const idempotencyKey = text(formData, "idempotencyKey");
  const subjectAccountId = text(formData, "subjectAccountId");
  const targetTypeRaw = text(formData, "targetType") as ManualEntitlementTarget;
  const targetId = text(formData, "targetId");
  const entitlementId = optionalUuid(formData, "entitlementId");
  const expectedEntitlementVersion = optionalPositiveInt(
    formData,
    "expectedEntitlementVersion",
    Number.MAX_SAFE_INTEGER,
  );
  const operation = text(formData, "operation") as ManualEntitlementOperation;
  const scheduleMode = text(formData, "scheduleMode") as ManualEntitlementSchedule;
  const scheduleAmount = optionalPositiveInt(
    formData,
    "scheduleAmount",
    scheduleMode === "AddMonths" ? 120 : 3650,
  );
  const exactExpiryLocal = text(formData, "exactExpiresAt");
  const referenceAtUtc = text(formData, "referenceAtUtc");
  const reasonCategory = text(formData, "reasonCategory");
  const reasonText = text(formData, "reason");
  const reason = `[${reasonCategory}] ${reasonText}`;
  const approvalRequestId = optionalUuid(formData, "approvalRequestId");
  const approvalExpectedVersion = optionalPositiveInt(
    formData,
    "approvalExpectedVersion",
    Number.MAX_SAFE_INTEGER,
  );

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { ok: false, state: { status: "invalid", message: "شناسه امن درخواست معتبر نیست." } };
  }
  if (!UUID_PATTERN.test(subjectAccountId) || !UUID_PATTERN.test(targetId)) {
    return {
      ok: false,
      state: { status: "invalid", message: "Account و هدف تجاری معتبر نیستند." },
    };
  }
  if (!TARGETS.has(targetTypeRaw) || !OPERATIONS.has(operation) || !SCHEDULES.has(scheduleMode)) {
    return {
      ok: false,
      state: { status: "invalid", message: "نوع هدف، عملیات یا مدل زمان‌بندی معتبر نیست." },
    };
  }
  if (!REASON_CATEGORIES.has(reasonCategory)) {
    return { ok: false, state: { status: "invalid", message: "دسته‌بندی دلیل معتبر نیست." } };
  }
  if (entitlementId === undefined || expectedEntitlementVersion === undefined) {
    return {
      ok: false,
      state: { status: "invalid", message: "Entitlement انتخاب‌شده یا نسخه آن معتبر نیست." },
    };
  }
  if (approvalRequestId === undefined || approvalExpectedVersion === undefined) {
    return {
      ok: false,
      state: { status: "invalid", message: "Approval ID یا نسخه آن معتبر نیست." },
    };
  }
  if ((approvalRequestId === null) !== (approvalExpectedVersion === null)) {
    return {
      ok: false,
      state: { status: "invalid", message: "Approval ID و نسخه باید با هم وارد شوند." },
    };
  }
  if (operation === "Grant" && (entitlementId !== null || expectedEntitlementVersion !== null)) {
    return {
      ok: false,
      state: { status: "invalid", message: "Grant نباید Entitlement موجود داشته باشد." },
    };
  }
  if (operation !== "Grant" && (entitlementId === null || expectedEntitlementVersion === null)) {
    return {
      ok: false,
      state: {
        status: "invalid",
        message: "برای تغییر دسترسی موجود، یک Entitlement معتبر را انتخاب کنید.",
      },
    };
  }
  if ((scheduleMode === "AddDays" || scheduleMode === "AddMonths") && scheduleAmount == null) {
    return {
      ok: false,
      state: { status: "invalid", message: "این مدل زمان‌بندی به مقدار عددی نیاز دارد." },
    };
  }
  if (scheduleAmount === undefined) {
    return {
      ok: false,
      state: { status: "invalid", message: "مقدار زمان‌بندی خارج از محدوده است." },
    };
  }
  if (scheduleMode === "Immediate" && operation !== "Revoke") {
    return {
      ok: false,
      state: { status: "invalid", message: "Immediate فقط برای Revoke مجاز است." },
    };
  }
  if (operation === "Reduce" && scheduleMode !== "ExactExpiry") {
    return {
      ok: false,
      state: { status: "invalid", message: "Reduce فقط با Exact Expiry انجام می‌شود." },
    };
  }
  if (reasonText.length < 10 || reason.length > 1000) {
    return {
      ok: false,
      state: { status: "invalid", message: "توضیح دلیل باید حداقل ۱۰ نویسه باشد." },
    };
  }
  if (!referenceAtUtc || Number.isNaN(Date.parse(referenceAtUtc))) {
    return {
      ok: false,
      state: { status: "invalid", message: "زمان مرجع درخواست معتبر نیست؛ صفحه را تازه کنید." },
    };
  }

  let exactExpiresAtUtc: string | null = null;
  if (scheduleMode === "ExactExpiry") {
    if (!exactExpiryLocal) {
      return { ok: false, state: { status: "invalid", message: "تاریخ انقضای دقیق الزامی است." } };
    }
    try {
      exactExpiresAtUtc = tehranLocalDateTimeToUtc(exactExpiryLocal);
    } catch {
      return { ok: false, state: { status: "invalid", message: "تاریخ انقضا معتبر نیست." } };
    }
  }

  return {
    ok: true,
    idempotencyKey,
    input: {
      subjectAccountId,
      targetType: targetTypeRaw,
      targetId,
      entitlementId,
      expectedEntitlementVersion,
      operation,
      scheduleMode,
      scheduleAmount,
      exactExpiresAtUtc,
      referenceAtUtc: new Date(referenceAtUtc).toISOString(),
      reason,
      confirmed: formData.get("confirmed") === "on",
      approvalRequestId,
      approvalExpectedVersion,
    },
  };
}

export async function manualEntitlementAdjustmentAction(
  _previous: EntitlementAdjustmentActionState,
  formData: FormData,
): Promise<EntitlementAdjustmentActionState> {
  const intent = text(formData, "intent");
  if (intent !== "preview" && intent !== "request" && intent !== "execute") {
    return { status: "invalid", message: "عملیات درخواستی معتبر نیست." };
  }
  const parsed = buildInput(formData);
  if (!parsed.ok) return parsed.state;

  const result =
    intent === "preview"
      ? await previewEntitlementAdjustment(parsed.input)
      : intent === "request"
        ? await requestEntitlementAdjustment(parsed.input, parsed.idempotencyKey)
        : await executeEntitlementAdjustment(parsed.input, parsed.idempotencyKey);

  const state = actionState(result, intent);
  if (state.status === "success") {
    revalidatePath("/commerce");
    revalidatePath("/commerce/entitlements/adjustments");
    revalidatePath(`/users/${parsed.input.subjectAccountId}`);
  }
  return state;
}
