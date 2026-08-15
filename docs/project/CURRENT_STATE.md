# LifeMate Command Center — Current State

Last verified: 2026-08-15 (Asia/Tehran)

## Repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core: `Hamrez95/LifeMate`
- Master roadmap: `Hamrez95/lifemate-admin#49`
- GitHub Issues are canonical; Trello is portfolio/focus only.

## Verified GitHub state

At the ADM-COM-005 milestone sync:

- `ADM-COM-004` (#37) is complete via Core PR #189 and Admin PR #69.
- `ADM-COM-005` (#16) is complete via Core PR #197 and Admin PR #70.
- Admin PR #70 passed `admin-web-ci` through format, browser-secret boundary, lint, TypeScript, unit tests and production build before merge.
- Master Issue #49 marks Commerce complete through ADM-COM-005 and sets `ADM-PLAT-002` (#4) as the next task.
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

## Commerce contract now in main

Commerce intentionally keeps these concepts separate:

`Plan ≠ Entitlement ≠ Order ≠ Transaction ≠ Provider Event ≠ Promotion ≠ Discount Code`

The merged Commerce work now includes:

- plan/entitlement overview and detail;
- normalized transaction/order list and transaction detail;
- Provider Event observation timeline without exposing raw provider references;
- audited human-review refund requests behind `commerce.refund`;
- Promotion and Discount Code persistence and Admin API contracts;
- Promotion reads behind `commerce.read` and mutations behind canonical `commerce.promo.write`;
- Draft-only promotion creation, reasoned/idempotent/audited rule edits and Active/Paused lifecycle actions;
- exact-code lookup and masked list codes to reduce code enumeration risk;
- string-backed minor-unit money at API boundaries where bigint precision matters;
- redemption summaries rendered explicitly unavailable/null until a canonical source is instrumented;
- Persian-first RTL promotion list/detail/create/edit UX with correct Tehran-local datetime conversion to UTC;
- no card data, payment credentials, raw provider references or account identifiers in browser Commerce contracts.

## Security rules that remain active

1. Admin Web does not query sensitive database tables directly.
2. Supabase Auth + mandatory MFA/AAL2 precede the Admin API boundary.
3. Authorization is enforced by the Admin API, not by navigation visibility.
4. Medical data remains default-deny for ordinary admin roles.
5. Women Health remains under a stricter sensitive-data boundary.
6. Relationship, Consent, Access Grant and Admin Permission remain separate concepts.
7. Admin role never implies caregiver access.
8. Elevated sensitive access remains blocked until the approved break-glass workflow is implemented.
9. Browser code never receives `service_role` or payment-provider credentials.
10. Unavailable production data renders `—` or an explicit unavailable state; metrics are never fabricated.

## Current implementation order

Completed through:

1. `ADM-COM-005` Promotions / Discount Codes (#16)

Next, strictly sequential:

2. `ADM-PLAT-002` Secure Global Search / Command Palette (#4)
3. `ADM-PLAT-003` Admin Notification Center / Alerts (#30)

The exact current sequence is maintained in Master Issue #49.

## Production rollout

Merged code is not proof of production deployment. A read-only check of the live Supabase migration list on 2026-08-15 did not show the Command Center control-plane/Commerce migrations. Production migration/function rollout, Founder bootstrap, environment configuration and smoke verification remain gated under `ADM-OPS-002` (#24). Re-verify live Supabase immediately before any production write.
