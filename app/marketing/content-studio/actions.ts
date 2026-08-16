"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  generateMarketingAiContent,
  marketingAiContentGoals,
  marketingAiContentLanguages,
  marketingAiContentTones,
  type MarketingAiContentGoal,
  type MarketingAiContentLanguage,
  type MarketingAiContentTone,
} from "@/src/lib/admin-api/marketing-ai-content";
import type { MarketingCampaignResult } from "@/src/lib/admin-api/marketing-campaigns";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function destination(campaignId: string, kind: "success" | "error", message: string): never {
  const params = new URLSearchParams({ campaign: campaignId, notice: kind, message });
  redirect(`/marketing/content-studio?${params.toString()}`);
}

function resultMessage<T>(result: MarketingCampaignResult<T>): string {
  if (result.kind === "forbidden") {
    return result.message ?? "مجوز لازم برای Content Studio داده نشده است.";
  }
  if (result.kind === "conflict") {
    return result.message ?? "این درخواست با یک idempotency key متفاوت تعارض دارد.";
  }
  if (result.kind === "invalid") {
    return result.message ?? "پارامترهای تولید محتوا معتبر نیستند.";
  }
  if (result.kind === "unauthenticated") {
    return "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.";
  }
  if (result.kind === "not_found") {
    return result.message ?? "کمپین انتخاب‌شده پیدا نشد.";
  }
  if (result.kind === "unavailable") {
    return result.correlationId
      ? `Content Studio فعلاً در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "Content Studio فعلاً در دسترس نیست.";
  }
  return "عملیات Content Studio انجام نشد.";
}

export async function generateMarketingContentAction(formData: FormData): Promise<void> {
  const campaignId = text(formData, "campaignId");
  const idempotencyKey = text(formData, "idempotencyKey");
  const rawGoal = text(formData, "goal");
  const rawTone = text(formData, "tone");
  const rawLanguage = text(formData, "language");
  const keyMessage = text(formData, "keyMessage");
  const callToAction = text(formData, "callToAction");

  if (!UUID_PATTERN.test(campaignId)) {
    redirect("/marketing/content-studio?notice=error&message=شناسه%20کمپین%20معتبر%20نیست.");
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    destination(campaignId, "error", "شناسه امن درخواست معتبر نیست.");
  }
  if (!marketingAiContentGoals.includes(rawGoal as MarketingAiContentGoal)) {
    destination(campaignId, "error", "هدف محتوا از allowlist مجاز نیست.");
  }
  if (!marketingAiContentTones.includes(rawTone as MarketingAiContentTone)) {
    destination(campaignId, "error", "لحن محتوا از allowlist مجاز نیست.");
  }
  if (!marketingAiContentLanguages.includes(rawLanguage as MarketingAiContentLanguage)) {
    destination(campaignId, "error", "زبان محتوا معتبر نیست.");
  }
  if (keyMessage.length > 500) {
    destination(campaignId, "error", "پیام کلیدی حداکثر ۵۰۰ نویسه است.");
  }
  if (callToAction.length > 240) {
    destination(campaignId, "error", "CTA حداکثر ۲۴۰ نویسه است.");
  }

  const result = await generateMarketingAiContent(
    campaignId,
    {
      goal: rawGoal as MarketingAiContentGoal,
      tone: rawTone as MarketingAiContentTone,
      language: rawLanguage as MarketingAiContentLanguage,
      keyMessage: keyMessage || null,
      callToAction: callToAction || null,
    },
    idempotencyKey,
  );

  if (result.kind !== "ok") {
    destination(campaignId, "error", resultMessage(result));
  }

  revalidatePath("/marketing/content-studio");
  revalidatePath(`/marketing/campaigns/${campaignId}`);
  destination(
    campaignId,
    "success",
    result.data.replayed
      ? "همان درخواست قبلی بدون تولید duplicate بازپخش شد."
      : "سه Draft جدید ساخته شد؛ هنوز هیچ محتوا تأیید یا منتشر نشده است.",
  );
}
