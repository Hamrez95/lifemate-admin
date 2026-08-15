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

As of the 2026-08-15 milestone sync, implementation is verified complete through `ADM-COM-003` (#36): Core PR #186 and Admin PR #67 are merged and the Issue is closed.

The next strictly sequential task is:

1. `ADM-COM-004` — Transaction Detail / Audited Financial Actions (#37)
2. then `ADM-COM-005` — Promotions / Discount Codes (#16)

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
10. Never invent KPI values. Render `—` when the source is unavailable.
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

Do not apply migrations or deploy functions as a side effect of unrelated feature work.

## Commerce safety contract

The merged ADM-COM-003 slice intentionally keeps:

`Order ≠ Transaction ≠ Provider Event`

- Order is commercial intent.
- Transaction is normalized financial state.
- Provider Event is an observation received from an external provider.
- Provider references remain hash-only in persistence and do not enter the Admin browser contract.
- `amountMinor` is string-backed for bigint precision safety.
- Admin browser receives `accountLinked` rather than an account identifier.
- Financial mutations introduced by later tasks require explicit permission and immutable audit rather than inheriting `commerce.read` automatically.

## Design use

Approved mockups are structural/visual references, not a source of canonical data or exact OCR copy. Use product specifications and Issue acceptance criteria for data contracts and wording. Keep LifeMate warm, light, Persian-first and professional; do not turn it into a generic dark SaaS dashboard.
