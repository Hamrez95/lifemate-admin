"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createResearchDataset,
  requestResearchExport,
} from "@/src/lib/admin-api/research-studio";

const KINDS = new Set([
  "HealthObservationAggregate",
  "DoseAdherenceAggregate",
  "TreatmentAggregate",
  "WomenCycleAggregate",
]);

function text(form: FormData, key: string, max = 160): string {
  const value = form.get(key);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function integer(form: FormData, key: string): number | null {
  const value = text(form, key, 16);
  if (!value) return null;
  if (!/^\d+$/.test(value)) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function datasetDateKeys(kind: string): [string, string] {
  if (kind === "HealthObservationAggregate") return ["observedFrom", "observedTo"];
  if (kind === "DoseAdherenceAggregate") return ["scheduledFrom", "scheduledTo"];
  if (kind === "TreatmentAggregate") return ["startedFrom", "startedTo"];
  return ["loggedFrom", "loggedTo"];
}

function resultRedirect(code: string, datasetId?: string): never {
  const query = new URLSearchParams({ status: code });
  if (datasetId) query.set("dataset", datasetId);
  redirect(`/research?${query.toString()}`);
}

export async function createDatasetAction(form: FormData) {
  const kind = text(form, "datasetKind", 48);
  if (!KINDS.has(kind)) resultRedirect("invalid");

  const name = text(form, "name", 160);
  const purpose = text(form, "purpose", 80);
  const sourceCategory = text(form, "sourceCategory", 80);
  const from = text(form, "from", 10);
  const to = text(form, "to", 10);
  const minimumCohortSize = integer(form, "minimumCohortSize");
  const smallCellThreshold = integer(form, "smallCellThreshold");
  const ageBucketYears = integer(form, "ageBucketYears");
  const ageMin = integer(form, "ageMin");
  const ageMax = integer(form, "ageMax");

  if (
    name.length < 3 ||
    !/^[a-z][a-z0-9._-]{2,79}$/.test(purpose) ||
    !/^[A-Za-z][A-Za-z0-9_-]{2,79}$/.test(sourceCategory) ||
    minimumCohortSize === null ||
    smallCellThreshold === null
  ) {
    resultRedirect("invalid");
  }

  const filters: Record<string, unknown> = {};
  const [fromKey, toKey] = datasetDateKeys(kind);
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) filters[fromKey] = from;
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) filters[toKey] = to;
  if (ageMin !== null) filters.ageMin = ageMin;
  if (ageMax !== null) filters.ageMax = ageMax;

  const result = await createResearchDataset({
    idempotencyKey: `research-dataset-${randomUUID()}`,
    payload: {
      name,
      datasetKind: kind,
      purpose,
      sourceCategory,
      filters,
      ageBucketYears,
      minimumCohortSize,
      smallCellThreshold,
      quasiIdentifierRules: {},
      rowMode: "Aggregate",
    },
  });

  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") resultRedirect("forbidden");
  if (result.kind !== "ok") resultRedirect(result.kind === "invalid" ? "invalid" : "unavailable");

  revalidatePath("/research");
  resultRedirect("created", result.data.datasetId);
}

export async function requestExportAction(form: FormData) {
  const datasetId = text(form, "datasetId", 64);
  const format = text(form, "format", 8);
  if (!/^[0-9a-f-]{36}$/i.test(datasetId) || (format !== "CSV" && format !== "XLSX")) {
    resultRedirect("invalid", datasetId || undefined);
  }

  const result = await requestResearchExport({
    datasetId,
    format: format as "CSV" | "XLSX",
    idempotencyKey: `research-export-${randomUUID()}`,
  });
  if (result.kind === "unauthenticated") redirect("/login");
  if (result.kind === "forbidden") resultRedirect("forbidden", datasetId);
  if (result.kind !== "ok") resultRedirect(result.kind === "invalid" ? "invalid" : "unavailable", datasetId);

  revalidatePath("/research");
  resultRedirect("export_requested", datasetId);
}
