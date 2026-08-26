import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type ElevatedHealthCapability = "health.read.elevated" | "women_health.read.elevated";

export type ElevatedHealthData = {
  subjectPersonId: string;
  capability: ElevatedHealthCapability;
  observations?: Array<{
    observationType: string;
    valuePrimary: number | null;
    valueSecondary: number | null;
    unitPrimary: string | null;
    unitSecondary: string | null;
    observedAtUtc: string;
    sourceCategory: string | null;
  }>;
  medications?: Array<{
    name: string;
    strengthText: string | null;
    form: string | null;
    updatedAtUtc: string;
  }>;
  treatmentPlans?: Array<{
    doseText: string;
    startDate: string;
    endDate: string | null;
    status: string;
    updatedAtUtc: string;
  }>;
  episodes?: Array<{
    startedOn: string;
    endedOn: string | null;
    updatedAtUtc: string;
  }>;
  freshness: { status: "fresh"; asOfUtc: string };
};

export type ElevatedHealthResult =
  | { kind: "ok"; data: ElevatedHealthData }
  | { kind: "unauthenticated" }
  | { kind: "forbidden"; message?: string }
  | { kind: "invalid"; message?: string; correlationId?: string }
  | { kind: "unavailable"; correlationId?: string };

function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function capability(value: string): value is ElevatedHealthCapability {
  return value === "health.read.elevated" || value === "women_health.read.elevated";
}

function array(value: unknown): value is Array<Record<string, unknown>> {
  return (
    Array.isArray(value) &&
    value.every((item) => item && typeof item === "object" && !Array.isArray(item))
  );
}

function parse(value: unknown): ElevatedHealthData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const freshness = body.freshness as Record<string, unknown> | undefined;
  if (
    typeof body.subjectPersonId !== "string" ||
    !uuid(body.subjectPersonId) ||
    typeof body.capability !== "string" ||
    !capability(body.capability) ||
    freshness?.status !== "fresh" ||
    typeof freshness.asOfUtc !== "string"
  )
    return null;
  if (body.capability === "health.read.elevated") {
    if (!array(body.observations) || !array(body.medications) || !array(body.treatmentPlans))
      return null;
  } else if (!array(body.episodes)) return null;
  return body as unknown as ElevatedHealthData;
}

async function problem(response: Response): Promise<{ message?: string; correlationId?: string }> {
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

export async function getElevatedHealth(input: {
  subjectPersonId: string;
  capability: ElevatedHealthCapability;
  limit?: number;
}): Promise<ElevatedHealthResult> {
  if (!uuid(input.subjectPersonId) || !capability(input.capability)) {
    return { kind: "invalid", message: "Person یا Capability معتبر نیست." };
  }
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 50);
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };
  const config = getPublicRuntimeConfig();
  const url = new URL(
    `/api/v1/security/elevated-health/${input.subjectPersonId}`,
    config.adminApiUrl,
  );
  url.searchParams.set("capability", input.capability);
  url.searchParams.set("limit", String(limit));

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  const details = response.ok ? {} : await problem(response);
  if (response.status === 403) return { kind: "forbidden", message: details.message };
  if (response.status === 400 || response.status === 404 || response.status === 422) {
    return { kind: "invalid", ...details };
  }
  if (!response.ok) return { kind: "unavailable", correlationId: details.correlationId };
  const parsed = parse(await response.json());
  return parsed ? { kind: "ok", data: parsed } : { kind: "unavailable" };
}
