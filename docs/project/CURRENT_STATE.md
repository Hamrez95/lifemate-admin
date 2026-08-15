# LifeMate Command Center — Current State

Last verified: 2026-08-15 (Asia/Tehran)

## Repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core: `Hamrez95/LifeMate`
- Master roadmap: `Hamrez95/lifemate-admin#49`
- GitHub Issues are canonical; Trello is portfolio/focus only.

## Verified GitHub state

At the ADM-PLAT-002 milestone sync:

- Commerce remains complete through `ADM-COM-005` (#16): Core PR #197 / Admin PR #70.
- `ADM-PLAT-002` (#4) Secure Global Search / Command Palette is complete via Core PR #198 and Admin PR #72.
- Core PR #198 passed Admin Edge API, PostgreSQL schema/restore, runtime/db-pressure smoke, readiness/edge and ecosystem gates before merge.
- Admin PR #72 passed format, browser-secret boundary, lint, strict TypeScript, unit tests and production build before merge.
- Master Issue #49 sets `ADM-PLAT-003` (#30) Admin Notification Center / Alerts as the current task.
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

## Secure Global Search contract now in main

The merged search surface is intentionally not a universal data explorer.

- `GET /api/v1/search` exists only behind authenticated Admin API + MFA/AAL2 + active admin membership.
- Search domains are allow-listed and independently permission-gated: users, support, commerce and campaigns.
- Unauthorized domains are not queried and cannot leak existence through result counts.
- Raw Health and Women Health are excluded from the search contract entirely.
- Search enforces a minimum query length, bounded pagination and a database-backed per-admin rate limit.
- Raw query text is not persisted for rate limiting and is redacted from operational search logs; logs contain bounded metadata such as query length/domain/page only.
- User results come from the approved Admin user directory; support search uses redacted queue data; commerce search uses approved operational models.
- Campaign search reports explicit `not_instrumented` for authorized callers until a canonical campaign source exists; it never fabricates results.
- The Admin browser calls a same-origin Next.js server route; privileged Admin API credentials and `service_role` never enter browser code.
- The Persian RTL Command Palette supports Cmd/Ctrl+K, Escape, arrow/Enter navigation, focus trapping, screen-reader semantics and a mobile fallback.
- Local recent history stores only static non-sensitive workspace keys; query text and record identifiers are not stored.

## Commerce contract now in main

Commerce intentionally keeps these concepts separate:

`Plan ≠ Entitlement ≠ Order ≠ Transaction ≠ Provider Event ≠ Promotion ≠ Discount Code`

The merged Commerce work includes plan/entitlement overview/detail, normalized transaction/order list/detail, provider-event observations, audited refund requests, promotion/discount-code lifecycle management, exact-code enumeration controls and truthful unavailable redemption summaries.

## Security rules that remain active

1. Admin Web does not query sensitive database tables directly.
2. Supabase Auth + mandatory MFA/AAL2 precede the Admin API boundary.
3. Authorization is enforced by the Admin API, not by navigation visibility.
4. Medical data remains default-deny for ordinary admin roles.
5. Women Health remains under a stricter sensitive-data boundary.
6. Relationship, Consent, Access Grant and Admin Permission remain separate concepts.
7. Admin role never implies caregiver access.
8. Elevated sensitive access remains blocked until the approved break-glass workflow is implemented.
9. Browser code never receives `service_role`, database passwords or payment-provider credentials.
10. Unavailable production data renders `—` or an explicit unavailable/not-instrumented state; data is never fabricated.

## Current implementation order

Completed through:

1. `ADM-PLAT-002` Secure Global Search / Command Palette (#4)

Current strictly sequential focus:

2. `ADM-PLAT-003` Admin Notification Center / Alerts (#30)

The exact current sequence is maintained in Master Issue #49.

## Production rollout

Merged code is not proof of production deployment. A read-only check of the live Supabase migration list on 2026-08-15 did not show the Command Center control-plane/Commerce migrations. Production migration/function rollout, Founder bootstrap, environment configuration and smoke verification remain gated under `ADM-OPS-002` (#24). Re-verify live Supabase immediately before any production write.
