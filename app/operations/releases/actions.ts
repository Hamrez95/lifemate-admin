"use server";

import { redirect } from "next/navigation";

import { putProductUpdatePolicy } from "@/src/lib/admin-api/product-release";
import { requireAdminAccess } from "@/src/lib/admin-api/server";

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function saveProductUpdatePolicyAction(formData: FormData) {
  const admin = await requireAdminAccess();
  if (!admin.permissions.includes("platform.update_policy.write")) redirect("/forbidden");

  const product = value(formData, "product");
  const platform = value(formData, "platform");
  const minimumSupportedVersion = value(formData, "minimumSupportedVersion");
  const recommendedVersion = value(formData, "recommendedVersion");
  const mode = value(formData, "mode");
  const reasonCode = value(formData, "reasonCode");
  const messageKey = value(formData, "messageKey");
  const status = value(formData, "status");
  const effectiveAtUtc = value(formData, "effectiveAtUtc");
  const expectedVersion = Number(value(formData, "expectedVersion"));
  const reason = value(formData, "reason");
  const idempotencyKey = value(formData, "idempotencyKey");

  if (
    (product !== "wellmate" && product !== "caremate") ||
    !["android", "ios", "web", "windows", "macos", "linux"].includes(platform) ||
    (mode !== "Soft" && mode !== "Force") ||
    !["Routine", "Critical", "Security", "BreakingCompatibility"].includes(reasonCode) ||
    !["Active", "Disabled"].includes(status) ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 0 ||
    idempotencyKey.length < 8
  ) {
    redirect("/operations/releases?status=invalid");
  }

  const result = await putProductUpdatePolicy({
    product,
    platform: platform as "android" | "ios" | "web" | "windows" | "macos" | "linux",
    minimumSupportedVersion,
    recommendedVersion: recommendedVersion || null,
    mode,
    reasonCode: reasonCode as "Routine" | "Critical" | "Security" | "BreakingCompatibility",
    messageKey: messageKey || null,
    status: status as "Active" | "Disabled",
    effectiveAtUtc: new Date(effectiveAtUtc).toISOString(),
    expectedVersion,
    reason,
    idempotencyKey,
  });

  if (result.kind === "ok") redirect("/operations/releases?status=saved");
  if (result.kind === "forbidden") redirect("/operations/releases?status=forbidden");
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "invalid") redirect("/operations/releases?status=conflict");
  redirect("/operations/releases?status=unavailable");
}
