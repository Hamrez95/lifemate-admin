"use server";

import { revalidatePath } from "next/cache";

import { retirePrivacyDocument } from "@/src/lib/admin-api/privacy-consent";

export async function retireDocumentAction(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim();
  const reasonCode = String(formData.get("reasonCode") ?? "").trim();
  if (!documentId || !expectedUpdatedAt || !reasonCode) return;
  const result = await retirePrivacyDocument({ documentId, expectedUpdatedAt, reasonCode });
  if (result.ok) revalidatePath("/privacy");
}
