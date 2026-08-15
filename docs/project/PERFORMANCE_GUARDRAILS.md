# LifeMate Command Center — Dataset Performance Guardrails

Canonical task: `ADM-PERF-001` / GitHub issue #39.

These limits protect the internal Command Center from accidental unbounded reads while preserving the existing security model. They are not a production-deployment statement.

## Query and pagination budgets

- Every pageable Admin API list is server bounded.
- Maximum page: `100`.
- Maximum page size: `100`; existing endpoints with stricter limits keep those stricter limits.
- Operators must refine filters instead of requesting arbitrarily deep offset pages.
- Relationship ledger date windows remain independently bounded to at most 366 days.
- Global Search retains its stricter page-size limit and per-admin database-backed throttle.

These are safety ceilings, not UI defaults.

## Response budget

- A serialized Admin API JSON response must not exceed `512 KiB`.
- Oversized responses fail closed as unavailable rather than streaming an unexpectedly large payload to the browser.
- The budget applies before browser delivery and does not weaken permission checks or data minimization.

## Browser/server fetch policy

All server-side Command Center calls to `lifemate-admin-api` must:

- use `cache: "no-store"`;
- use a bounded timeout of at most 10 seconds;
- map network/timeout failures to an explicit unavailable state;
- preserve 401, MFA-required and 403 semantics instead of converting them to empty data;
- never fall back to direct browser database access.

The repository contract test `tests/dataset-performance-guardrails.test.ts` prevents new Admin API clients from silently dropping the no-store or timeout rules.

## Cache isolation

The current sensitive Admin API policy is intentionally no-store. Do not add shared response caching for Users, Relationships, Support, Commerce, Search or Notifications without a separate review.

If a future read model is approved for caching, its cache key must include every authorization dimension that can change the result, and sensitive Health/Women Health data remains ineligible for ordinary Command Center caching.

## Throttling

- Global Search remains throttled by the Core database-backed per-admin limiter.
- Raw search text is not persisted by the limiter.
- Additional throttles must be identity/permission aware and must not use raw sensitive payloads as keys.

## Performance telemetry

Safe telemetry may include:

- route template;
- HTTP status/result class;
- duration bucket or duration milliseconds;
- page size;
- response byte count;
- correlation ID;
- source freshness/completeness state.

Do not record raw search queries, provider payloads, account identifiers, health content, Women Health content, authentication tokens or payment credentials merely for performance analysis.

## UI state contract

Data-heavy workspaces must preserve distinct Loading, Empty, Error/Unavailable, Forbidden and Stale states. A timeout is an unavailable result, not an empty list and not a zero metric.

Persian-first RTL, keyboard behavior, responsive smoke and WCAG checks remain enforced by the permanent `admin-qa` gate established by ADM-QA-001.

## Verification

Core enforcement is covered by a synthetic large-fixture smoke test and cross-surface pagination tests. Admin CI separately verifies formatting, browser-secret boundaries, lint, TypeScript, unit tests and production build; `admin-qa` remains the browser/accessibility regression gate.

No production migrations or deployments are performed by this task. Production rollout remains gated by `ADM-OPS-002` (#24).
