# LifeMate Command Center — AI / Developer Handoff

Use this file when a new AI model, engineer or reviewer enters the project.

## Read first, in this order

1. `AGENTS.md` — repository engineering and security rules.
2. `SECURITY.md` — non-negotiable security boundaries.
3. `docs/project/CURRENT_STATE.md` — verified state, what is merged vs deployed.
4. `docs/project/ROADMAP.md` — implementation order and release gates.
5. `docs/project/COMMAND_CENTER_BACKLOG.md` — durable backlog index.
6. `docs/project/DESIGN_REFERENCE_INDEX.md` — approved visual references.
7. Master Issue #49 and the GitHub Issue you are about to implement, including dependencies and acceptance criteria.
8. Relevant files in core `Hamrez95/LifeMate` when the task changes Admin API contracts, read models, migrations or restricted runtime permissions.

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

- Raw health: default deny.
- Women Health: stricter default deny.
- Founder/Super Admin ordinary role membership is not a health-data bypass.
- `health.read.elevated` and `women_health.read.elevated` are not ordinary role permissions.
- `ADM-USR-005` stays blocked until `ADM-SEC-005` break-glass is implemented and accepted.
- Break-glass requires purpose, target, explicit scope, TTL, approval, revoke/expiry and immutable audit.

## Current execution position

As of the 2026-08-15 milestone sync:

- Commerce is verified complete through `ADM-COM-005` (#16): Core PR #197 / Admin PR #70.
- `ADM-PLAT-002` Secure Global Search / Command Palette (#4) is complete via Core PR #198 / Admin PR #72.
- Core #198 passed Admin Edge API, schema/restore, runtime/db-pressure smoke, readiness and ecosystem gates.
- Admin #72 passed format, browser-secret boundary, lint, strict TypeScript, unit tests and production build.

The current strictly sequential task is:

1. `ADM-PLAT-003` — Admin Notification Center / Alerts (#30)

Always re-read Master Issue #49 before starting, because it is canonical and may have advanced since this document was written. Do not start a later feature merely because its UI is easier.

## Engineering workflow

For each Issue:

1. Fetch latest `main` and verify its SHA.
2. Confirm the Issue is still open and dependencies are satisfied.
3. Create a fresh feature branch from latest `main`.
4. Preserve existing architecture unless the Issue explicitly approves a change.
5. Implement frontend + server/API + data/read model together when the Issue is a vertical slice.
6. All list endpoints use server-side pagination and bounded query limits.
7. Sensitive mutations require permission, validation, idempotency, reason where appropriate and immutable audit.
8. Implement Loading, Empty, Error, Forbidden and Stale/Unavailable states.
9. Persian/RTL is the default; support responsive behavior and WCAG 2.2 AA.
10. Never invent KPI values, search results or alerts. Render `—` / unavailable / not-instrumented truthfully.
11. Run repository-required checks and security checks.
12. Open a PR; merge only after green CI and resolved review concerns.
13. Close the Issue, update the Master checklist and update `CURRENT_STATE.md` for milestones.
14. Sync Trello only after GitHub completion bookkeeping is correct.

## GitHub write verification

After every branch/Issue/commit/PR write, immediately fetch the created/updated resource. Never report a write as successful without a successful connector response and verification read.

## Supabase deployment safety

Production rollout remains a separate gate under `ADM-OPS-002` (#24). Before that task performs any write:

- list production migrations;
- list deployed Edge Functions;
- inspect approved live schemas/read models as needed;
- compare live state to the exact core migration/function version;
- only then follow the gated rollout Issue.

A read-only migration check on 2026-08-15 did not show the Command Center control-plane/Commerce migrations in live Supabase. Do not apply migrations or deploy functions as a side effect of unrelated feature work.

## Secure Global Search safety contract

The merged `ADM-PLAT-002` slice intentionally limits search:

- domains are allow-listed and mapped to their existing read permissions;
- unauthorized domains are not queried and cannot leak existence through counts;
- raw Health and Women Health are not search domains;
- query length and pagination are bounded;
- rate limiting is database-backed per admin without persisting raw query text;
- operational search logs omit raw query text;
- browser requests use a same-origin server route rather than direct DB/Admin API secrets;
- local recent history contains only safe static workspace keys, never search query text or record IDs;
- campaign search is explicitly not-instrumented until its canonical source exists rather than returning demo data.

## Commerce safety contract

The merged Commerce slices intentionally keep:

`Plan ≠ Entitlement ≠ Order ≠ Transaction ≠ Provider Event ≠ Promotion ≠ Discount Code`

- Order is commercial intent.
- Transaction is normalized financial state.
- Provider Event is an observation received from an external provider.
- Promotion is a commercial rule; Discount Code is a redeemable code attached to that rule.
- Provider references remain hash-only in persistence and do not enter the Admin browser contract.
- Minor-unit money remains string-backed where PostgreSQL bigint precision matters.
- Refund requests use explicit `commerce.refund`; promotion mutations use canonical `commerce.promo.write`; neither permission is inherited from `commerce.read`.
- Promotion creation is Draft-only; financial-rule edits and lifecycle transitions are reasoned, idempotent and audited.
- List code values are masked and code filtering is exact-only to reduce enumeration risk.
- Redemption counts remain explicit unavailable/null until a canonical source exists; never fabricate them.

## Next-task security focus — ADM-PLAT-003

The Notification Center must aggregate only real approved sources. Every alert and unread count is filtered by the permission of its source domain so hidden domains cannot leak existence through the bell badge. Raw Health, Women Health, secrets and raw log/provider payloads are excluded. Summaries are redacted and deep links are allow-listed/validated. Source failures must be isolated so one unavailable source does not make other alert groups untruthful. Acknowledge/read mutations are only added where there is a canonical source contract and must be idempotent/audited where required.

## Design use

Approved mockups are structural/visual references, not a source of canonical data or exact OCR copy. Use product specifications and Issue acceptance criteria for data contracts and wording. Keep LifeMate warm, light, Persian-first and professional; do not turn it into a generic dark SaaS dashboard.
