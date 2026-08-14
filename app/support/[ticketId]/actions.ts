"use server";

import { revalidatePath } from "next/cache";

import {
  performSupportTicketAction,
  type SupportTicketAction,
  type SupportTicketActionPayload,
} from "@/src/lib/admin-api/support-ticket";

export type SupportActionFormState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialSupportActionFormState: SupportActionFormState = { status: "idle" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function payloadFor(action: SupportTicketAction, formData: FormData): SupportTicketActionPayload | null {
  if (action === "add_note") {
    const note = text(formData, "note").trim();
    return note.length >= 10 && note.length <= 2000 ? { note } : null;
  }
  if (action === "set_status") {
    const status = text(formData, "status");
    return ["Open", "Pending", "WaitingOnUser", "Resolved", "Closed"].includes(status)
      ? { status }
      : null;
  }
  if (action === "set_priority") {
    const priority = text(formData, "priority");
    return ["Low", "Normal", "High", "Urgent"].includes(priority) ? { priority } : null;
  }
  const assigneeAccountId = text(formData, "assigneeAccountId");
  if (assigneeAccountId === "") return { assigneeAccountId: null };
  return UUID_PATTERN.test(assigneeAccountId) ? { assigneeAccountId } : null;
}

export async function runSupportTicketAction(
  _previous: SupportActionFormState,
  formData: FormData,
): Promise<SupportActionFormState> {
  const ticketId = text(formData, "ticketId").toLowerCase();
  const action = text(formData, "action") as SupportTicketAction;
  const idempotencyKey = text(formData, "idempotencyKey");

  if (!UUID_PATTERN.test(ticketId)) {
    return { status: "invalid", message: "شناسه تیکت معتبر نیست." };
  }
  if (!["add_note", "set_status", "set_priority", "set_assignee"].includes(action)) {
    return { status: "invalid", message: "عملیات انتخاب‌شده معتبر نیست." };
  }
  const payload = payloadFor(action, formData);
  if (!payload) {
    return { status: "invalid", message: "مقدار واردشده برای این عملیات معتبر نیست." };
  }

  const result = await performSupportTicketAction({
    ticketId,
    action,
    payload,
    idempotencyKey,
  });

  if (result.kind === "ok") {
    revalidatePath(`/support/${ticketId}`);
    revalidatePath("/support");
    const messages: Record<SupportTicketAction, string> = {
      add_note: "یادداشت داخلی ثبت شد و رویداد audit بدون متن یادداشت ذخیره شد.",
      set_status: "وضعیت تیکت با موفقیت تغییر کرد.",
      set_priority: "اولویت تیکت با موفقیت تغییر کرد.",
      set_assignee: "مسئول تیکت با موفقیت به‌روزرسانی شد.",
    };
    return { status: "success", message: messages[action] };
  }
  if (result.kind === "forbidden" || result.kind === "unauthenticated") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? result.message ?? "مجوز support.write برای این عملیات لازم است."
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message:
        result.code === "support_state_conflict"
          ? "تیکت از قبل در همین وضعیت قرار دارد یا این گذار مجاز نیست. صفحه را تازه‌سازی کنید."
          : result.message ?? "عملیات با وضعیت فعلی تیکت تعارض دارد.",
    };
  }
  if (result.kind === "invalid") {
    return { status: "invalid", message: result.message ?? "اطلاعات عملیات معتبر نیست." };
  }
  if (result.kind === "not_found") {
    return { status: "conflict", message: result.message ?? "تیکت پیدا نشد." };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس پشتیبانی فعلاً در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس پشتیبانی فعلاً در دسترس نیست؛ دوباره تلاش کنید.",
  };
}
