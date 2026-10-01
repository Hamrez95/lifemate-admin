# LifeMate Command Center Engineering Rules

## Scope

This repository contains the internal LifeMate Command Center web client. Canonical production business-schema migrations and the separate Admin API live in `Hamrez95/LifeMate`:

- `supabase/migrations/`: canonical forward PostgreSQL migrations.
- `supabase/functions/lifemate-admin-api/`: authenticated administrative server boundary.

The mobile healthcare runtime remains separate and must not be bypassed from this web application.

## Non-negotiable security boundaries

- The browser must never directly read or mutate sensitive LifeMate production healthcare tables.
- Never commit service-role keys, database credentials, OpenAI secrets, social-media tokens, payment secrets, OTPs, signing keys, PII, or health records.
- Browser-visible environment variables are limited to publishable/non-secret configuration.
- Administrative authorization is enforced by `lifemate-admin-api`; hiding navigation is never treated as authorization.
- Authenticated Command Center access requires MFA/AAL2 in the Admin API, not merely in the UI.
- Raw health information is denied by default. Sensitive access must use a subject-specific, reasoned, time-bound, approved and audited workflow.
- Founder/Super Admin status must not silently imply raw health access.
- AI integrations must use a server-side gateway and start read-only.
- Do not add a browser-side Supabase table query as a shortcut when an Admin API route/read model is missing.

## Product / UI rules

- Persian (`fa`) and RTL are the default experience.
- Preserve the approved LifeMate Command Center visual language: warm off-white surfaces, dark navy text, green LifeMate accent, soft borders, restrained shadows, dense but readable management information.
- Do not replace the approved UI with a generic admin template.
- Desktop-first, responsive, keyboard-accessible, WCAG 2.2 AA where practical.
- Never present fixture/demo metrics as production facts.
- Permission-filtered navigation is UX only; protected routes and API operations must still enforce authorization.

## Data and analytics rules

- Do not calculate management dashboards by repeatedly querying raw production health tables.
- Define Event Taxonomy and KPI Dictionary before wiring Founder metrics.
- Prefer purpose-built aggregate/read models for analytics and operations.
- Every important KPI must have one documented definition, time window, exclusions and source events/tables.
- Missing instrumentation should render as unavailable/not instrumented, never as invented data.

## Authentication / session rules

- Use Supabase publishable credentials only in the browser.
- Existing-account admin login must not silently create new LifeMate accounts.
- Server-side identity checks should use verified claims before forwarding an access token to the Admin API.
- Logging out of Command Center should not globally revoke unrelated mobile sessions unless that behavior is explicitly requested and reviewed.

## Verification

Before opening or updating a PR run:

```bash
npm run format:check
npm run security:check
npm run lint
npm run typecheck
npm test
npm run build
```

Use focused branches and reviewable pull requests. Do not force-push `main`. Do not deploy a change whose required CI is red.

## Graphify — mandatory codebase navigation

This repository uses Graphify as the default structural index for codebase work. The project skill is checked in at `.agents/skills/graphify/SKILL.md`.

Before implementing or diagnosing any non-trivial task:

1. Confirm Graphify is available with `graphify --version`. In Codex, use `$graphify` when the project skill command is available; do not use a leading slash in PowerShell.
2. If `graphify-out/graph.json` does not exist, build the low-cost structural graph with:
   `graphify . --code-only --no-viz`
3. If the graph exists and source files changed since the last graph build, refresh it with:
   `graphify update .`
4. Ask one or more scoped questions with `graphify query "<task-specific question>"`; use `graphify explain "<node>"` and `graphify path "<from>" "<to>"` when relationships or impact are unclear.
5. Read and verify only the source files returned by the graph before editing. Do not scan the whole repository or load broad file trees into context just to discover architecture.
6. After code changes, run `graphify update .` again so the next Work/agent can reuse the current index.

Use code-only mode by default because it is deterministic and avoids semantic LLM extraction. Run docs/PDF/image/video extraction only when the task explicitly depends on those assets. The graph is an index, not source of truth: always verify exact source before making edits or claims. If Graphify is unavailable, state the blocker, use a narrow `rg` fallback only, and record that fallback in the final report.
