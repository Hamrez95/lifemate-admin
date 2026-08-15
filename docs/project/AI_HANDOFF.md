# LifeMate Command Center — AI / Developer Handoff

Use this file when a new AI model, engineer or reviewer enters the project.

## Read first

1. `AGENTS.md`
2. `SECURITY.md`
3. `docs/project/CURRENT_STATE.md`
4. `docs/project/ROADMAP.md`
5. `docs/project/COMMAND_CENTER_BACKLOG.md`
6. `docs/project/DESIGN_REFERENCE_INDEX.md`
7. Master Issue #49 and the Issue currently being implemented
8. Relevant Core files in `Hamrez95/LifeMate` whenever Admin API contracts/read models/migrations/permissions change

Do not infer production state from merged code. Re-verify live Supabase before deployment or schema claims.

## Architecture boundary

```text
Admin Web
  ↓
Supabase Auth
  ↓ MFA / AAL2
lifemate-admin-api
  ↓
restricted DB role
  ↓
approved read models / admin tables
```

The browser does not directly query healthcare/admin tables and never contains privileged secrets.

## Sensitive-data rules

- Raw Health: default deny.
- Women Health: stricter default deny.
- Founder/Super Admin ordinary role membership is not a health-data bypass.
- `health.read.elevated` and `women_health.read.elevated` are not ordinary role permissions.
- `ADM-USR-005` stays blocked until `ADM-SEC-005` break-glass is implemented and accepted.
- Break-glass requires purpose, target, explicit scope, TTL, approval, revoke/expiry and immutable audit.

## Current execution position

As of the 2026-08-15 milestone sync:

- Commerce is complete through `ADM-COM-005` (#16): Core PR #197 / Admin PR #70.
- `ADM-PLAT-002` Secure Global Search / Command Palette (#4): Core #198 / Admin #72.
- `ADM-PLAT-003` Admin Notification Center / Alerts (#30): Core #201 / Admin #74.
- Core #201 passed Admin Edge API, PostgreSQL schema/restore, edge/readiness, ecosystem and runtime/db-pressure smoke gates.
- Admin #74 passed format, browser-secret boundary, lint, strict TypeScript, unit tests and production build.

Current sequential execution:

1. `ADM-QA-001` — E2E + Accessibility + Visual Regression + Security Denial Matrix (#5)
2. `ADM-PERF-001` — Dataset Performance Guardrails (#39)

Always re-read Master Issue #49 before starting because it is canonical and may have advanced.

## Engineering workflow

For each Issue:

1. Fetch latest `main` and verify its SHA.
2. Confirm the Issue is open and dependencies are satisfied.
3. Create a fresh feature branch from latest `main`.
4. Preserve existing architecture unless the Issue explicitly approves a change.
5. Implement frontend + server/API + data/read model together when the Issue is a vertical slice.
6. Keep list endpoints paginated and bounded.
7. Sensitive mutations require authorization, validation, idempotency, reason where appropriate and immutable audit.
8. Implement Loading, Empty, Error, Forbidden and Stale/Unavailable states.
9. Persian/RTL is default; support responsive behavior and WCAG 2.2 AA.
10. Never invent KPI values, search results or alerts.
11. Run repository-required checks and security checks.
12. Open a PR; merge only after green CI and resolved review concerns.
13. Close the Issue, update Master and durable project state.
14. Sync Trello only after GitHub completion bookkeeping is correct.

## Supabase deployment safety

Production rollout remains a separate gate under `ADM-OPS-002` (#24). Before that task performs any write, re-list production migrations/functions and compare live state to the exact reviewed Core version. Do not deploy migrations/functions as a side effect of feature or QA work.

## Secure Global Search safety contract

- Domains are allow-listed and permission mapped.
- Unauthorized domains are never queried and cannot leak existence through counts.
- Raw Health and Women Health are not search domains.
- Query length/pagination are bounded and rate limiting is DB-backed per admin.
- Raw query text is not persisted/logged.
- Browser requests use same-origin server routes.
- Recent history stores safe static workspace keys only.
- Campaign search is explicit not-instrumented until a canonical source exists.

## Notification Center safety contract

- Each source requires its existing domain permission; the bell badge is filtered by the same source permissions as the list.
- Real source adapters currently exist for Support, Security and Operations.
- Finance/Product return explicit not-instrumented source states until canonical alert sources exist.
- Support uses redacted SLA/Urgent queue data only.
- Security uses a narrow subset of failed/elevated-denied audit metadata; reasons/metadata payloads are not returned.
- Operations uses a metadata-only SECURITY DEFINER Outbox snapshot. Raw event/resource identifiers and `payload_json` are excluded.
- Exact unread totals are only claimed when all authorized sources are complete; otherwise known lower-bound counts and partial completeness are returned.
- Per-admin read/unread state is permission-checked, idempotent and audited without mutating source business state.
- Deep links are source-scoped and validated in Core and Admin server code.
- No acknowledge/dismiss mutation is exposed unless a source-owned canonical workflow exists.
- Raw Health and Women Health are not notification sources.

## Commerce safety contract

`Plan ≠ Entitlement ≠ Order ≠ Transaction ≠ Provider Event ≠ Promotion ≠ Discount Code`

Provider references remain hash-only; bigint money stays lossless; refund and promotion writes use separate explicit permissions; promotion writes are reasoned/idempotent/audited; list codes are masked and exact-only filters reduce enumeration; unavailable redemption counts are never fabricated.

## Current QA focus — ADM-QA-001

The QA gate should protect the established Command Center surfaces rather than introduce production fixtures or privileged shortcuts. Use deterministic local/test-only auth/API strategies, never production PII/PHI. Cover 401/403/no-leak behavior, role×permission route/API denial, Health/Women Health elevated denial, keyboard/a11y, representative loading/empty/error/forbidden/stale states, RTL/responsive smoke and reviewable visual artifacts. Flaky tests must have an explicit policy rather than retries hiding failures.

## Design use

Approved mockups are structural/visual references, not canonical production data. Keep LifeMate warm, light, Persian-first and professional; do not replace it with a generic dark admin template.
