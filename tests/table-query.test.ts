import { describe, expect, it } from "vitest";

import {
  getTotalPages,
  parseFilterState,
  parseTableQuery,
  toTableSearchParams,
} from "../src/components/admin-data-table";

describe("table query contract", () => {
  it("bounds page size and allow-lists sorting", () => {
    const params = new URLSearchParams({
      page: "3",
      pageSize: "999",
      sort: "createdAt",
      direction: "desc",
      q: "  test  ",
    });

    expect(parseTableQuery(params, { allowedSorts: ["createdAt"] })).toEqual({
      page: 3,
      pageSize: 100,
      search: "test",
      sort: "createdAt",
      direction: "desc",
    });
  });

  it("rejects invalid pagination and sort values", () => {
    const params = new URLSearchParams({ page: "0", pageSize: "-1", sort: "unknown" });
    expect(parseTableQuery(params, { allowedSorts: ["createdAt"] })).toEqual({
      page: 1,
      pageSize: 25,
      search: undefined,
      sort: undefined,
      direction: undefined,
    });
  });

  it("serializes page state and computes total pages", () => {
    const serialized = toTableSearchParams({
      page: 2,
      pageSize: 25,
      search: "sample",
      sort: "createdAt",
      direction: "asc",
    });

    expect(serialized.get("page")).toBe("2");
    expect(serialized.get("pageSize")).toBe("25");
    expect(serialized.get("q")).toBe("sample");
    expect(getTotalPages(51, 25)).toBe(3);
  });
});

describe("table filters", () => {
  it("accepts only configured keys and bounds values", () => {
    const params = new URLSearchParams();
    params.append("filter.status", " active ");
    params.append("filter.status", "pending");
    params.append("filter.status", "ignored");
    params.append("filter.other", "unused");

    const filters = parseFilterState(params, {
      status: { maxValues: 2, maxValueLength: 16 },
    });

    expect(filters).toEqual({ status: ["active", "pending"] });
    expect(filters).not.toHaveProperty("other");
  });
});
