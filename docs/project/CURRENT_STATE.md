# LifeMate Command Center — Current State

Last verified: 2026-08-15 (Asia/Tehran)

## Repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core: `Hamrez95/LifeMate`
- Master roadmap: `Hamrez95/lifemate-admin#49`
- GitHub Issues are canonical; Trello is portfolio/focus only.

## Verified GitHub state

At the ADM-QA-001 milestone sync:

- Commerce remains complete through `ADM-COM-005` (#16): Core PR #197 / Admin PR #70.
- `ADM-PLAT-002` (#4) Secure Global Search / Command Palette: Core #198 / Admin #72.
- `ADM-PLAT-003` (#30) Admin Notification Center / Alerts: Core #201 / Admin #74.
- `ADM-QA-001` (#5) is complete via Admin PR #76.
- PR #76 merged only after both permanent checks were green: `admin-web-ci` and `admin-qa`.
- `admin-qa` now runs synthetic local existing-account OTP -> verified TOTP -> AAL2 -> server claims/Admin API/workspace E2E, permission-denial tests, Axe serious/critical checks and desktop/mobile visual regression.
- The QA gate found and fixed real accessibility defects before merge: sidebar accessible names, logo semantics, mobile Command Palette naming and insufficient text contrast.
- Master Issue #49 sets `ADM-PERF-001` (#39) Dataset Performance Guardrails as the current task.
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
- `ADM-QA-001` — Admin PR #76

## Permanent QA gate now in main

- `.github/workflows/qa.yml` is a permanent PR/main browser-security gate in addition to `admin-web-ci`.
- It installs locked dependencies and pinned Chromium, then runs the security denial matrix plus Playwright browser QA.
- Playwright runs desktop and mobile Chromium with Persian locale, Tehran timezone and zero CI retries.
- E2E uses only local synthetic QA services. No production account, PII/PHI, real OTP/TOTP secret, service-role key or application-side auth bypass is used.
- The mock Auth service signs ephemeral RS256 JWTs and serves local JWKS so the real server `getClaims()` verification path is exercised.
- The successful browser flow proves existing-account-only OTP, TOTP challenge/verify, AAL2, Admin API capability retrieval and authorized workspace rendering.
- Representative ordinary role × workspace denial tests run in CI and explicitly exclude `health.read.elevated` and `women_health.read.elevated` from ordinary roles.
- Axe fails the gate for serious/critical violations on representative secure-login, forbidden and authorized surfaces.
- Visual baselines are committed for desktop/mobile representative surfaces and must be intentionally updated/reviewed.
- Playwright retries are zero; failure traces/screenshots/reports are retained as short-lived CI artifacts.

## Secure Global Search contract

- Domains are allow-listed and independently permission-gated: users, support, commerce and campaigns.
- Unauthorized domains are not queried and do not leak existence through counts.
- Raw Health and Women Health are excluded entirely.
- Minimum query length, bounded pagination and DB-backed per-admin rate limiting are enforced.
- Raw query text is not persisted/logged.
- The browser uses a same-origin server boundary; campaign search remains explicit `not_instrumented` until canonical data exists.

## Notification Center contract

- Bell count/list are filtered by source-domain permission before source data is loaded.
- Real approved sources are Support, Security and Operations; Finance/Product remain truthful `not_instrumented` until canonical sources exist.
- Operations uses a metadata-only Outbox projection; raw payloads/resource identifiers are not exposed.
- Exact unread totals are claimed only when authorized sources are complete; otherwise lower-bound known counts plus partial completeness are returned.
- Per-admin read/unread presentation state is permission-checked, idempotent and audited without mutating source business state.
- Raw Health and Women Health are not notification domains.

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

1. `ADM-QA-001` E2E + Accessibility + Visual Regression + Security Denial Matrix (#5)

Current strictly sequential focus:

2. `ADM-PERF-001` Dataset Performance Guardrails (#39)

The exact current sequence is maintained in Master Issue #49.

## Production rollout

Merged code is not proof of production deployment. Production migration/function rollout, Founder bootstrap, environment configuration and smoke verification remain gated under `ADM-OPS-002` (#24). Re-verify live Supabase immediately before any production write.
