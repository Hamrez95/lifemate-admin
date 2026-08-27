"use server";

import { revalidatePath } from "next/cache";

import {
  activateRetentionPolicy,
  createRetentionHold,
  releaseRetentionHold,
  type RetentionMutationResult,
  type RetentionPolicy,
} from "@/src/lib/admin-api/retention-operations";

export type RetentionActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialRetentionActionState: RetentionActionState = { status: "idle" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[a-z][a-z0-9._-]{2,79}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,180}$/;
const DISPOSITIONS = new Set<RetentionPolicy["disposition"]>([
  "Delete",
  "Anonymize",
  "Archive",
  "Review",
]);

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function common(
  formData: FormData,
): { reason: string; idempotencyKey: string } | { error: RetentionActionState } {
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  if (reason.length < 10 || reason.length > 1000) {
    return { error: { status: "invalid", message: "دلیل باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." } };
  }
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return { error: { status: "invalid", message: "شناسه امن درخواست معتبر نیست." } };
  }
  return { reason, idempotencyKey };
}

function stateFrom(result: RetentionMutationResult, successMessage: string): RetentionActionState {
  if (result.kind === "ok") {
    return {
      status: "success",
      message: result.replayed ? `${successMessage} (replay امن)` : successMessage,
    };
  }
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? "مجوز تغییر سیاست نگهداری داده وجود ندارد."
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "invalid") {
    return { status: "invalid", message: result.message ?? "درخواست retention معتبر نیست." };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message: result.message ?? "وضعیت تغییر کرده است؛ صفحه را دوباره بارگذاری کنید.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس retention در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس retention فعلاً در دسترس نیست.",
  };
}

function refresh() {
  revalidatePath("/security");
  revalidatePath("/security/retention");
}

export async function activateRetentionPolicyAction(
  _previous: RetentionActionState,
  formData: FormData,
): Promise<RetentionActionState> {
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  if (text(formData, "confirmation") !== "confirm-retention-policy") {
    return { status: "invalid", message: "تأیید صریح فعال‌سازی policy لازم است." };
  }
  const dataCategory = text(formData, "dataCategory").toLowerCase();
  const purposeCode = text(formData, "purposeCode").toLowerCase();
  const retentionRaw = text(formData, "retentionDays");
  const graceRaw = text(formData, "graceDays");
  const disposition = text(formData, "disposition") as RetentionPolicy["disposition"];
  const legalBasis = text(formData, "legalBasis") || null;
  if (!KEY.test(dataCategory) || !KEY.test(purposeCode)) {
    return { status: "invalid", message: "Data category یا purpose معتبر نیست." };
  }
  const retentionDays = retentionRaw === "" ? null : Number(retentionRaw);
  const graceDays = Number(graceRaw);
  if (
    (retentionDays !== null &&
      (!Number.isInteger(retentionDays) || retentionDays < 0 || retentionDays > 36500)) ||
    !Number.isInteger(graceDays) ||
    graceDays < 0 ||
    graceDays > 3650 ||
    !DISPOSITIONS.has(disposition)
  ) {
    return { status: "invalid", message: "مقادیر policy خارج از محدوده مجاز هستند." };
  }
  if (legalBasis && legalBasis.length > 500) {
    return { status: "invalid", message: "Legal basis بیش از حد طولانی است." };
  }
  const state = stateFrom(
    await activateRetentionPolicy({
      dataCategory,
      purposeCode,
      retentionDays,
      graceDays,
      disposition,
      legalBasis,
      ...shared,
    }),
    "نسخه جدید policy با Audit فعال شد.",
  );
  if (state.status === "success") refresh();
  return state;
}

export async function createRetentionHoldAction(
  _previous: RetentionActionState,
  formData: FormData,
): Promise<RetentionActionState> {
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  if (text(formData, "confirmation") !== "confirm-retention-hold") {
    return { status: "invalid", message: "تأیید صریح ایجاد hold لازم است." };
  }
  const accountId = text(formData, "accountId");
  const dataCategory = text(formData, "dataCategory").toLowerCase() || null;
  const purposeCode = text(formData, "purposeCode").toLowerCase() || null;
  const reasonCode = text(formData, "reasonCode").toLowerCase();
  const expiresAtUtc = text(formData, "expiresAtUtc") || null;
  if (!UUID.test(accountId) || !KEY.test(reasonCode)) {
    return { status: "invalid", message: "Account یا reason code معتبر نیست." };
  }
  if ((dataCategory && !KEY.test(dataCategory)) || (purposeCode && !KEY.test(purposeCode))) {
    return { status: "invalid", message: "Scope hold معتبر نیست." };
  }
  if (expiresAtUtc && Number.isNaN(Date.parse(expiresAtUtc))) {
    return { status: "invalid", message: "زمان پایان hold معتبر نیست." };
  }
  const state = stateFrom(
    await createRetentionHold({
      accountId,
      dataCategory,
      purposeCode,
      reasonCode,
      expiresAtUtc,
      ...shared,
    }),
    "Retention hold ثبت شد.",
  );
  if (state.status === "success") refresh();
  return state;
}

export async function releaseRetentionHoldAction(
  _previous: RetentionActionState,
  formData: FormData,
): Promise<RetentionActionState> {
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  const holdId = text(formData, "holdId");
  if (!UUID.test(holdId)) return { status: "invalid", message: "Hold id معتبر نیست." };
  if (text(formData, "confirmation") !== "confirm-retention-hold-release") {
    return { status: "invalid", message: "تأیید صریح آزادسازی hold لازم است." };
  }
  const state = stateFrom(
    await releaseRetentionHold({ holdId, ...shared }),
    "Retention hold آزاد شد.",
  );
  if (state.status === "success") refresh();
  return state;
}
