"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createExperiment,
  mutateFeedback,
  setExperimentStatus,
} from "@/src/lib/admin-api/experiments-feedback";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resultStatus(kind: string): string {
  if (kind === "ok") return "saved";
  if (kind === "forbidden") return "forbidden";
  if (kind === "invalid") return "invalid";
  return "unavailable";
}

export async function createExperimentAction(formData: FormData) {
  const guardrails = text(formData, "guardrailMetricCodes")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  let variants: unknown;
  try {
    variants = JSON.parse(text(formData, "variantsJson"));
  } catch {
    redirect("/experiments?status=invalid");
  }

  const result = await createExperiment({
    idempotencyKey: text(formData, "idempotencyKey"),
    payload: {
      experimentKey: text(formData, "experimentKey"),
      name: text(formData, "name"),
      controlKey: text(formData, "controlKey"),
      surface: text(formData, "surface"),
      productCode: text(formData, "productCode") || null,
      segmentKey: text(formData, "segmentKey") || null,
      segmentSnapshotId: text(formData, "segmentSnapshotId") || null,
      primaryMetricCode: text(formData, "primaryMetricCode"),
      guardrailMetricCodes: guardrails,
      variants,
      startsAtUtc: text(formData, "startsAtUtc") || null,
      endsAtUtc: text(formData, "endsAtUtc") || null,
      reason: text(formData, "reason"),
    },
  });
  revalidatePath("/experiments");
  redirect(`/experiments?status=${resultStatus(result.kind)}`);
}

export async function setExperimentStatusAction(formData: FormData) {
  const expectedVersion = Number(text(formData, "expectedVersion"));
  const result = Number.isSafeInteger(expectedVersion) && expectedVersion > 0
    ? await setExperimentStatus({
        experimentKey: text(formData, "experimentKey"),
        status: text(formData, "nextStatus"),
        expectedVersion,
        reason: text(formData, "reason"),
        idempotencyKey: text(formData, "idempotencyKey"),
      })
    : { kind: "invalid" as const };
  revalidatePath("/experiments");
  redirect(`/experiments?status=${resultStatus(result.kind)}`);
}

export async function feedbackAction(formData: FormData) {
  const result = await mutateFeedback({
    itemId: text(formData, "itemId"),
    expectedStatus: text(formData, "expectedStatus"),
    action: text(formData, "feedbackAction"),
    reason: text(formData, "reason"),
    supportTicketId: text(formData, "supportTicketId") || null,
    productIssueRef: text(formData, "productIssueRef") || null,
    idempotencyKey: text(formData, "idempotencyKey"),
  });
  revalidatePath("/experiments");
  redirect(`/experiments?status=${resultStatus(result.kind)}`);
}
