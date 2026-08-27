"use server";

import { revalidatePath } from "next/cache";

import {
  reviewGrowthRewardSource,
  upsertGrowthRewardRule,
} from "@/src/lib/admin-api/growth-rewards";

export type GrowthRewardActionState = { status: "idle" | "success" | "error"; message: string };
export const initialGrowthRewardActionState: GrowthRewardActionState = {
  status: "idle",
  message: "",
};

function text(form: FormData, name: string, min: number, max: number): string | null {
  const value = form.get(name);
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= min && normalized.length <= max ? normalized : null;
}

function positiveInteger(form: FormData, name: string, allowZero = false): number | null {
  const raw = text(form, name, 1, 12);
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= (allowZero ? 0 : 1) ? value : null;
}

function message(
  result: Awaited<ReturnType<typeof upsertGrowthRewardRule>>,
): GrowthRewardActionState {
  if (result.kind === "ok")
    return {
      status: "success",
      message: result.replayed ? "عملیات قبلی با همین کلید بازیابی شد." : "تغییر با موفقیت ثبت شد.",
    };
  if (result.kind === "forbidden")
    return { status: "error", message: "مجوز لازم برای این عملیات وجود ندارد." };
  if (result.kind === "unauthenticated")
    return { status: "error", message: "نشست مدیریتی معتبر نیست." };
  return {
    status: "error",
    message: result.message ?? "عملیات کامل نشد؛ دوباره وضعیت را دریافت کنید.",
  };
}

export async function saveRewardRuleAction(
  _previous: GrowthRewardActionState,
  form: FormData,
): Promise<GrowthRewardActionState> {
  const idempotencyKey = text(form, "idempotencyKey", 8, 180);
  const code = text(form, "code", 3, 80);
  const triggerKind = text(form, "triggerKind", 4, 24);
  const rewardKind = text(form, "rewardKind", 4, 32);
  const status = text(form, "status", 4, 16);
  const reason = text(form, "reason", 10, 1000);
  const expectedVersion = positiveInteger(form, "expectedVersion", true);
  const maxIssuesRaw = text(form, "maxIssuesPerAccount", 1, 12);
  const maxIssuesPerAccount = maxIssuesRaw ? positiveInteger(form, "maxIssuesPerAccount") : null;
  const configRaw = text(form, "rewardConfig", 2, 4096);
  if (
    !idempotencyKey ||
    !code ||
    !triggerKind ||
    !rewardKind ||
    !status ||
    !reason ||
    expectedVersion === null ||
    !configRaw
  ) {
    return { status: "error", message: "فیلدهای rule معتبر نیستند." };
  }
  let rewardConfig: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(configRaw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    rewardConfig = parsed as Record<string, unknown>;
  } catch {
    return { status: "error", message: "Reward Config باید JSON object معتبر باشد." };
  }
  const result = await upsertGrowthRewardRule(
    {
      code,
      triggerKind,
      rewardKind,
      rewardConfig,
      maxIssuesPerAccount,
      status,
      expectedVersion,
      reason,
    },
    idempotencyKey,
  );
  const state = message(result);
  if (state.status === "success") revalidatePath("/commerce/rewards");
  return state;
}

export async function reviewRewardSourceAction(
  _previous: GrowthRewardActionState,
  form: FormData,
): Promise<GrowthRewardActionState> {
  const idempotencyKey = text(form, "idempotencyKey", 8, 180);
  const kind = text(form, "kind", 4, 16);
  const sourceId = text(form, "sourceId", 36, 36);
  const decision = text(form, "decision", 6, 7)?.toLowerCase();
  const expectedVersion = positiveInteger(form, "expectedVersion");
  const reason = text(form, "reason", 10, 1000);
  if (
    !idempotencyKey ||
    (kind !== "Referral" && kind !== "Advocacy") ||
    !sourceId ||
    (decision !== "approve" && decision !== "reject") ||
    expectedVersion === null ||
    !reason
  ) {
    return { status: "error", message: "درخواست review معتبر نیست." };
  }
  const result = await reviewGrowthRewardSource(
    kind,
    sourceId,
    { expectedVersion, decision, reason },
    idempotencyKey,
  );
  const state = message(result);
  if (state.status === "success") revalidatePath("/commerce/rewards");
  return state;
}
