import { getPublicRuntimeConfig } from "../runtime-config";
import { createServerSupabaseClient } from "../supabase/server";
import { parseFinanceCashResponse, type FinanceCashResponse } from "./finance-cash-contract";

export type {
  FinanceActualCashPlanning,
  FinanceCashBalance,
  FinanceCashForecast,
  FinanceCashResponse,
  FinanceCashState,
  FinanceForecastAssumption,
  FinanceForecastScenario,
  FinanceRunway,
  FinanceRunwayState,
  FinanceScenario,
} from "./finance-cash-contract";

export type FinanceCashResult =
  | { kind: "ok"; data: FinanceCashResponse }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid" }
  | { kind: "unavailable"; correlationId?: string };

async function correlationId(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { correlationId?: unknown };
    return typeof body.correlationId === "string" ? body.correlationId : undefined;
  } catch {
    return undefined;
  }
}

export async function getFinanceCashPlanning(params: URLSearchParams): Promise<FinanceCashResult> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return { kind: "unauthenticated" };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/finance/cash-planning?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const parsed = parseFinanceCashResponse(await response.json());
    return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  if (response.status === 400) return { kind: "invalid" };
  return { kind: "unavailable", correlationId: await correlationId(response) };
}
