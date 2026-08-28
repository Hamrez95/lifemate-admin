import "server-only";

import { getServerAdminAccessToken } from "@/src/lib/admin-api/session";
import { getPublicRuntimeConfig } from "@/src/lib/runtime-config";

export type ResearchDataset = {
  datasetId: string;
  name: string;
  datasetKind: string;
  purpose: string;
  sourceCategory: string;
  filters: Record<string, unknown>;
  datasetVersion: number;
  status: string;
  privacyPolicyVersion: number;
  ageBucketYears: number | null;
  minimumCohortSize: number;
  smallCellThreshold: number;
  quasiIdentifierRules: Record<string, unknown>;
  rowMode: string;
  updatedAtUtc: string;
};

export type ResearchExportJob = {
  jobId: string;
  datasetId: string;
  datasetVersion: number;
  privacyPolicyVersion: number;
  format: string;
  status: string;
  cohortSize: number | null;
  reasonCode: string | null;
  artifactSha256: string | null;
  artifactExpiresAtUtc: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export type ResearchResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "invalid"; message?: string }
  | { kind: "unavailable"; correlationId?: string };

async function adminFetch(path: string, init?: RequestInit): Promise<Response | null> {
  const token = await getServerAdminAccessToken();
  if (!token) return null;
  const { adminApiUrl } = getPublicRuntimeConfig();
  try {
    return await fetch(`${adminApiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}

async function mapped<T>(response: Response | null): Promise<ResearchResult<T>> {
  if (response === null) return { kind: "unauthenticated" };
  if (response.ok) {
    try {
      return { kind: "ok", data: (await response.json()) as T };
    } catch {
      return { kind: "unavailable" };
    }
  }
  if (response.status === 401) return { kind: "unauthenticated" };
  if (response.status === 403) return { kind: "forbidden" };
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // Keep transport details private and fail closed.
  }
  if (response.status === 400 || response.status === 409) {
    return {
      kind: "invalid",
      message: typeof body.message === "string" ? body.message : undefined,
    };
  }
  return {
    kind: "unavailable",
    correlationId: typeof body.correlationId === "string" ? body.correlationId : undefined,
  };
}

export async function listResearchDatasets(): Promise<
  ResearchResult<{ items: ResearchDataset[] }>
> {
  return mapped(await adminFetch("/api/v1/research/datasets"));
}

export async function previewResearchDataset(
  datasetId: string,
): Promise<ResearchResult<{ preview: Record<string, unknown> }>> {
  return mapped(
    await adminFetch(`/api/v1/research/datasets/${encodeURIComponent(datasetId)}/preview`),
  );
}

export async function listResearchExports(
  datasetId: string,
): Promise<ResearchResult<{ items: ResearchExportJob[] }>> {
  return mapped(
    await adminFetch(`/api/v1/research/datasets/${encodeURIComponent(datasetId)}/exports`),
  );
}

export async function createResearchDataset(input: {
  payload: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<ResearchResult<{ datasetId: string }>> {
  return mapped(
    await adminFetch("/api/v1/research/datasets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify(input.payload),
    }),
  );
}

export async function requestResearchExport(input: {
  datasetId: string;
  format: "CSV" | "XLSX";
  idempotencyKey: string;
}): Promise<ResearchResult<{ jobId: string; status: string }>> {
  return mapped(
    await adminFetch(`/api/v1/research/datasets/${encodeURIComponent(input.datasetId)}/exports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify({ format: input.format }),
    }),
  );
}

export async function getResearchExportDownload(jobId: string): Promise<
  ResearchResult<{
    jobId: string;
    format: string;
    artifactSha256: string;
    artifactExpiresAtUtc: string;
    signedUrl: string;
    expiresInSeconds: number;
  }>
> {
  return mapped(await adminFetch(`/api/v1/research/exports/${encodeURIComponent(jobId)}/download`));
}
