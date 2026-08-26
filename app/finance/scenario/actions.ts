"use server";

import { revalidatePath } from "next/cache";
import { configureFinanceScenario } from "@/src/lib/admin-api/finance-scenarios";

export type ScenarioActionState = {
  status: "idle" | "success" | "invalid" | "forbidden" | "conflict" | "unavailable";
  message?: string;
};

export const initialScenarioActionState: ScenarioActionState = { status: "idle" };

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveScenarioAction(
  _previous: ScenarioActionState,
  data: FormData,
): Promise<ScenarioActionState> {
  if (text(data, "confirmation") !== "confirm-finance-scenario") {
    return { status: "invalid", message: "تأیید صریح تغییر سناریو الزامی است." };
  }

  const scenarioId = text(data, "scenarioId") || null;
  const kind = text(data, "scenarioKind");
  const name = text(data, "name");
  const currency = text(data, "currency").toUpperCase();
  const validFrom = text(data, "validFrom");
  const validTo = text(data, "validTo");
  const reason = text(data, "reason");
  const idempotencyKey = text(data, "idempotencyKey");
  const versionRaw = text(data, "expectedVersion");

  if (kind !== "BASE" && kind !== "UPSIDE" && kind !== "DOWNSIDE") {
    return { status: "invalid", message: "نوع سناریو معتبر نیست." };
  }
  if (!/^[A-Z]{3}$/.test(currency) || validTo < validFrom) {
    return { status: "invalid", message: "Currency یا بازه زمانی معتبر نیست." };
  }
  if (name.length < 1 || name.length > 120 || reason.length < 10 || reason.length > 1000) {
    return { status: "invalid", message: "نام یا دلیل تغییر معتبر نیست." };
  }
  if (!/^[A-Za-z0-9._:-]{8,180}$/.test(idempotencyKey)) {
    return { status: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }

  let assumptions: {
    code: string;
    label: string;
    amountMinor: string;
    classification: "BUDGET" | "FORECAST";
  }[];
  try {
    const parsed = JSON.parse(text(data, "assumptions")) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 100) throw new Error();
    assumptions = parsed.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error();
      const row = item as Record<string, unknown>;
      if (
        typeof row.code !== "string" ||
        typeof row.label !== "string" ||
        typeof row.amountMinor !== "string" ||
        !/^-?\d+$/.test(row.amountMinor) ||
        (row.classification !== "BUDGET" && row.classification !== "FORECAST")
      )
        throw new Error();
      return {
        code: row.code,
        label: row.label,
        amountMinor: row.amountMinor,
        classification: row.classification,
      };
    });
  } catch {
    return { status: "invalid", message: "ساختار assumptions معتبر نیست." };
  }

  const expectedVersion = scenarioId && /^\d+$/.test(versionRaw) ? Number(versionRaw) : null;
  if (scenarioId && (!expectedVersion || expectedVersion < 1)) {
    return { status: "invalid", message: "نسخه سناریو معتبر نیست." };
  }

  const result = await configureFinanceScenario({
    scenarioId,
    scenarioKind: kind,
    name,
    currency,
    validFrom,
    validTo,
    assumptions,
    expectedVersion,
    reason,
    idempotencyKey,
  });

  if (result.kind === "ok") {
    revalidatePath("/finance/scenario");
    return { status: "success", message: `نسخه ${result.version} ثبت و Audit شد.` };
  }
  if (result.kind === "conflict") return { status: "conflict", message: result.message };
  if (result.kind === "invalid") return { status: "invalid", message: result.message };
  if (result.kind === "forbidden" || result.kind === "unauthenticated") {
    return {
      status: "forbidden",
      message: result.kind === "forbidden" ? result.message : "نشست معتبر نیست.",
    };
  }
  return {
    status: "unavailable",
    message: result.correlationId ? `کد پیگیری: ${result.correlationId}` : "سرویس در دسترس نیست.",
  };
}
