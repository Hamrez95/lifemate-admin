export type CommerceCatalogMutationSuccess = {
  code: string;
  replayed: boolean;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function parseCommerceCatalogMutationSuccess(
  value: unknown,
): CommerceCatalogMutationSuccess | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const code = nonEmptyString(row.code);
  if (!code || typeof row.replayed !== "boolean") return null;

  return {
    code,
    replayed: row.replayed,
  };
}
