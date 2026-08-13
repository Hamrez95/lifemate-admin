# Shared admin data primitives

`ADM-PLAT-001` provides reusable presentation and URL-state primitives for Command Center list pages.

## Server-driven contract

Domain pages should parse list state on the server, pass bounded values to the Admin API, and render only the returned authorized rows. The component is not an authorization boundary.

```tsx
const query = parseTableQuery(searchParams, {
  allowedSorts: ["createdAt", "status"],
});

const filters = parseFilterState(searchParams, {
  status: { maxValues: 4, maxValueLength: 24 },
});

return (
  <AdminDataTable
    title="نمونه"
    rows={result.items}
    columns={columns}
    rowKey={(row) => row.id}
    total={result.total}
    freshness={result.freshness}
    pagination={{
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      previousHref,
      nextHref,
    }}
  />
);
```

Filters use a GET form through `AdminTableFilterBar`, so state remains URL-addressable and server-driven. Only configured filter and sort keys are accepted by the shared parsers.

## Required states

Every list page must represent loading, empty, error, forbidden and stale/unavailable data truthfully. Missing field values render as `—`; do not substitute fixture or guessed values.

## Responsive behavior

The primitive renders a semantic desktop table and a card representation for narrow viewports. Column definitions may hide nonessential fields on mobile.

## Security boundary

- No direct database access is implemented here.
- Domain routes and Admin API endpoints must enforce permissions.
- Do not put sensitive values in query parameters.
- Do not persist sensitive rows in browser storage.
- Bulk actions are domain-specific and must not be added without the permission, validation, idempotency and audit rules required by their owning Issue.
