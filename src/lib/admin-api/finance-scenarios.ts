import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

import {
  type FinanceScenariosResponse,
  parseFinanceScenariosResponse,
} from "./finance-scenarios-contract";

export type { FinanceScenario } from "./finance-scenarios-contract";

export type FinanceScenariosResult =
  | { kind: "ok"; data: FinanceScenariosResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

export type FinanceScenarioMutationResult =
  | { kind: "ok"; scenarioId: string; version: number }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "invalid"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function problem(response: Response) {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      message:
        typeof body.detail === "string"
          ? body.detail
          : typeof body.message === "string"
            ? body.message
            : undefined,
      correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
    };
  } catch {
    return {};
  }
}

export async function getFinanceScenarios(): Promise<FinanceScenariosResult> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/finance/scenarios`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseFinanceScenariosResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  return { kind: "unavailable", correlationId: (await problem(response)).correlationId };
}

export async function configureFinanceScenario(input: {
  scenarioId: string | null;
  scenarioKind: "BASE" | "UPSIDE" | "DOWNSIDE";
  name: string;
  currency: string;
  validFrom: string;
  validTo: string;
  assumptions: {
    code: string;
    label: string;
    amountMinor: string;
    classification: "BUDGET" | "FORECAST";
  }[];
  expectedVersion: number | null;
  reason: string;
  idempotencyKey: string;
}): Promise<FinanceScenarioMutationResult> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  const path = input.scenarioId
    ? `/api/v1/finance/scenarios/${input.scenarioId}`
    : "/api/v1/finance/scenarios";
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}${path}`, {
      method: input.scenarioId ? "PUT" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        scenarioKind: input.scenarioKind,
        name: input.name,
        currency: input.currency,
        validFrom: input.validFrom,
        validTo: input.validTo,
        assumptions: input.assumptions,
        expectedVersion: input.expectedVersion,
        reason: input.reason,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const body = (await response.json()) as Record<string, unknown>;
    if (typeof body.scenarioId !== "string" || !Number.isInteger(body.version)) {
      return { kind: "unavailable" };
    }
    return { kind: "ok", scenarioId: body.scenarioId, version: Number(body.version) };
  }
  const issue = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message: issue.message };
  if (response.status === 409 || response.status === 404) {
    return { kind: "conflict", message: issue.message };
  }
  if (response.status === 400) return { kind: "invalid", message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}
