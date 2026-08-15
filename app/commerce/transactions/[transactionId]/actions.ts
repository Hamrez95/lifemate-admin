"use server";

import { revalidatePath } from "next/cache";

import { requestCommerceRefundWorkflow } from "@/src/lib/admin-api/commerce-transaction-detail";

export type RefundActionFormState = {
  status:
    | "idle"
    | "success"
    | "invalid"
    | "forbidden"
    | "conflict"
    | "unavailable";
  message?: string;
};

export const initialRefundActionFormState: RefundActionFormState = {
  status: "idle",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function requestRefundAction(
  _previous: RefundActionFormState,
  formData: FormData,
): Promise<RefundActionFormState> {
  const transactionId = text(formData, "transactionId").toLowerCase();
  const reason = text(formData, "reason").trim();
  const idempotencyKey = text(formData, "idempotencyKey");

  if (!UUID_PATTERN.test(transactionId)) {
    return { status: "invalid", message: "شناسه تراکنش معتبر نیست." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return {
      status: "invalid",
      message: "دلیل درخواست بازپرداخت باید بین ۱۰ تا ۱۰۰۰ نویسه باشد.",
    };
  }
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey)) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }

  const result = await requestCommerceRefundWorkflow({
    transactionId,
    reason,
    idempotencyKey,
  });

  if (result.kind === "ok") {
    revalidatePath(`/commerce/transactions/${transactionId}`);
    revalidatePath("/commerce/transactions");
    return {
      status: "success",
      message:
        "درخواست بازپرداخت برای بررسی انسانی ثبت شد. هیچ عملیات مستقیمی روی درگاه پرداخت اجرا نشده است.",
    };
  }
  if (result.kind === "forbidden" || result.kind === "unauthenticated") {
    return {
      status: "forbidden",
      message:
        result.kind === "forbidden"
          ? (result.message ?? "برای این عملیات مجوز commerce.refund لازم است.")
          : "نشست مدیریتی معتبر نیست؛ دوباره وارد شوید.",
    };
  }
  if (result.kind === "conflict") {
    return {
      status: "conflict",
      message:
        result.code === "refund_workflow_already_active"
          ? "برای این تراکنش از قبل یک فرآیند بازپرداخت فعال وجود دارد."
          : result.code === "refund_not_eligible"
            ? "وضعیت فعلی تراکنش برای شروع فرآیند بازپرداخت مجاز نیست."
            : (result.message ?? "درخواست با وضعیت فعلی تراکنش تعارض دارد."),
    };
  }
  if (result.kind === "invalid") {
    return {
      status: "invalid",
      message: result.message ?? "اطلاعات درخواست بازپرداخت معتبر نیست.",
    };
  }
  if (result.kind === "not_found") {
    return {
      status: "conflict",
      message: result.message ?? "تراکنش پیدا نشد.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId
      ? `سرویس مالی فعلاً در دسترس نیست. کد پیگیری: ${result.correlationId}`
      : "سرویس مالی فعلاً در دسترس نیست؛ دوباره تلاش کنید.",
  };
}
