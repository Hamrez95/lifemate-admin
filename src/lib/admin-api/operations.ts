import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

import {
  type OperationsSnapshot,
  parseOperationsSnapshot,
} from "./operations-contract";

export type { OperationsSnapshot } from "./operations-contract";

export type OperationsSnapshotResult =
  | { kind: "ok"; snapshot: OperationsSnapshot }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

async function accessToken(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function getOperationsSnapshot(): Promise<OperationsSnapshotResult> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(
      `${config.adminApiUrl}/api/v1/operations/snapshot`,
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
    const snapshot = parseOperationsSnapshot(await response.json());
    return snapshot ? { kind: "ok", snapshot } : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };

  try {
    const body = (await response.json()) as Record<string, unknown>;
    return {
      kind: "unavailable",
      correlationId:
        typeof body.correlationId === "string"
          ? body.correlationId
          : undefined,
    };
  } catch {
    return { kind: "unavailable" };
  }
}
