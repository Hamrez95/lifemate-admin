"use server";

import { revalidatePath } from "next/cache";

import { performStaffAction, type StaffAction } from "@/src/lib/admin-api/staff-actions";

export type StaffActionFormState = { status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable"; message?: string };
export const initialStaffActionFormState: StaffActionFormState = { status: "idle" };

function text(formData: FormData, key: string): string { const value = formData.get(key); return typeof value === "string" ? value : ""; }

export async function runStaffAction(_previous: StaffActionFormState, formData: FormData): Promise<StaffActionFormState> {
  const accountId = text(formData, "accountId").toLowerCase();
  const action = text(formData, "action") as StaffAction;
  const roleCode = text(formData, "roleCode");
  const result = await performStaffAction({ accountId, action, reason: text(formData, "reason"), idempotencyKey: text(formData, "idempotencyKey"), ...(roleCode ? { roleCode } : {}) });
  if (result.kind === "ok") {
    revalidatePath("/security");
    revalidatePath(`/security/roles/${roleCode}`);
    return { status: "success", message: result.data.noop ? "وضعیت از قبل مطابق درخواست بود؛ نتیجه امن درخواست بازیابی شد." : "تغییر با موفقیت ثبت شد و رویداد audit ایجاد شد." };
  }
  if (result.kind === "unauthenticated") return { status: "forbidden", message: "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید." };
  if (result.kind === "forbidden") return { status: "forbidden", message: result.message ?? "این تغییر مجاز نیست؛ تغییر خود، Founder و Super Admin مسدود است." };
  if (result.kind === "conflict") return { status: "conflict", message: result.message ?? "وضعیت فعلی با درخواست سازگار نیست؛ صفحه را تازه‌سازی کنید." };
  if (result.kind === "not_found") return { status: "conflict", message: result.message ?? "عضو یا نقش پیدا نشد." };
  if (result.kind === "invalid") return { status: "invalid", message: result.message ?? "اطلاعات عملیات معتبر نیست." };
  return { status: "unavailable", message: result.correlationId ? `سرویس در دسترس نیست. کد پیگیری: ${result.correlationId}` : "سرویس عملیات کارکنان در دسترس نیست؛ دوباره تلاش کنید." };
}
