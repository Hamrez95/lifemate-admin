"use server";

import { revalidatePath } from "next/cache";

import {
  createBreakGlassRequest,
  mutateBreakGlassRequest,
  type BreakGlassAction,
  type BreakGlassCapability,
} from "@/src/lib/admin-api/break-glass";

export type BreakGlassActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialBreakGlassActionState: BreakGlassActionState = { status: "idle" };

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function idempotencyKey(data: FormData): string | null {
  const value = text(data, "idempotencyKey");
  return /^[A-Za-z0-9._:-]{8,180}$/.test(value) ? value : null;
}

function mapResult(
  result: Awaited<ReturnType<typeof createBreakGlassRequest>>,
): BreakGlassActionState {
  if (result.kind === "ok") {
    revalidatePath("/security/break-glass");
    return {
      status: "success",
      message: result.replayed
        ? "درخواست قبلی با همان Idempotency-Key بازیابی شد."
        : `وضعیت جدید: ${result.status}`,
    };
  }
  if (result.kind === "forbidden" || result.kind === "unauthenticated") {
    return { status: "forbidden", message: result.kind === "forbidden" ? result.message : "نشست معتبر نیست." };
  }
  if (result.kind === "conflict") return { status: "conflict", message: result.message ?? "رکورد از زمان مشاهده تغییر کرده است." };
  if (result.kind === "invalid") return { status: "invalid", message: result.message ?? "درخواست معتبر نیست." };
  return { status: "unavailable", message: "سرویس Break-glass در دسترس نیست." };
}

export async function requestBreakGlass(
  _previous: BreakGlassActionState,
  data: FormData,
): Promise<BreakGlassActionState> {
  if (text(data, "confirmation") !== "confirm-break-glass-request") {
    return { status: "invalid", message: "تأیید صریح درخواست الزامی است." };
  }
  const capability = text(data, "capability") as BreakGlassCapability;
  if (capability !== "health.read.elevated" && capability !== "women_health.read.elevated") {
    return { status: "invalid", message: "Capability معتبر نیست." };
  }
  const ttlRaw = text(data, "ttlMinutes");
  const ttlMinutes = /^\d+$/.test(ttlRaw) ? Number(ttlRaw) : 0;
  const reason = text(data, "reason");
  const key = idempotencyKey(data);
  if (!key || reason.length < 10) return { status: "invalid", message: "دلیل و شناسه درخواست معتبر نیست." };

  return mapResult(
    await createBreakGlassRequest({
      subjectPersonId: text(data, "subjectPersonId"),
      capability,
      ttlMinutes,
      reason,
      idempotencyKey: key,
    }),
  );
}

export async function reviewBreakGlass(
  _previous: BreakGlassActionState,
  data: FormData,
): Promise<BreakGlassActionState> {
  if (text(data, "confirmation") !== "confirm-break-glass-change") {
    return { status: "invalid", message: "تأیید صریح تغییر الزامی است." };
  }
  const action = text(data, "action") as BreakGlassAction;
  if (action !== "approve" && action !== "deny" && action !== "revoke") {
    return { status: "invalid", message: "Action معتبر نیست." };
  }
  const versionRaw = text(data, "expectedVersion");
  const expectedVersion = /^\d+$/.test(versionRaw) ? Number(versionRaw) : 0;
  const reason = text(data, "reason");
  const key = idempotencyKey(data);
  if (!key || expectedVersion < 1 || reason.length < 10) {
    return { status: "invalid", message: "نسخه، دلیل یا شناسه درخواست معتبر نیست." };
  }

  return mapResult(
    await mutateBreakGlassRequest({
      requestId: text(data, "requestId"),
      action,
      expectedVersion,
      reason,
      idempotencyKey: key,
    }),
  );
}
