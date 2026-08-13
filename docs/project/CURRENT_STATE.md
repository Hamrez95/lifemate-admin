# LifeMate Command Center — Current State

Last verified: 2026-08-14 (Asia/Tehran)

## Repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core: `Hamrez95/LifeMate`
- Master roadmap: `Hamrez95/lifemate-admin#49`

## Verified GitHub state

- Admin `main`: `f268bef54a606cbb370bda95439496e1e4361a82`
- Core `main`: `8057db457b3ef52f25cd17fc12e49ec6b098bd52`
- Admin repository remains public.
- Admin `main` remains unprotected.
- Repository hardening and delivery environments are tracked in `ADM-OPS-003` (#38).

## Completed source-control milestones

### Foundation

- Admin web foundation and CI
- Persian-first RTL shell and LifeMate design system
- Supabase SSR authentication
- phone OTP and mandatory TOTP MFA/AAL2
- server-side Admin API authorization boundary
- core admin RBAC and audit foundation
- durable project memory via admin PR #50

### ADM-PLAT-001

Admin PR #51 merged the shared table/filter/pagination/page-state primitives used by data-heavy pages.

### ADM-USR-001

Core PR #131 and admin PR #52 are merged.

The secure user-directory source flow is now:

`Admin Web /users → authenticated Admin API → users.read.basic → approved user directory read model → restricted database runtime`

Implemented:

- server-side search, filters, sort and pagination
- basic account status and display-name fields
- active product-enrollment summary
- created and last-active timestamps when available
- Persian RTL responsive presentation
- Loading, Empty, Error, Forbidden and Unavailable states
- no direct browser database reads
- no sensitive medical records in the directory response
- core query/RLS/security tests
- admin formatting, secret-boundary, lint, TypeScript, unit-test and production-build CI

The visible User 360 link is intentionally completed by the next task, `ADM-USR-002`.

## Production rollout

Merged code is not proof of production deployment. The last live verification showed that the Admin Control Plane migration/API rollout and Founder bootstrap were still pending. Production work remains gated under `ADM-OPS-002` (#24) and must re-verify the live environment before any change.

## Security rules that remain active

1. Admin Web does not query sensitive database tables directly.
2. Authorization is enforced by the Admin API, not by navigation visibility.
3. Medical data remains default-deny for ordinary admin roles.
4. Women Health remains under a stricter sensitive-data boundary.
5. Relationship, Consent, Access Grant and Admin Permission remain separate concepts.
6. Elevated sensitive access remains blocked until the approved break-glass workflow is implemented.

## Current implementation order

Completed:

1. `ADM-PLAT-001`
2. `ADM-USR-001`

Next:

3. `ADM-USR-002` User 360
4. `ADM-DATA-001` Event Taxonomy + KPI Dictionary + Analytics Read Models
5. `ADM-ANL-001` Product KPI Dashboard

## Data-display rule

Never fabricate production metrics or user records. If data is unavailable, stale or uninstrumented, render `—` and a truthful state.
