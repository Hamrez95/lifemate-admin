"use server";

import { revalidatePath } from "next/cache";
import { mutateAccessGrant, type AccessGrantAction } from "@/src/lib/admin-api/relationship-access-grant-actions";

export type AccessGrantActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialAccessGrantActionState: AccessGrantActionState = { status: "idle" };

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function action(value: string): AccessGrantAction | null {
  return value === "extend" || value === "replace-scopes" || value === "revoke" ? value : null;
}

export async function mutateAccessGrantAction(
  _previous: AccessGrantActionState,
  data: FormData,
): Promise<AccessGrantActionState> {
  if (text(data, "confirmation") !== "confirm-access-grant-change") {
    return { status: "invalid", message: "تأیید صریح تغییر Access Grant الزامی است." };
  }

  const grantId = text(data, "grantId");
  const selectedAction = action(text(data, "action"));
  const versionRaw = text(data, "expectedVersion");
  const expectedVersion = /^\d+$/.test(versionRaw) ? Number(versionRaw) : 0;
  const reason = text(data, "reason");
  const idempotencyKey = text(data, "idempotencyKey");

  if (!selectedAction || expectedVersion < 1) {
    return { status: "invalid", message: "عملیات یا نسخه Access Grant معتبر نیست." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "دلیل تغییر باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." };
  }
  if (!/^[A-Za-z0-9._:-]{8,180}$/.test(idempotencyKey)) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }

  let expiresAtUtc: string | undefined;
  let scopes: string[] | undefined;
  if (selectedAction === "extend") {
    const raw = text(data, "expiresAtUtc");
    const parsed = new Date(raw);
    if (!raw || Number.isNaN(parsed.getTime())) {
      return { status: "invalid", message: "زمان پایان جدید معتبر نیست." };
    }
    expiresAtUtc = parsed.toISOString();
  }
  if (selectedAction === "replace-scopes") {
    scopes = data
      .getAll("scopes")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);
    if (scopes.length < 1 || scopes.length > 100 || new Set(scopes).size !== scopes.length) {
      return { status: "invalid", message: "حداقل یک scope یکتا باید باقی بماند." };
    }
  }

  const result = await mutateAccessGrant({
    grantId,
    action: selectedAction,
    expectedVersion,
    expiresAtUtc,
    scopes,
    reason,
    idempotencyKey,
  });

  if (result.kind === "ok") {
    revalidatePath("/relationships");
    revalidatePath("/relationships/ledger");
    return {
      status: "success",
      message: result.replayed
        ? `درخواست قبلی با نسخه ${result.version} بازیابی شد.`
        : `تغییر با نسخه ${result.version} ثبت و Audit شد.`,
    };
  }
  if (result.kind === "conflict") {
    return { status: "conflict", message: result.message ?? "نسخه Access Grant تغییر کرده؛ صفحه را تازه کنید." };
  }
  if (result.kind === "invalid") {
    return { status: "invalid", message: result.message ?? "درخواست Access Grant معتبر نیست." };
  }
  if (result.kind === "forbidden" || result.kind === "unauthenticated") {
    return {
      status: "forbidden",
      message: result.kind === "forbidden" ? result.message ?? "مجوز این عملیات وجود ندارد." : "نشست معتبر نیست.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId ? `کد پیگیری: ${result.correlationId}` : "سرویس در دسترس نیست.",
  };
}
