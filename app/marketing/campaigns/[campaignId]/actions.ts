"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requestMarketingCampaignPublish,
  setMarketingCampaignApproval,
  updateMarketingCampaignContent,
} from "@/src/lib/admin-api/marketing-campaign-detail";
import type { MarketingCampaignResult } from "@/src/lib/admin-api/marketing-campaigns";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function destination(
  campaignId: string,
  kind: "success" | "error",
  message: string,
): never {
  const params = new URLSearchParams({ notice: kind, message });
  redirect(`/marketing/campaigns/${campaignId}?${params.toString()}`);
}

function mutationMessage(
  result: MarketingCampaignResult<Record<string, unknown>>,
): string {
  if (result.kind === "ok") return "عملیات کمپین انجام شد.";
  if (result.kind === "forbidden") {
    return "مجوز لازم برای این عملیات Marketing به حساب شما داده نشده است.";
  }
  if (result.kind === "conflict") {
    return result.message ?? "وضعیت فعلی کمپین اجازه این عملیات را نمی‌دهد.";
  }
  if (result.kind === "invalid") {
    return result.message ?? "اطلاعات ارسال‌شده معتبر نیست.";
  }
  if (result.kind === "unauthenticated") {
    return "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.";
  }
  if (result.kind === "not_found") {
    return result.message ?? "کمپین موردنظر پیدا نشد.";
  }
  return result.correlationId
    ? `سرویس Marketing در دسترس نیست. کد پیگیری: ${result.correlationId}`
    : "سرویس Marketing فعلاً در دسترس نیست.";
}

function validateBase(formData: FormData): {
  campaignId: string;
  idempotencyKey: string;
} {
  const campaignId = text(formData, "campaignId");
  const idempotencyKey = text(formData, "idempotencyKey");
  if (!UUID_PATTERN.test(campaignId)) {
    redirect("/marketing/campaigns?notice=error&message=شناسه%20کمپین%20معتبر%20نیست.");
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    destination(campaignId, "error", "شناسه امن درخواست معتبر نیست.");
  }
  return { campaignId, idempotencyKey };
}

function validReason(
  campaignId: string,
  value: string,
  label: string,
): string {
  if (value.length < 10 || value.length > 1000) {
    destination(
      campaignId,
      "error",
      `${label} باید بین ۱۰ تا ۱۰۰۰ نویسه باشد.`,
    );
  }
  return value;
}

function revalidateCampaign(campaignId: string): void {
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  revalidatePath(`/marketing/campaigns/${campaignId}`);
}

export async function updateCampaignContentAction(
  formData: FormData,
): Promise<void> {
  const { campaignId, idempotencyKey } = validateBase(formData);
  const brief = text(formData, "brief");
  const audienceSummary = text(formData, "audienceSummary");
  const publishText = text(formData, "publishText");
  const reason = validReason(
    campaignId,
    text(formData, "reason"),
    "دلیل ویرایش",
  );
  const assetRefs = text(formData, "assetRefs")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (brief.length > 4000) {
    destination(campaignId, "error", "Brief بیش از ۴۰۰۰ نویسه است.");
  }
  if (audienceSummary.length > 2000) {
    destination(campaignId, "error", "خلاصه مخاطب بیش از ۲۰۰۰ نویسه است.");
  }
  if (publishText.length > 4096) {
    destination(campaignId, "error", "متن انتشار بیش از ۴۰۹۶ نویسه است.");
  }
  if (assetRefs.length > 20 || assetRefs.some((value) => value.length > 500)) {
    destination(
      campaignId,
      "error",
      "حداکثر ۲۰ مرجع asset با طول حداکثر ۵۰۰ نویسه مجاز است.",
    );
  }

  const result = await updateMarketingCampaignContent(
    campaignId,
    {
      brief: brief || null,
      audienceSummary: audienceSummary || null,
      publishText: publishText || null,
      assetRefs,
      reason,
    },
    idempotencyKey,
  );
  if (result.kind !== "ok") {
    destination(campaignId, "error", mutationMessage(result));
  }
  revalidateCampaign(campaignId);
  destination(
    campaignId,
    "success",
    "محتوای کمپین ذخیره شد؛ هر تغییر واقعی، تأیید قبلی همان revision را باطل می‌کند.",
  );
}

export async function setCampaignApprovalAction(
  formData: FormData,
): Promise<void> {
  const { campaignId, idempotencyKey } = validateBase(formData);
  const approvedValue = text(formData, "approved");
  if (approvedValue !== "true" && approvedValue !== "false") {
    destination(campaignId, "error", "وضعیت تأیید معتبر نیست.");
  }
  const approved = approvedValue === "true";
  const reason = validReason(
    campaignId,
    text(formData, "reason"),
    approved ? "دلیل تأیید" : "دلیل لغو تأیید",
  );
  const result = await setMarketingCampaignApproval(
    campaignId,
    approved,
    reason,
    idempotencyKey,
  );
  if (result.kind !== "ok") {
    destination(campaignId, "error", mutationMessage(result));
  }
  revalidateCampaign(campaignId);
  destination(
    campaignId,
    "success",
    approved
      ? "revision فعلی محتوا توسط انسان تأیید شد."
      : "تأیید محتوا لغو شد و انتشار جدید مجاز نیست.",
  );
}

export async function requestCampaignPublishAction(
  formData: FormData,
): Promise<void> {
  const { campaignId, idempotencyKey } = validateBase(formData);
  const reason = validReason(
    campaignId,
    text(formData, "reason"),
    "دلیل انتشار",
  );
  const result = await requestMarketingCampaignPublish(
    campaignId,
    reason,
    idempotencyKey,
  );
  if (result.kind !== "ok") {
    destination(campaignId, "error", mutationMessage(result));
  }
  revalidateCampaign(campaignId);
  destination(
    campaignId,
    "success",
    "درخواست انتشار در صف امن ثبت شد؛ Active بودن کمپین به معنی Published بودن نیست.",
  );
}
