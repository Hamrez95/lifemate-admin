# Command Center data-model parity

This document is the Admin-side source map for schema-migration safety. The browser never reads database tables directly; every surface below consumes the canonical Admin API and treats missing capabilities as unavailable instead of falling back to legacy tables.

## Canonical surfaces

| Command Center surface   | Canonical Admin API                | Core source boundary                                                                                                        |
| ------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Users directory          | `/api/v1/users`                    | `admin.user_directory_v2`                                                                                                   |
| User 360                 | `/api/v1/users/{accountId}`        | bounded identity/core/ecosystem/commerce/relationship read stores                                                           |
| Relationships overview   | `/api/v1/relationships/overview`   | `network.person_relationships`, `admin.care_relationship_directory_v1`, `consent.consent_records`, `security.access_grants` |
| Relationship ledger      | `/api/v1/relationships/ledger`     | canonical relationship/consent/access audit read model                                                                      |
| Analytics KPIs           | `/api/v1/analytics/kpis`           | canonical analytics KPI stores                                                                                              |
| Support queue            | `/api/v1/support/tickets`          | `admin.support_ticket_queue_v1`                                                                                             |
| Commerce overview        | `/api/v1/commerce/overview`        | canonical `commerce.*` read models                                                                                          |
| Finance P&L              | `/api/v1/finance/profit-loss`      | canonical finance read model                                                                                                |
| Finance Budget vs Actual | `/api/v1/finance/budget-vs-actual` | canonical finance read model                                                                                                |
| Finance Cash Planning    | `/api/v1/finance/cash-planning`    | canonical finance read model                                                                                                |

Care relationships are intentionally distinct from natural/family relationships. `admin.care_relationship_directory_v1` is a compatibility read boundary and must not be converted into `network.person_relationships` by inventing a natural relationship type.

## Intentional unavailable states

The following UI areas remain explicit unavailable boundaries until their owning Core contracts land. They must not gain browser-side inference or direct database fallbacks:

- AI Daily Brief — Core #440 / Admin #147.
- Finance Scenario — Core #441 / Admin #148.
- Operations telemetry — Core #442 / Admin #149.
- Relationship/Access Grant mutations — Core #443 / Admin #150.
- Ordered Activation Funnel and drill-down — Core #444 / Admin #151.
- Marketing attribution/performance — Core #445 / Admin #152.
- Commerce revenue KPIs — Core #446 / Admin #153.

## Regression rule

`tests/data-model-parity-contract.test.ts` fails CI if an Admin data client starts using direct Supabase table access, service-role/database credentials, loses a pinned canonical endpoint, or an intentional unavailable surface silently becomes a fabricated client-side capability.

Live database parity and migration/backfill verification remains owned by Core #447; this document and the Admin test protect the browser/server-contract boundary.
