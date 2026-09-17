export type ResearchMutationExpectation =
  | { kind: "create-dataset" }
  | { kind: "request-export"; datasetId: string; format: "CSV" | "XLSX" };

export type ResearchDatasetCreateSuccess = { datasetId: string };
export type ResearchExportRequestSuccess = {
  jobId: string;
  datasetId: string;
  format: "CSV" | "XLSX";
  status: "Pending";
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function exactUuid(value: unknown, expected: string): value is string {
  return (
    typeof value === "string" &&
    UUID.test(value) &&
    UUID.test(expected) &&
    value.toLowerCase() === expected.toLowerCase()
  );
}

export function parseResearchMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: { kind: "create-dataset" },
): ResearchDatasetCreateSuccess | null;
export function parseResearchMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: { kind: "request-export"; datasetId: string; format: "CSV" | "XLSX" },
): ResearchExportRequestSuccess | null;
export function parseResearchMutationSuccess(
  value: unknown,
  httpStatus: number,
  expected: ResearchMutationExpectation,
): ResearchDatasetCreateSuccess | ResearchExportRequestSuccess | null {
  const body = record(value);
  if (!body) return null;

  if (expected.kind === "create-dataset") {
    if (httpStatus !== 201 || typeof body.datasetId !== "string" || !UUID.test(body.datasetId)) {
      return null;
    }
    return { datasetId: body.datasetId };
  }

  if (
    httpStatus !== 202 ||
    typeof body.jobId !== "string" ||
    !UUID.test(body.jobId) ||
    !exactUuid(body.datasetId, expected.datasetId) ||
    body.format !== expected.format ||
    body.status !== "Pending"
  ) {
    return null;
  }

  return {
    jobId: body.jobId,
    datasetId: body.datasetId,
    format: expected.format,
    status: "Pending",
  };
}
