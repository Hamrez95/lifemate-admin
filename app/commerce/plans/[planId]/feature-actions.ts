"use server";

import { revalidatePath } from "next/cache";

import { configureCommercePlanFeature } from "@/src/lib/admin-api/commerce-plan-features";

export type PlanFeatureActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialPlanFeatureActionState: PlanFeatureActionState = { status: "idle" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const CONFIRMATION = "confirm-plan-feature";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function configurePlanFeatureAction(
  _previous: PlanFeatureActionState,
  formData: FormData,
): Promise<PlanFeatureActionState> {
  const planId = text(formData, "planId");
  const featureId = text(formData, "featureId");
  const assignedRaw = text(formData, "assigned");
  const expectedVersionRaw = text(formData, "expectedVersion");
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  const confirmation = text(formData, "confirmation");

  if (!UUID_PATTERN.test(planId) || !UUID_PATTERN.test(featureId)) {
    return { status: "invalid", message: "شناسه پلن یا قابلیت معتبر نیست." };
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  if (confirmation !== CONFIRMATION) {
    return { status: "invalid", message: "تأیید صریح تغییر قابلیت پلن لازم است." };
  }
  if (assignedRaw !== "true" && assignedRaw !== "false") {
    return { status: "invalid", message: "وضعیت تخصیص قابلیت معتبر نیست." };
  }
  if (!/^\d+$/.test(expectedVersionRaw)) {
    return { status: "invalid", message: "نسخه قابلیت معتبر نیست؛ صفحه را refresh کنید." };
  }
  const expectedVersion = Number(expectedVersionRaw);
  if (
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 0 ||
    expectedVersion > 1_000_000_000
  ) {
    return { status: "invalid", message: "نسخه قابلیت معتبر نیست؛ صفحه را refresh کنید." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }

  const result = await configureCommercePlanFeature({
    planId,
    featureId,
    assigned: assignedRaw === "true",
    expectedVersion,
    reason,
    idempotencyKey,
  });

  if (result.kind === "ok") {
    revalidatePath(`/commerce/plans/${planId}`);
    revalidatePath(`/commerce/plans/${planId}/manage`);
    return { status: "success", message: "تخصیص قابلیت پلن با نسخه‌بندی و Audit ثبت شد." };
  }
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? (result.message ?? "مجوز تغییر قابلیت پلن را ندارید.")
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message: result.message ?? "نسخه تغییر کرده است؛ صفحه را refresh کنید.",
    };
  }
  if (result.kind === "invalid" || result.kind === "not_found") {
    return { status: "invalid", message: result.message ?? "درخواست معتبر نیست." };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس تجارت در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس تجارت فعلاً در دسترس نیست.",
  };
}
