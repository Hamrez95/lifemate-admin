"use server";

import { revalidatePath } from "next/cache";

import { configureCommandCenterPreferences } from "@/src/lib/admin-api/settings-preferences";

export type SettingsActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialSettingsActionState: SettingsActionState = { status: "idle" };
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;
const CONFIRMATION = "confirm-settings-change";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateCommandCenterPreferencesAction(
  _previous: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const locale = text(formData, "locale");
  const timeZone = text(formData, "timeZone");
  const displayName = text(formData, "displayName");
  const versionRaw = text(formData, "expectedVersion");
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  const confirmation = text(formData, "confirmation");

  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  if (confirmation !== CONFIRMATION) {
    return { status: "invalid", message: "تأیید صریح تغییر تنظیمات الزامی است." };
  }
  if (locale !== "fa-IR" && locale !== "en-US") {
    return { status: "invalid", message: "زبان انتخاب‌شده پشتیبانی نمی‌شود." };
  }
  if (!/^[A-Za-z_+\-/]{1,64}$/.test(timeZone)) {
    return { status: "invalid", message: "منطقه زمانی معتبر نیست." };
  }
  if (displayName.length < 1 || displayName.length > 120) {
    return { status: "invalid", message: "نام نمایشی باید بین ۱ تا ۱۲۰ نویسه باشد." };
  }
  if (!/^\d+$/.test(versionRaw)) {
    return { status: "invalid", message: "نسخه تنظیمات معتبر نیست؛ صفحه را دوباره بارگذاری کنید." };
  }
  const expectedVersion = Number(versionRaw);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { status: "invalid", message: "نسخه تنظیمات معتبر نیست؛ صفحه را دوباره بارگذاری کنید." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }

  const result = await configureCommandCenterPreferences({
    locale,
    timeZone,
    displayName,
    expectedVersion,
    reason,
    idempotencyKey,
  });
  if (result.kind === "ok") {
    revalidatePath("/settings");
    return { status: "success", message: "تنظیمات canonical با موفقیت ثبت و Audit شد." };
  }
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message: result.kind === "forbidden"
        ? (result.message ?? "مجوز settings.write برای این تغییر وجود ندارد.")
        : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "conflict") {
    return { status: "conflict", message: result.message ?? "تنظیمات تغییر کرده‌اند؛ صفحه را تازه‌سازی کنید." };
  }
  if (result.kind === "invalid") {
    return { status: "invalid", message: result.message ?? "مقادیر تنظیمات معتبر نیستند." };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس تنظیمات در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس تنظیمات فعلاً در دسترس نیست؛ دوباره تلاش کنید.",
  };
}
