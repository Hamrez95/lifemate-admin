"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setMarketingChannelStatus } from "@/src/lib/admin-api/marketing-channels";

const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9_.:-]{0,63}$/;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function destination(kind: string, message: string): never {
  const params = new URLSearchParams({ notice: kind, message });
  redirect(`/marketing/channels?${params.toString()}`);
}

export async function setChannelStatusAction(formData: FormData): Promise<void> {
  const providerCode = text(formData, "providerCode").toLowerCase();
  const enabledRaw = text(formData, "enabled");
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");

  if (!PROVIDER_PATTERN.test(providerCode)) destination("error", "شناسه کانال معتبر نیست.");
  if (enabledRaw !== "true" && enabledRaw !== "false")
    destination("error", "وضعیت کانال معتبر نیست.");
  if (reason.length < 10 || reason.length > 1000)
    destination("error", "دلیل تغییر وضعیت باید بین ۱۰ تا ۱۰۰۰ نویسه باشد.");
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey))
    destination("error", "شناسه امن درخواست معتبر نیست.");

  const result = await setMarketingChannelStatus(
    providerCode,
    enabledRaw === "true",
    reason,
    idempotencyKey,
  );

  if (result.kind === "ok") {
    revalidatePath("/marketing/channels");
    revalidatePath("/marketing");
    destination("success", "وضعیت عملیاتی کانال به‌روزرسانی شد.");
  }
  if (result.kind === "forbidden")
    destination("error", "این تغییر به مجوز پرریسک marketing.social.publish نیاز دارد.");
  if (result.kind === "conflict")
    destination("error", result.message ?? "درخواست با وضعیت فعلی کانال تعارض دارد.");
  if (result.kind === "not_found") destination("error", "کانال پیدا نشد.");
  if (result.kind === "invalid") destination("error", result.message ?? "درخواست معتبر نیست.");
  if (result.kind === "unauthenticated") destination("error", "نشست مدیریتی معتبر نیست.");
  destination(
    "error",
    result.correlationId
      ? `سرویس کانال‌ها در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس کانال‌ها فعلاً در دسترس نیست.",
  );
}
