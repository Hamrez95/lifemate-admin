"use server";

import { revalidatePath } from "next/cache";

import { updatePreferencePurposePolicy } from "@/src/lib/admin-api/privacy-preference-policies";

export async function updatePreferencePurposeAction(formData: FormData): Promise<void> {
  const purpose = String(formData.get("purpose") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const policyVersion = String(formData.get("policyVersion") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const reasonCode = String(formData.get("reasonCode") ?? "policy_admin_update").trim();
  if (status !== "Active" && status !== "Retired") return;

  const result = await updatePreferencePurposePolicy({
    purpose,
    expectedUpdatedAt,
    description,
    policyVersion,
    status,
    reasonCode,
  });
  if (result.ok) revalidatePath("/privacy/preference-purposes");
}
