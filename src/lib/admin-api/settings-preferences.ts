import "server-only";

import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";
import { createServerSupabaseClient } from "@/src/lib/supabase/server";

import {
  type CommandCenterPreferences,
  parseCommandCenterPreferencesResponse,
} from "./settings-preferences-contract";

export type { CommandCenterPreferences } from "./settings-preferences-contract";

export type CommandCenterPreferencesResult =
  | { kind: "ok"; preferences: CommandCenterPreferences; supportedLocales: string[] }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; correlationId?: string };

export type CommandCenterPreferencesMutationResult =
  | { kind: "ok" }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "conflict"; message?: string }
  | { kind: "invalid"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,180}$/;

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
        typeof body.title === "string"
          ? body.title
          : typeof body.detail === "string"
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

export async function getCommandCenterPreferences(): Promise<CommandCenterPreferencesResult> {
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/settings/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) {
    const parsed = parseCommandCenterPreferencesResponse(await response.json());
    return parsed
      ? { kind: "ok", preferences: parsed.preferences, supportedLocales: parsed.supportedLocales }
      : { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  return { kind: "unavailable", correlationId: (await problem(response)).correlationId };
}

export async function configureCommandCenterPreferences(input: {
  locale: string;
  timeZone: string;
  displayName: string;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}): Promise<CommandCenterPreferencesMutationResult> {
  if (!IDEMPOTENCY_PATTERN.test(input.idempotencyKey)) {
    return { kind: "invalid", message: "شناسه امن درخواست معتبر نیست." };
  }
  const token = await accessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/settings/preferences`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        locale: input.locale,
        timeZone: input.timeZone,
        displayName: input.displayName,
        expectedVersion: input.expectedVersion,
        reason: input.reason,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.ok) return { kind: "ok" };
  const issue = await problem(response);
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden", message: issue.message };
  if (response.status === 409) return { kind: "conflict", message: issue.message };
  if (response.status === 400) return { kind: "invalid", message: issue.message };
  return { kind: "unavailable", correlationId: issue.correlationId };
}
