"use server";

import { revalidatePath } from "next/cache";

import {
  escalateSupportConversation,
  linkSupportConversationReference,
  sendSupportConversationMessage,
  type ConversationMutationResult,
  type SupportConversationLink,
} from "@/src/lib/admin-api/support-conversation";

export type ConversationActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialConversationActionState: ConversationActionState = { status: "idle" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE_CODE_PATTERN = /^[a-z0-9._-]{2,64}$/;
const LINK_KINDS = new Set<SupportConversationLink["linkKind"]>([
  "ProductIssue",
  "EngineeringIssue",
  "Incident",
  "Other",
]);

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mapped(result: ConversationMutationResult, success: string): ConversationActionState {
  if (result.kind === "ok")
    return {
      status: "success",
      message: result.replayed ? `${success} (درخواست تکراری بدون اثر اضافه)` : success,
    };
  if (result.kind === "forbidden" || result.kind === "unauthenticated") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? (result.message ?? "مجوز support.write لازم است.")
          : "نشست مدیریتی معتبر نیست.",
    };
  }
  if (result.kind === "conflict")
    return {
      status: "conflict",
      message: result.message ?? "این عملیات با وضعیت فعلی تعارض دارد؛ صفحه را تازه‌سازی کنید.",
    };
  if (result.kind === "invalid")
    return { status: "invalid", message: result.message ?? "اطلاعات عملیات معتبر نیست." };
  if (result.kind === "not_found")
    return { status: "conflict", message: result.message ?? "تیکت پیدا نشد." };
  return {
    status: "unavailable",
    message: result.correlationId
      ? `Admin API در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "Admin API در دسترس نیست؛ دوباره تلاش کنید.",
  };
}

export async function sendConversationMessage(
  _previous: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const ticketId = text(formData, "ticketId").toLowerCase();
  const body = text(formData, "body");
  const clientMessageId = text(formData, "clientMessageId").toLowerCase();
  const idempotencyKey = text(formData, "idempotencyKey");
  if (
    !UUID_PATTERN.test(ticketId) ||
    !UUID_PATTERN.test(clientMessageId) ||
    body.length < 1 ||
    body.length > 4000
  ) {
    return { status: "invalid", message: "پیام یا شناسه درخواست معتبر نیست." };
  }
  const result = await sendSupportConversationMessage({
    ticketId,
    body,
    clientMessageId,
    idempotencyKey,
  });
  const state = mapped(result, "پیام برای کاربر ثبت شد.");
  if (state.status === "success") revalidatePath(`/support/${ticketId}`);
  return state;
}

export async function escalateConversation(
  _previous: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const ticketId = text(formData, "ticketId").toLowerCase();
  const targetRoleCode = text(formData, "targetRoleCode").toLowerCase();
  const safeReason = text(formData, "safeReason");
  const idempotencyKey = text(formData, "idempotencyKey");
  if (
    !UUID_PATTERN.test(ticketId) ||
    !ROLE_CODE_PATTERN.test(targetRoleCode) ||
    safeReason.length < 5 ||
    safeReason.length > 800
  ) {
    return { status: "invalid", message: "نقش مقصد یا دلیل ارجاع معتبر نیست." };
  }
  const result = await escalateSupportConversation({
    ticketId,
    targetRoleCode,
    safeReason,
    idempotencyKey,
  });
  const state = mapped(result, "ارجاع برای تیم مقصد ثبت شد.");
  if (state.status === "success") revalidatePath(`/support/${ticketId}`);
  return state;
}

export async function linkConversationReference(
  _previous: ConversationActionState,
  formData: FormData,
): Promise<ConversationActionState> {
  const ticketId = text(formData, "ticketId").toLowerCase();
  const linkKind = text(formData, "linkKind") as SupportConversationLink["linkKind"];
  const referenceCode = text(formData, "referenceCode");
  const idempotencyKey = text(formData, "idempotencyKey");
  if (
    !UUID_PATTERN.test(ticketId) ||
    !LINK_KINDS.has(linkKind) ||
    !referenceCode ||
    referenceCode.length > 180 ||
    /^https?:\/\//i.test(referenceCode)
  ) {
    return { status: "invalid", message: "نوع یا شناسه مرجع داخلی معتبر نیست." };
  }
  const result = await linkSupportConversationReference({
    ticketId,
    linkKind,
    referenceCode,
    idempotencyKey,
  });
  const state = mapped(result, "مرجع داخلی به تیکت متصل شد.");
  if (state.status === "success") revalidatePath(`/support/${ticketId}`);
  return state;
}
