export type FilterRule = { maxValues?: number; maxValueLength?: number };
export type FilterRules = Readonly<Record<string, FilterRule>>;
export type FilterState = Readonly<Record<string, readonly string[]>>;

export function parseFilterState(params: URLSearchParams, rules: FilterRules): FilterState {
  const result: Record<string, readonly string[]> = {};

  for (const [key, rule] of Object.entries(rules)) {
    const maxValues = Math.max(1, rule.maxValues ?? 8);
    const maxLength = Math.max(1, rule.maxValueLength ?? 80);
    const values = params
      .getAll(`filter.${key}`)
      .map((value) => value.trim().slice(0, maxLength))
      .filter(Boolean)
      .slice(0, maxValues);

    if (values.length > 0) result[key] = values;
  }

  return result;
}
