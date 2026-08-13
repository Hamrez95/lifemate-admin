# LifeMate Command Center — Current State

Last verified: 2026-08-13 (Asia/Tehran)

## Canonical repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core ecosystem/backend migrations: `Hamrez95/LifeMate`

## GitHub state

- `lifemate-admin/main` HEAD: `39b397f6bd8131f3f9212ce7f4bb05003efca300`
- Repository visibility: **public** (risk; must be reviewed before production rollout).
- `main` branch protection: **disabled**.
- Backlog branch: `chore/admin-project-backlog`, currently based on the same verified main HEAD before this documentation work.
- No GitHub Issues existed in `lifemate-admin` at the beginning of the 2026-08-13 backlog migration.

## Merged admin work

### DONE

- Admin web foundation and CI.
- Persian-first / RTL application shell.
- LifeMate design tokens and responsive navigation.
- Supabase SSR authentication client integration.
- Existing-account phone OTP sign-in.
- Mandatory TOTP MFA and AAL2 gate.
- Server-side `/me` authorization through the Admin API boundary.
- Permission-aware workspace navigation and server-side workspace gates.
- Browser source secret-pattern checks.
- Core admin RBAC schema/code merged in `Hamrez95/LifeMate` PR #130.
- Restricted admin runtime model and append-oriented audit foundation merged in core.
- Elevated-access database foundation merged in core.
- Security denial tests for the merged foundation.

### NOT DEPLOYED / VERIFIED AS ABSENT IN PRODUCTION

Verified against the live Supabase project `lifemate` (`bwdvmniywyyijjauipnh`) on 2026-08-13:

- Migration `20260813011500_admin_control_plane_foundation.sql` is **not** present in the production migration history.
- Production `admin` schema has **no tables**.
- Edge Function `lifemate-admin-api` is **not** deployed.
- Founder bootstrap therefore cannot be considered complete in production.

These are intentionally gated under `ADM-OPS-002`; do not apply them ad hoc.

### STILL NEEDS VERIFICATION / OPERATIONAL WORK

- Production Admin Web hosting and environment configuration.
- Repository privacy change.
- Main-branch ruleset / branch protection.
- Preview/staging deployment and CD policy.

## Security invariants

1. Browser code must never read or mutate sensitive Supabase tables directly.
2. Browser must never receive service-role keys, privileged DB credentials, payment secrets, social provider tokens, AI gateway secrets, or other server secrets.
3. Correct path: `Admin Web → Supabase Auth → MFA/AAL2 → lifemate-admin-api → restricted DB role → approved read models/tables`.
4. Raw health data is default-deny.
5. Women Health is treated as more sensitive than ordinary admin/account data.
6. Ordinary roles, including Founder and Super Admin, do not imply raw health access.
7. `health.read.elevated` and `women_health.read.elevated` are not assignable through ordinary role membership.
8. Break-glass access requires purpose, explicit scope, target, TTL, approval, revocation/expiry and immutable audit before any elevated health viewer can ship.
9. Admin Role, Relationship, Consent and Access Grant are distinct authorization concepts.

## Current product state

The Command Center is a secured shell/foundation, not yet a data-operational admin product. The next real vertical slice is the secure user directory followed by User 360.

Implementation order:

1. `ADM-PLAT-001` shared data table/filter/pagination/page-state primitives.
2. `ADM-USR-001` secure user directory end-to-end.
3. `ADM-USR-002` User 360.
4. `ADM-DATA-001` canonical event taxonomy and KPI dictionary.
5. `ADM-ANL-001` product KPI dashboard.

## Data-display rule

Never fabricate production metrics. If data is unavailable, stale or uninstrumented, render `—` and a truthful freshness/unavailable state.
