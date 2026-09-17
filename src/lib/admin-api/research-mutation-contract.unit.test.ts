import { describe, expect, it } from "vitest";

import { parseResearchMutationSuccess } from "./research-mutation-contract";

const DATASET_ID = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_DATASET_ID = "123e4567-e89b-42d3-a456-426614174001";
const JOB_ID = "123e4567-e89b-42d3-a456-426614174002";

describe("research mutation success contract", () => {
  it("accepts dataset creation only with canonical HTTP 201 and UUID identity", () => {
    expect(
      parseResearchMutationSuccess({ datasetId: DATASET_ID }, 201, { kind: "create-dataset" }),
    ).toEqual({ datasetId: DATASET_ID });
    expect(
      parseResearchMutationSuccess({ datasetId: DATASET_ID }, 200, { kind: "create-dataset" }),
    ).toBeNull();
    expect(
      parseResearchMutationSuccess({ datasetId: "not-a-uuid" }, 201, { kind: "create-dataset" }),
    ).toBeNull();
    expect(parseResearchMutationSuccess(null, 201, { kind: "create-dataset" })).toBeNull();
  });

  it("binds export success to exact dataset, format, Pending state and HTTP 202", () => {
    const body = {
      jobId: JOB_ID,
      datasetId: DATASET_ID,
      format: "CSV",
      status: "Pending",
    };
    const expected = {
      kind: "request-export",
      datasetId: DATASET_ID,
      format: "CSV",
    } as const;

    expect(parseResearchMutationSuccess(body, 202, expected)).toEqual(body);
    expect(parseResearchMutationSuccess(body, 200, expected)).toBeNull();
    expect(
      parseResearchMutationSuccess({ ...body, datasetId: OTHER_DATASET_ID }, 202, expected),
    ).toBeNull();
    expect(parseResearchMutationSuccess({ ...body, format: "XLSX" }, 202, expected)).toBeNull();
    expect(
      parseResearchMutationSuccess({ ...body, status: "Completed" }, 202, expected),
    ).toBeNull();
    expect(parseResearchMutationSuccess({ ...body, jobId: "invalid" }, 202, expected)).toBeNull();
  });

  it("accepts case-insensitive UUID identity while preserving canonical response values", () => {
    const upperDatasetId = DATASET_ID.toUpperCase();
    const body = {
      jobId: JOB_ID,
      datasetId: upperDatasetId,
      format: "XLSX",
      status: "Pending",
    };

    expect(
      parseResearchMutationSuccess(body, 202, {
        kind: "request-export",
        datasetId: DATASET_ID,
        format: "XLSX",
      }),
    ).toEqual(body);
  });
});
