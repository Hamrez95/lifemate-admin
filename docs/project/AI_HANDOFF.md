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

As of the 2026-08-16 milestone sync:

- Commerce is complete through `ADM-COM-005` (#16): Core #197 / Admin #70.
- `ADM-PLAT-002` Secure Global Search / Command Palette (#4): Core #198 / Admin #72.
- `ADM-PLAT-003` Admin Notification Center / Alerts (#30): Core #201 / Admin #74.
- `ADM-QA-001` E2E + Accessibility + Visual Regression + Security Denial Matrix (#5): Admin #76.
- `ADM-PERF-001` Dataset Performance Guardrails (#39): Core #231 / Admin #78.
- `ADM-HOME-001` Founder / Executive Overview (#6): Admin #80.
- #80 merged only after `admin-web-ci` and permanent `admin-qa` were fully green; existing secure Core APIs were reused without a new endpoint/migration.

Current sequential execution:

1. `ADM-ANL-002` — Acquisition / Activation / Retention / Cohorts (#13)

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
11. Run repository-required checks, security checks and the permanent QA gate when paths trigger it.
12. Open a PR; merge only after green CI/QA and resolved review concerns.
13. Close the Issue, update Master and durable project state.
14. Sync Trello only after GitHub completion bookkeeping is correct.

## Permanent QA gate

`admin-qa` is a permanent merge-blocking browser/security gate in addition to `admin-web-ci`.

- It runs locked Playwright desktop/mobile Chromium with Persian locale/Tehran timezone and CI retries set to zero.
- Synthetic local Auth/Admin API services exercise existing-account phone OTP -> verified TOTP -> AAL2 -> signed JWT/JWKS -> real server `getClaims()` -> Admin API -> authorized workspace.
- No production account, PII/PHI, real OTP/TOTP, service-role key or application-side auth bypass is used.
- Role×workspace denial tests explicitly keep ordinary roles away from `health.read.elevated` and `women_health.read.elevated`.
- Axe fails on serious/critical accessibility violations; committed desktop/mobile visual baselines require intentional review before update.
- Failure traces/screenshots/reports are retained as short-lived CI artifacts.
- Do not weaken the gate to make future changes pass.

## Dataset performance guardrails

- Current pageable Admin API surfaces are capped at 100 pages and 100 rows/page; stricter endpoint-specific limits remain stricter.
- Relationship Ledger keeps a maximum 366-day range; Global Search retains its stricter page-size and DB-backed per-admin throttle.
- Serialized Admin API JSON responses fail closed above 512 KiB.
- Privileged Admin responses remain `no-store`; Admin server fetches must keep `AbortSignal.timeout` at or below 10 seconds.
- Performance fixtures/logs/telemetry must not contain production PII/PHI, raw search text, credentials, provider payloads, Health or Women Health content.
- Timeout/unavailable must not be rendered as an empty list or zero metric.

## Founder Home contract now in main

- Home composes the existing Analytics KPI, Relationship Overview, Commerce Overview and Notification Center server clients only when the current admin has the corresponding permission.
- Unauthorized sources are not queried and cannot leak counts through hidden cards.
- Metrics preserve source-level freshness/partial/unavailable semantics; absence never becomes a fabricated zero.
- Active Relationship is not Consent/Access Grant, and active subscription is not automatically a paying user.
- Alerts inherit Notification Center source minimization and safe deep-link validation.
- Raw Health and Women Health are excluded from the executive aggregation.
- One source failure is isolated and does not collapse the full page.

## Current analytics focus — ADM-ANL-002

Build acquisition→activation→retention/cohort analytics on top of the existing versioned event taxonomy and KPI dictionary.

- Permission is `analytics.read`.
- Computation/query is server-side with bounded product/date filters.
- Use versioned definitions only; do not silently redefine acquisition, activation, retention, churn or return.
- Cohort cells must distinguish zero from unavailable and must carry source/freshness metadata.
- Small cohorts must be suppressed before browser delivery; the UI must not infer suppressed values.
- No user-level export is in scope.
- Raw Health/Women Health events or payload content are not cohort dimensions.
- Provide an accessible textual/table alternative to any heatmap, keyboard-safe horizontal navigation on mobile and WCAG 2.2 AA contrast.
- Test cohort math, Tehran/date edges, D1/D7/D30 (or the approved canonical windows), suppression and permission denial.

## Supabase deployment safety

Production rollout remains a separate gate under `ADM-OPS-002` (#24). Before that task performs any write, re-list production migrations/functions and compare live state to the exact reviewed Core version. Do not deploy migrations/functions as a side effect of feature, QA, performance, Home or analytics work.

## Commerce safety contract

`Plan ≠ Entitlement ≠ Order ≠ Transaction ≠ Provider Event ≠ Promotion ≠ Discount Code`

Provider references remain hash-only; bigint money stays lossless; refund/promotion writes use separate explicit permissions; mutations are reasoned/idempotent/audited; code enumeration is controlled; unavailable redemption counts are never fabricated.

## Design use

Approved mockups are structural/visual references, not canonical production data. Keep LifeMate warm, light, Persian-first and professional; do not replace it with a generic dark admin template.
