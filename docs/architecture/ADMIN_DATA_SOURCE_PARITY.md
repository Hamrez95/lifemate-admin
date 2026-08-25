# Command Center canonical data-source parity

This document is the Admin-side regression map for `Hamrez95/LifeMate#447` and `lifemate-admin#155`.

## Rule

Every Command Center business surface reads through the authenticated canonical Admin API owned by `Hamrez95/LifeMate`. The browser must not query production business tables directly. A missing canonical capability is represented as unavailable/not instrumented and must not be replaced by a legacy-table fallback or an inferred metric.

## Primary surface map

| Surface          | Admin client / page                          | Canonical source contract                                                              | Empty-state meaning                                                                                                  |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Users            | `src/lib/admin-api/user-directory.ts`        | `GET /api/v1/users`                                                                    | Zero rows means the canonical directory returned zero rows; username remains nullable for legacy accounts.           |
| Relationships    | `src/lib/admin-api/relationship-overview.ts` | `GET /api/v1/relationships/overview`                                                   | Relationship, care-link, consent and access-grant semantics remain distinct; no direct legacy-table fallback.        |
| Analytics        | `src/lib/admin-api/analytics-kpis.ts`        | `GET /api/v1/analytics/kpis`                                                           | Missing instrumentation is `unavailable`/`partial`, not zero.                                                        |
| Support          | `src/lib/admin-api/support-queue.ts`         | `GET /api/v1/support/tickets`                                                          | An empty queue is a real canonical result, not evidence that a legacy table is empty.                                |
| Commerce         | `src/lib/admin-api/commerce-overview.ts`     | `GET /api/v1/commerce/overview`                                                        | No subscriptions/promotions may be a valid current product state; revenue KPIs require their own canonical contract. |
| Marketing        | `src/lib/admin-api/marketing-overview.ts`    | Canonical Analytics KPI client for acquisition; attribution remains `not_instrumented` | Channel/campaign attribution must never be inferred from ambiguous events.                                           |
| Finance          | `src/lib/admin-api/finance-profit-loss.ts`   | `GET /api/v1/finance/profit-loss`                                                      | Actual financial data is distinct from Scenario/Forecast.                                                            |
| Operations       | `app/operations/page.tsx`                    | No canonical operational snapshot yet (`LifeMate#442`)                                 | `Unavailable` is intentional until telemetry/deploy/provider/incident read models exist.                             |
| Settings         | `app/settings/page.tsx`                      | Preferences contract pending (`LifeMate#436`)                                          | Controls must stay bounded/disabled where the canonical setting is unavailable.                                      |
| Finance Scenario | `app/finance/scenario/page.tsx`              | Scenario contract pending (`LifeMate#441`)                                             | Save/edit/forecast stays unavailable; browser-side forecasts are prohibited.                                         |
| Security / Staff | server-authorized Admin API clients          | Canonical RBAC/staff contracts                                                         | UI visibility never substitutes for server authorization.                                                            |

## Migration-parity checks

1. A source migration must not silently move a Command Center client from a populated legacy model to an empty canonical model without a reviewed semantic migration or compatibility read model.
2. Legacy and canonical concepts must not be conflated. In particular, a care relationship is not automatically a natural `network.person_relationships` row, and a relationship never implies consent or health-data access.
3. Intentional empty domains are documented separately from migration loss. Current zero-row commerce or telemetry domains are not automatically defects.
4. Canonical response parsers must remain fail-closed: malformed or incomplete responses render unavailable rather than being repaired in the browser.
5. Any new primary Admin data client must be added to `tests/data-model-parity-contract.test.ts` or explicitly documented as an intentionally unavailable capability with an owning Core issue.
