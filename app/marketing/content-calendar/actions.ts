"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  cancelMarketingScheduledPublish,
  marketingCalendarTimezones,
  retryMarketingFailedPublish,
  scheduleMarketingCampaignPublish,
  type MarketingCalendarTimezone,
} from "@/src/lib/admin-api/marketing-content-calendar";
import type { MarketingCampaignResult } from "@/src/lib/admin-api/marketing-campaigns";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function destination(kind: "success" | "error", message: string): never {
  const params = new URLSearchParams({ notice: kind, message });
  redirect(`/marketing/content-calendar?${params.toString()}`);
}

function resultMessage<T>(result: MarketingCampaignResult<T>): string {
  if (result.kind === "forbidden") return result.message ?? "مجوز این عملیات داده نشده است.";
  if (result.kind === "conflict")
    return result.message ?? "وضعیت فعلی اجازه این عملیات را نمی‌دهد.";
  if (result.kind === "invalid") return result.message ?? "پارامترهای عملیات معتبر نیستند.";
  if (result.kind === "unauthenticated") return "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.";
  if (result.kind === "not_found") return result.message ?? "رکورد موردنظر پیدا نشد.";
  if (result.kind === "unavailable") {
    return result.correlationId
      ? `عملیات فعلاً در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "عملیات فعلاً در دسترس نیست.";
  }
  return "عملیات انجام نشد.";
}

export async function scheduleCampaignPublishAction(formData: FormData): Promise<void> {
  const campaignId = text(formData, "campaignId");
  const scheduledLocal = text(formData, "scheduledLocal");
  const timezone = text(formData, "timezone");
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");

  if (!UUID_PATTERN.test(campaignId)) destination("error", "شناسه کمپین معتبر نیست.");
  if (!LOCAL_PATTERN.test(scheduledLocal)) destination("error", "زمان‌بندی محلی معتبر نیست.");
  if (!marketingCalendarTimezones.includes(timezone as MarketingCalendarTimezone)) {
    destination("error", "منطقه زمانی انتخاب‌شده مجاز نیست.");
  }
  if (reason.length < 10 || reason.length > 1000) {
    destination("error", "برای زمان‌بندی یک دلیل ۱۰ تا ۱۰۰۰ نویسه‌ای لازم است.");
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    destination("error", "شناسه امن درخواست معتبر نیست.");
  }

  const result = await scheduleMarketingCampaignPublish(
    campaignId,
    {
      scheduledLocal,
      timezone: timezone as MarketingCalendarTimezone,
      reason,
    },
    idempotencyKey,
  );
  if (result.kind !== "ok") destination("error", resultMessage(result));

  revalidatePath("/marketing/content-calendar");
  revalidatePath(`/marketing/campaigns/${campaignId}`);
  destination(
    "success",
    result.data.replayed
      ? "همان درخواست زمان‌بندی قبلی بدون duplicate بازپخش شد."
      : "انتشار زمان‌بندی شد؛ در زمان مقرر دوباره approval و readiness بررسی می‌شود.",
  );
}

export async function cancelScheduledPublishAction(formData: FormData): Promise<void> {
  const executionId = text(formData, "executionId");
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  if (!UUID_PATTERN.test(executionId)) destination("error", "شناسه اجرا معتبر نیست.");
  if (reason.length < 10 || reason.length > 1000) {
    destination("error", "برای لغو زمان‌بندی یک دلیل ۱۰ تا ۱۰۰۰ نویسه‌ای لازم است.");
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    destination("error", "شناسه امن درخواست معتبر نیست.");
  }
  const result = await cancelMarketingScheduledPublish(executionId, reason, idempotencyKey);
  if (result.kind !== "ok") destination("error", resultMessage(result));
  revalidatePath("/marketing/content-calendar");
  destination("success", "زمان‌بندی لغو شد؛ provider call انجام نمی‌شود.");
}

export async function retryFailedPublishAction(formData: FormData): Promise<void> {
  const executionId = text(formData, "executionId");
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  if (!UUID_PATTERN.test(executionId)) destination("error", "شناسه اجرا معتبر نیست.");
  if (reason.length < 10 || reason.length > 1000) {
    destination("error", "برای retry یک دلیل ۱۰ تا ۱۰۰۰ نویسه‌ای لازم است.");
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    destination("error", "شناسه امن درخواست معتبر نیست.");
  }
  const result = await retryMarketingFailedPublish(executionId, reason, idempotencyKey);
  if (result.kind !== "ok") destination("error", resultMessage(result));
  revalidatePath("/marketing/content-calendar");
  destination(
    "success",
    result.data.replayed
      ? "همان retry قبلی بدون duplicate بازپخش شد."
      : "Retry امن در صف قرار گرفت؛ OutcomeUnknown هرگز از این مسیر retry نمی‌شود.",
  );
}
