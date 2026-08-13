# LifeMate Command Center — AI / Developer Handoff

Use this file when a new AI model, engineer or reviewer enters the project.

## Read first, in this order

1. `AGENTS.md` — repository engineering and security rules.
2. `SECURITY.md` — non-negotiable security boundaries.
3. `docs/project/CURRENT_STATE.md` — verified state, what is merged vs deployed.
4. `docs/project/ROADMAP.md` — implementation order and release gates.
5. `docs/project/COMMAND_CENTER_BACKLOG.md` — durable backlog index.
6. `docs/project/DESIGN_REFERENCE_INDEX.md` — approved visual references.
7. The GitHub Issue you are about to implement, including dependencies and acceptance criteria.
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

## How to choose the next Issue

Unless the Master Issue says otherwise, take the earliest unblocked item in this order:

1. `ADM-PLAT-001`
2. `ADM-USR-001`
3. `ADM-USR-002`
4. `ADM-DATA-001`
5. `ADM-ANL-001`

Do not start a later feature merely because its UI is easier.

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

## GitHub write verification

After every branch/Issue/commit/PR write, immediately fetch the created/updated resource. Never report a write as successful without a successful connector response and verification read.

## Supabase deployment safety

Production Admin Control Plane code is merged in core but, as of the current state document, was not deployed. Before `ADM-OPS-002`:

- list production migrations;
- list deployed Edge Functions;
- inspect `admin` schema presence;
- compare live state to the exact core migration/function version;
- only then follow the gated rollout Issue.

Do not apply migrations or deploy functions as a side effect of unrelated feature work.

## Design use

Approved mockups are structural/visual references, not a source of canonical data or exact OCR copy. Use product specifications and Issue acceptance criteria for data contracts and wording. Keep LifeMate warm, light, Persian-first and professional; do not turn it into a generic dark SaaS dashboard.
