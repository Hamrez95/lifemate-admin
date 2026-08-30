import { redirect } from "next/navigation";
import { cache } from "react";

import type {
  AdminAccessResult,
  AdminApiProblem,
  AdminCapabilitySnapshot,
} from "@/src/lib/admin-api/types";
import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

async function parseProblem(response: Response): Promise<AdminApiProblem | null> {
  try {
    const value = (await response.json()) as Partial<AdminApiProblem>;
    if (typeof value.code !== "string" || typeof value.status !== "number") return null;
    return {
      status: value.status,
      code: value.code,
      title: typeof value.title === "string" ? value.title : "Admin API request failed.",
      correlationId: typeof value.correlationId === "string" ? value.correlationId : undefined,
    };
  } catch {
    return null;
  }
}

const getAdminAccessForRequest = cache(async (): Promise<AdminAccessResult> => {
  const token = await getServerAdminAccessToken();
  if (!token) return { kind: "unauthenticated" };

  const config = getPublicRuntimeConfig();
  let response: Response;
  try {
    response = await fetch(`${config.adminApiUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { kind: "unavailable" };
  }

  if (response.ok) {
    const body = (await response.json()) as { admin?: AdminCapabilitySnapshot };
    if (
      !body.admin ||
      typeof body.admin.accountId !== "string" ||
      !Array.isArray(body.admin.roles) ||
      !Array.isArray(body.admin.permissions)
    ) {
      return { kind: "unavailable" };
    }
    return { kind: "ok", admin: body.admin };
  }

  const problem = await parseProblem(response);
  if (problem?.code === "mfa_required") return { kind: "mfa_required" };
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) {
    return { kind: "forbidden", code: problem?.code ?? "admin_permission_denied" };
  }
  return { kind: "unavailable", correlationId: problem?.correlationId };
});

export async function getAdminAccess(): Promise<AdminAccessResult> {
  return getAdminAccessForRequest();
}

export async function requireAdminAccess(): Promise<AdminCapabilitySnapshot> {
  const result = await getAdminAccess();
  if (result.kind === "ok") return result.admin;
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "mfa_required") redirect("/login?step=mfa");
  if (result.kind === "forbidden") redirect("/forbidden");

  throw new Error(
    result.correlationId
      ? `LifeMate Admin API unavailable (${result.correlationId}).`
      : "LifeMate Admin API unavailable.",
  );
}
