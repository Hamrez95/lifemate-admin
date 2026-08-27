"use server";

import { revalidatePath } from "next/cache";

import {
  retireAbuseRule,
  type AbuseMutationResult,
  type AbuseRule,
  upsertAbuseRule,
} from "@/src/lib/admin-api/abuse-rules";

export type AbuseActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialAbuseActionState: AbuseActionState = { status: "idle" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY = /^[a-z][a-z0-9._-]{2,79}$/;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,180}$/;

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalInteger(formData: FormData, key: string, min: number, max: number): number | null | undefined {
  const raw = text(formData, key);
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
}

function optionalKey(formData: FormData, key: string): string | null | undefined {
  const raw = text(formData, key).toLowerCase();
  if (!raw) return null;
  return KEY.test(raw) ? raw : undefined;
}

function common(formData: FormData): { reason: string; idempotencyKey: string } | { error: AbuseActionState } {
  const reason = text(formData, "reason");
  const idempotencyKey = text(formData, "idempotencyKey");
  if (reason.length < 10 || reason.length > 1000) {
    return { error: { status: "invalid", message: "دلیل باید بین ۱۰ تا ۱۰۰۰ نویسه باشد." } };
  }
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) {
    return { error: { status: "invalid", message: "شناسه امن درخواست معتبر نیست." } };
  }
  return { reason, idempotencyKey };
}

function resultState(result: AbuseMutationResult, successMessage: string): AbuseActionState {
  if (result.kind === "ok") {
    return { status: "success", message: result.replayed ? `${successMessage} (replay امن)` : successMessage };
  }
  if (result.kind === "unauthenticated" || result.kind === "forbidden") {
    return {
      status: "forbidden",
      message: result.kind === "forbidden" ? "مجوز مدیریت Abuse Rules وجود ندارد." : "نشست مدیریتی معتبر نیست.",
    };
  }
  if (result.kind === "invalid") return { status: "invalid", message: result.message ?? "Rule معتبر نیست." };
  if (result.kind === "conflict") return { status: "conflict", message: result.message ?? "نسخه Rule تغییر کرده است." };
  return {
    status: "unavailable",
    message: result.correlationId ? `سرویس Abuse در دسترس نیست. کد پیگیری: ${result.correlationId}` : "سرویس Abuse در دسترس نیست.",
  };
}

function refresh() {
  revalidatePath("/security");
  revalidatePath("/security/abuse");
}

export async function upsertAbuseRuleAction(
  _previous: AbuseActionState,
  formData: FormData,
): Promise<AbuseActionState> {
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  if (text(formData, "confirmation") !== "confirm-abuse-rule") {
    return { status: "invalid", message: "تأیید صریح تغییر Rule لازم است." };
  }
  const code = text(formData, "code").toLowerCase();
  const contextCode = text(formData, "contextCode").toLowerCase();
  const displayName = text(formData, "displayName");
  const ruleKind = text(formData, "ruleKind") as AbuseRule["ruleKind"];
  const subjectScope = text(formData, "subjectScope") as AbuseRule["subjectScope"];
  const enforcementAction = text(formData, "enforcementAction") as AbuseRule["enforcementAction"];
  const windowSeconds = optionalInteger(formData, "windowSeconds", 1, 31536000);
  const maxCount = optionalInteger(formData, "maxCount", 1, 1000000);
  const cooldownSeconds = optionalInteger(formData, "cooldownSeconds", 1, 31536000);
  const evidenceCode = optionalKey(formData, "evidenceCode");
  const approvalRequestType = optionalKey(formData, "approvalRequestType");
  const priority = optionalInteger(formData, "priority", 1, 10000);
  const expectedVersion = optionalInteger(formData, "expectedVersion", 1, Number.MAX_SAFE_INTEGER);
  if (!KEY.test(code) || !KEY.test(contextCode) || displayName.length < 2 || displayName.length > 160) {
    return { status: "invalid", message: "Code، context یا display name معتبر نیست." };
  }
  if (
    !["VelocityLimit", "UsageCap", "Cooldown", "DuplicateKey", "EvidenceRequired"].includes(ruleKind) ||
    !["Account", "VerifiedPhone"].includes(subjectScope) ||
    !["Allow", "Deny", "RequireApproval"].includes(enforcementAction) ||
    windowSeconds === undefined || maxCount === undefined || cooldownSeconds === undefined ||
    evidenceCode === undefined || approvalRequestType === undefined || priority === undefined || expectedVersion === undefined
  ) {
    return { status: "invalid", message: "پارامترهای Rule معتبر نیستند." };
  }
  if (enforcementAction === "RequireApproval" ? !approvalRequestType : approvalRequestType !== null) {
    return { status: "invalid", message: "RequireApproval باید approval request type داشته باشد." };
  }
  const shapeValid =
    (ruleKind === "VelocityLimit" && windowSeconds !== null && maxCount !== null && cooldownSeconds === null && evidenceCode === null) ||
    (ruleKind === "UsageCap" && windowSeconds === null && maxCount !== null && cooldownSeconds === null && evidenceCode === null) ||
    (ruleKind === "Cooldown" && windowSeconds === null && maxCount === null && cooldownSeconds !== null && evidenceCode === null) ||
    (ruleKind === "DuplicateKey" && windowSeconds === null && maxCount === null && cooldownSeconds === null && evidenceCode === null) ||
    (ruleKind === "EvidenceRequired" && windowSeconds === null && maxCount === null && cooldownSeconds === null && evidenceCode !== null);
  if (!shapeValid) return { status: "invalid", message: "پارامترها با Rule Kind انتخاب‌شده سازگار نیستند." };
  const state = resultState(
    await upsertAbuseRule({
      code,
      contextCode,
      displayName,
      ruleKind,
      subjectScope,
      enforcementAction,
      windowSeconds,
      maxCount,
      cooldownSeconds,
      evidenceCode,
      approvalRequestType,
      priority: priority ?? 100,
      expectedVersion,
      ...shared,
    }),
    "Abuse Rule با Audit ذخیره شد.",
  );
  if (state.status === "success") refresh();
  return state;
}

export async function retireAbuseRuleAction(
  _previous: AbuseActionState,
  formData: FormData,
): Promise<AbuseActionState> {
  const shared = common(formData);
  if ("error" in shared) return shared.error;
  const ruleId = text(formData, "ruleId");
  const expectedVersion = optionalInteger(formData, "expectedVersion", 1, Number.MAX_SAFE_INTEGER);
  if (!UUID.test(ruleId) || expectedVersion === null || expectedVersion === undefined) {
    return { status: "invalid", message: "Rule id یا version معتبر نیست." };
  }
  if (text(formData, "confirmation") !== "confirm-abuse-rule-retire") {
    return { status: "invalid", message: "تأیید صریح retire لازم است." };
  }
  const state = resultState(
    await retireAbuseRule({ ruleId, expectedVersion, ...shared }),
    "Abuse Rule بازنشسته شد.",
  );
  if (state.status === "success") refresh();
  return state;
}
