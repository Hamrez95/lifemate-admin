# LifeMate Command Center — Current State

Last verified: 2026-08-15 (Asia/Tehran)

## Repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core: `Hamrez95/LifeMate`
- Master roadmap: `Hamrez95/lifemate-admin#49`
- GitHub Issues are canonical; Trello is portfolio/focus only.

## Verified GitHub state

At the ADM-PLAT-003 milestone sync:

- Commerce remains complete through `ADM-COM-005` (#16): Core PR #197 / Admin PR #70.
- `ADM-PLAT-002` (#4) Secure Global Search / Command Palette is complete via Core PR #198 / Admin PR #72.
- `ADM-PLAT-003` (#30) Admin Notification Center / Alerts is complete via Core PR #201 / Admin PR #74.
- Core #201 passed Admin Edge API, PostgreSQL schema/restore, edge/readiness, ecosystem and runtime/db-pressure smoke gates before merge.
- Admin #74 passed format, browser-secret boundary, lint, strict TypeScript, unit tests and production build before merge.
- Master Issue #49 sets `ADM-QA-001` (#5) as current work, followed by `ADM-PERF-001` (#39).
- Source merge is **not** production deployment.

Repository/privacy hardening and delivery environments remain tracked under `ADM-OPS-003` (#38).

## Completed source-control milestones

- `ADM-PLAT-001` — Admin PR #51
- `ADM-USR-001` — Core PR #131 / Admin PR #52
- `ADM-USR-002` — Core PRs #145 + #146 / Admin PR #54
- `ADM-DATA-001` — Core PR #148 / Admin PR #55
- `ADM-ANL-001` — Core PR #151 / Admin PR #57
- `ADM-REL-001` — Core PR #152 / Admin PR #58
- `ADM-REL-002` — Core PR #153 / Admin PR #59
- `ADM-USR-004` — Core PR #154 / Admin PR #60
- `ADM-USR-003` — Core PR #156 / Admin PR #61
- `ADM-SUP-001` — Core PR #157 / Admin PR #62
- `ADM-SUP-002` — Core PR #158 + runtime repair #159 / Admin PR #63
- `ADM-COM-001` — Core PR #161 + correctness repair #176 / Admin PR #64
- `ADM-COM-002` — Core PR #177 / Admin PR #66
- `ADM-COM-003` — Core PR #186 / Admin PR #67
- `ADM-COM-004` — Core PR #189 / Admin PR #69
- `ADM-COM-005` — Core PR #197 / Admin PR #70
- `ADM-PLAT-002` — Core PR #198 / Admin PR #72
- `ADM-PLAT-003` — Core PR #201 / Admin PR #74

## Secure Global Search contract now in main

- Search is an authenticated Admin API surface, not a universal data explorer.
- Domains are allow-listed and independently permission-gated: users, support, commerce and campaigns.
- Unauthorized domains are not queried and do not leak existence through counts.
- Raw Health and Women Health are excluded entirely.
- Minimum query length, bounded pagination and a database-backed per-admin rate limit are enforced.
- Raw query text is not persisted for rate limiting or operational logs.
- The browser uses a same-origin Next.js boundary; privileged secrets never enter browser code.
- Campaign search stays explicit `not_instrumented` until a canonical source exists.
- The Persian RTL Command Palette supports keyboard navigation, focus trapping and mobile fallback.

## Notification Center contract now in main

- Bell count and notification list are filtered by the permission of each source domain before source data is loaded.
- Approved real sources are Support, Security and Operations.
- Support alerts use redacted ticket queue metadata for active SLA/Urgent conditions.
- Security alerts use narrowly selected failed/elevated-denied Admin audit metadata; audit reason/metadata payloads are not sent to the browser.
- Operations alerts use a SECURITY DEFINER metadata-only Outbox snapshot; `payload_json`, event/resource identifiers and secrets are not exposed.
- Outbox alert thresholds follow the reviewed runbook: `<120s` healthy, `120–899s` warning, `>=900s` critical; DeadLetter and stale Processing locks are surfaced separately.
- Finance and Product remain truthful `not_instrumented` sources until canonical alert sources exist; no demo alert is invented.
- Exact unread totals are returned only when all authorized sources are complete. Partial source coverage returns lower-bound known counts plus explicit completeness/source states.
- Per-admin read/unread presentation state is permission-checked, idempotent and audited; it never mutates source business state.
- Acknowledge/dismiss actions are not invented for sources that do not support a canonical source-owned workflow.
- Deep links are source-scoped and validated both in Core and the Admin server client.
- The Persian RTL panel supports responsive mobile sheet layout, severity icon+text, freshness, Escape/focus trap and a limited live region for unread-count changes.
- Raw Health and Women Health are not notification domains.

## Commerce contract now in main

Commerce intentionally keeps these concepts separate:

`Plan ≠ Entitlement ≠ Order ≠ Transaction ≠ Provider Event ≠ Promotion ≠ Discount Code`

The merged Commerce work includes plan/entitlement overview/detail, normalized transaction/order list/detail, provider-event observations, audited refund requests, promotion/discount-code lifecycle management, exact-code enumeration controls and truthful unavailable redemption summaries.

## Security rules that remain active

1. Admin Web does not query sensitive database tables directly.
2. Supabase Auth + mandatory MFA/AAL2 precede the Admin API boundary.
3. Authorization is enforced by the Admin API, not navigation visibility.
4. Medical data remains default-deny for ordinary admin roles; Women Health is stricter.
5. Relationship, Consent, Access Grant and Admin Permission remain separate concepts.
6. Admin role never implies caregiver access.
7. Elevated sensitive access remains blocked until the approved break-glass workflow is implemented.
8. Browser code never receives `service_role`, database passwords or payment-provider credentials.
9. Missing data/search/alert sources stay explicit unavailable/not-instrumented; production facts are never fabricated.

## Current implementation order

Completed through:

1. `ADM-PLAT-003` Admin Notification Center / Alerts (#30)

Current strictly sequential focus:

2. `ADM-QA-001` E2E + Accessibility + Visual Regression + Security Denial Matrix (#5)
3. `ADM-PERF-001` Dataset Performance Guardrails (#39)

The exact current sequence is maintained in Master Issue #49.

## Production rollout

Merged code is not proof of production deployment. A read-only check of the live Supabase migration list on 2026-08-15 did not show the Command Center control-plane/Commerce migrations at that time. Production migration/function rollout, Founder bootstrap, environment configuration and smoke verification remain gated under `ADM-OPS-002` (#24). Re-verify live Supabase immediately before any production write.
