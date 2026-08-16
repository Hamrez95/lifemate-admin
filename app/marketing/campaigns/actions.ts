"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createMarketingCampaign,
  marketingCampaignStatuses,
  setMarketingCampaignStatus,
  type MarketingCampaignStatus,
} from "@/src/lib/admin-api/marketing-campaigns";
import { tehranLocalDateTimeToUtc } from "@/src/lib/time-zone";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function destination(kind: string, message: string): never {
  const params = new URLSearchParams({ notice: kind, message });
  redirect(`/marketing/campaigns?${params.toString()}`);
}

function mutationMessage(result: Awaited<ReturnType<typeof createMarketingCampaign>>): string {
  if (result.kind === "forbidden") return "مجوز marketing.campaign.write برای این تغییر لازم است.";
  if (result.kind === "conflict")
    return result.message ?? "وضعیت کمپین یا شناسه درخواست با تغییر جدید تعارض دارد.";
  if (result.kind === "invalid") return result.message ?? "اطلاعات کمپین معتبر نیست.";
  if (result.kind === "unauthenticated") return "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.";
  return result.correlationId
    ? `سرویس کمپین در دسترس نیست. کد پیگیری: ${result.correlationId}`
    : "سرویس کمپین فعلاً در دسترس نیست.";
}

export async function createCampaignAction(formData: FormData): Promise<void> {
  const idempotencyKey = text(formData, "idempotencyKey");
  const name = text(formData, "name");
  const objective = text(formData, "objective");
  const productCode = text(formData, "productCode").toLowerCase();
  const channelCode = text(formData, "channelCode").toLowerCase();
  const ownerAdminAccountId = text(formData, "ownerAdminAccountId");
  const startsAt = text(formData, "startsAt");
  const endsAt = text(formData, "endsAt");
  const reason = text(formData, "reason");

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey))
    destination("error", "شناسه امن درخواست معتبر نیست.");
  if (name.length < 2 || name.length > 160)
    destination("error", "نام کمپین باید بین ۲ تا ۱۶۰ نویسه باشد.");
  if (objective.length > 500) destination("error", "هدف کمپین بیش از حد طولانی است.");
  if (productCode && !CODE_PATTERN.test(productCode)) destination("error", "کد محصول معتبر نیست.");
  if (channelCode && !CODE_PATTERN.test(channelCode)) destination("error", "کد کانال معتبر نیست.");
  if (ownerAdminAccountId && !UUID_PATTERN.test(ownerAdminAccountId))
    destination("error", "شناسه مالک معتبر نیست.");
  if (reason.length < 10 || reason.length > 1000)
    destination("error", "دلیل ایجاد کمپین باید بین ۱۰ تا ۱۰۰۰ نویسه باشد.");

  let startsAtUtc: string | null = null;
  let endsAtUtc: string | null = null;
  try {
    startsAtUtc = startsAt ? tehranLocalDateTimeToUtc(startsAt) : null;
    endsAtUtc = endsAt ? tehranLocalDateTimeToUtc(endsAt) : null;
  } catch {
    destination("error", "زمان شروع یا پایان معتبر نیست.");
  }
  if (startsAtUtc && endsAtUtc && Date.parse(endsAtUtc) < Date.parse(startsAtUtc)) {
    destination("error", "پایان کمپین نمی‌تواند قبل از شروع باشد.");
  }

  const result = await createMarketingCampaign(
    {
      name,
      objective: objective || null,
      productCode: productCode || null,
      channelCode: channelCode || null,
      ownerAdminAccountId: ownerAdminAccountId || null,
      startsAtUtc,
      endsAtUtc,
      reason,
    },
    idempotencyKey,
  );

  if (result.kind !== "ok") destination("error", mutationMessage(result));
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  destination("success", "کمپین به‌صورت Draft ساخته شد.");
}

export async function setCampaignStatusAction(formData: FormData): Promise<void> {
  const campaignId = text(formData, "campaignId");
  const status = text(formData, "status") as MarketingCampaignStatus;
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");

  if (!UUID_PATTERN.test(campaignId)) destination("error", "شناسه کمپین معتبر نیست.");
  if (!marketingCampaignStatuses.includes(status)) destination("error", "وضعیت مقصد معتبر نیست.");
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey))
    destination("error", "شناسه امن درخواست معتبر نیست.");
  if (reason.length < 10 || reason.length > 1000)
    destination("error", "دلیل تغییر وضعیت باید بین ۱۰ تا ۱۰۰۰ نویسه باشد.");

  const result = await setMarketingCampaignStatus(campaignId, status, reason, idempotencyKey);
  if (result.kind !== "ok") destination("error", mutationMessage(result));
  revalidatePath("/marketing");
  revalidatePath("/marketing/campaigns");
  destination("success", "وضعیت کمپین به‌روزرسانی شد.");
}
