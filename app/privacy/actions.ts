"use server";

import { revalidatePath } from "next/cache";

import {
  createPrivacyDocument,
  publishPrivacyDocument,
  retirePrivacyDocument,
} from "@/src/lib/admin-api/privacy-consent";

function tehranDateTimeToIso(value: string): string | null {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) return null;
  const parsed = new Date(`${normalized}:00+03:30`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

export async function createDocumentAction(formData: FormData): Promise<void> {
  const purpose = String(formData.get("purpose") ?? "").trim();
  const version = String(formData.get("version") ?? "").trim();
  const jurisdiction = String(formData.get("jurisdiction") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const documentHash = String(formData.get("documentHash") ?? "").trim();
  const contentUri = String(formData.get("contentUri") ?? "").trim();
  const effectiveAtUtc = tehranDateTimeToIso(String(formData.get("effectiveAtLocal") ?? ""));
  const reasonCode = String(formData.get("reasonCode") ?? "").trim();
  if (!effectiveAtUtc) return;
  const result = await createPrivacyDocument({
    purpose,
    version,
    jurisdiction,
    title,
    documentHash,
    contentUri,
    effectiveAtUtc,
    reasonCode,
  });
  if (result.ok) revalidatePath("/privacy");
}

export async function publishDocumentAction(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim();
  const reasonCode = String(formData.get("reasonCode") ?? "").trim();
  if (!documentId || !expectedUpdatedAt || !reasonCode) return;
  const result = await publishPrivacyDocument({ documentId, expectedUpdatedAt, reasonCode });
  if (result.ok) revalidatePath("/privacy");
}

export async function retireDocumentAction(formData: FormData): Promise<void> {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const expectedUpdatedAt = String(formData.get("expectedUpdatedAt") ?? "").trim();
  const reasonCode = String(formData.get("reasonCode") ?? "").trim();
  if (!documentId || !expectedUpdatedAt || !reasonCode) return;
  const result = await retirePrivacyDocument({ documentId, expectedUpdatedAt, reasonCode });
  if (result.ok) revalidatePath("/privacy");
}
