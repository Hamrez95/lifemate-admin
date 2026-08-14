"use server";

import { revalidatePath } from "next/cache";

import { performUserAccountAction, type UserAccountAction } from "@/src/lib/admin-api/user-actions";

export type UserActionFormState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialUserActionFormState: UserActionFormState = { status: "idle" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function runUserAccountAction(
  _previous: UserActionFormState,
  formData: FormData,
): Promise<UserActionFormState> {
  const accountId = formText(formData, "accountId").toLowerCase();
  const action = formText(formData, "action") as UserAccountAction;
  const reason = formText(formData, "reason");
  const idempotencyKey = formText(formData, "idempotencyKey");

  if (!UUID_PATTERN.test(accountId)) {
    return { status: "invalid", message: "شناسه کاربر معتبر نیست." };
  }
  if (action !== "suspend" && action !== "restore") {
    return { status: "invalid", message: "عملیات انتخاب‌شده معتبر نیست." };
  }

  const result = await performUserAccountAction({
    accountId,
    action,
    reason,
    idempotencyKey,
  });

  if (result.kind === "ok") {
    revalidatePath(`/users/${accountId}`);
    revalidatePath("/users");
    return {
      status: "success",
      message:
        action === "suspend"
          ? "حساب کاربر با موفقیت تعلیق شد و رویداد audit ثبت شد."
          : "حساب کاربر با موفقیت به وضعیت فعال بازگشت و رویداد audit ثبت شد.",
    };
  }
  if (result.kind === "forbidden") {
    return {
      status: "forbidden",
      message: result.message ?? "مجوز لازم برای این عملیات وجود ندارد.",
    };
  }
  if (result.kind === "conflict") {
    const message =
      result.code === "admin_target_denied"
        ? "این حساب عضو فعال Command Center است و باید از مسیر مدیریت اعضای ادمین تغییر کند."
        : result.code === "self_target_denied"
          ? "نمی‌توانید حساب مدیریتی خودتان را از این مسیر تغییر دهید."
          : result.code === "invalid_account_transition"
            ? "وضعیت فعلی حساب با این عملیات سازگار نیست. صفحه را تازه‌سازی کنید."
            : (result.message ?? "این عملیات با وضعیت فعلی حساب تعارض دارد.");
    return { status: "conflict", message };
  }
  if (result.kind === "invalid") {
    return { status: "invalid", message: result.message ?? "اطلاعات عملیات معتبر نیست." };
  }
  if (result.kind === "unauthenticated") {
    return { status: "forbidden", message: "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید." };
  }
  if (result.kind === "not_found") {
    return { status: "conflict", message: result.message ?? "حساب کاربر پیدا نشد." };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس عملیات کاربر فعلاً در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس عملیات کاربر فعلاً در دسترس نیست؛ دوباره تلاش کنید.",
  };
}
