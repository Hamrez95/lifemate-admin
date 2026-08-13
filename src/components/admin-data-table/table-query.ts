export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export type TableQueryState = {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  direction?: "asc" | "desc";
};

type ParseTableQueryOptions = {
  defaultPageSize?: number;
  maxPageSize?: number;
  allowedSorts?: readonly string[];
  maxSearchLength?: number;
};

function parsePositiveInteger(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseTableQuery(
  params: URLSearchParams,
  options: ParseTableQueryOptions = {},
): TableQueryState {
  const maxPageSize = Math.max(options.maxPageSize ?? MAX_PAGE_SIZE, 1);
  const defaultPageSize = Math.min(
    Math.max(options.defaultPageSize ?? DEFAULT_PAGE_SIZE, 1),
    maxPageSize,
  );
  const page = parsePositiveInteger(params.get("page"), 1);
  const requestedPageSize = parsePositiveInteger(params.get("pageSize"), defaultPageSize);
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  const rawSearch = params.get("q")?.trim();
  const maxSearchLength = Math.max(options.maxSearchLength ?? 120, 1);
  const search = rawSearch ? rawSearch.slice(0, maxSearchLength) : undefined;

  const requestedSort = params.get("sort")?.trim();
  const sort =
    requestedSort && options.allowedSorts?.includes(requestedSort)
      ? requestedSort
      : undefined;

  const requestedDirection = params.get("direction");
  const direction =
    sort && (requestedDirection === "asc" || requestedDirection === "desc")
      ? requestedDirection
      : sort
        ? "asc"
        : undefined;

  return { page, pageSize, search, sort, direction };
}

export function toTableSearchParams(state: TableQueryState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, state.page)));
  params.set("pageSize", String(Math.min(Math.max(1, state.pageSize), MAX_PAGE_SIZE)));

  if (state.search?.trim()) params.set("q", state.search.trim());
  if (state.sort) {
    params.set("sort", state.sort);
    params.set("direction", state.direction === "desc" ? "desc" : "asc");
  }

  return params;
}

export function getTotalPages(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0) return 1;
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}
