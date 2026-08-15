# LifeMate Command Center — Current State

Last verified: 2026-08-16 (Asia/Tehran)

## Repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core: `Hamrez95/LifeMate`
- Master roadmap: `Hamrez95/lifemate-admin#49`
- GitHub Issues are canonical; Trello is portfolio/focus only.

## Verified GitHub state

At the ADM-ANL-002 milestone sync:

- Commerce remains complete through `ADM-COM-005` (#16): Core PR #197 / Admin PR #70.
- `ADM-PLAT-002` (#4) Secure Global Search / Command Palette: Core #198 / Admin #72.
- `ADM-PLAT-003` (#30) Admin Notification Center / Alerts: Core #201 / Admin #74.
- `ADM-QA-001` (#5): Admin PR #76; permanent `admin-web-ci` and `admin-qa` are active.
- `ADM-PERF-001` (#39): Core PR #231 / Admin PR #78.
- `ADM-HOME-001` (#6): Admin PR #80.
- `ADM-ANL-002` (#13): Admin PR #82.
- Admin #82 passed format, browser-secret boundary, lint, strict TypeScript, unit tests, production build and permanent browser/security/a11y QA before merge.
- Existing Analytics Catalog/KPI Core APIs were sufficient for #13; no new Core migration/endpoint was required.
- Master Issue #49 sets `ADM-MKT-001` (#40) Marketing Metrics Overview as the current task.
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
- `ADM-PERF-001` — Core PR #231 / Admin PR #78
- `ADM-HOME-001` — Admin PR #80
- `ADM-ANL-002` — Admin PR #82

## Acquisition / Activation / Retention contract now in main

- `/analytics/cohorts` is available only through the existing `analytics.read` boundary.
- Acquisition cohorts use the real daily `accounts_created` series and preserve its current `partial` provenance.
- `profile_completed` is still planned, so activation conversion remains explicit unavailable.
- `app_opened` history is still planned, so D1/D7/D30 retention is explicit unavailable and is **not** reconstructed from `last_active_at_utc` snapshots.
- Acquisition-channel attribution and churn/return remain unavailable until canonical historical sources exist.
- Cohort filters are bounded to 180 Tehran calendar days.
- Non-zero cohorts smaller than 20 are suppressed before browser delivery; zero remains a real zero and is distinct from unavailable/suppressed.
- The browser contract is aggregate-only and contains no account/person/user identifiers or user-level export.
- The workspace carries versioned taxonomy/KPI definitions and provides a keyboard-scrollable textual table instead of relying only on a heatmap.

## Founder / Executive Overview contract

- Home composes only existing server-side, permission-enforced Analytics KPI, Relationship overview, Commerce overview and Notification Center sources.
- Unauthorized domain sources are not queried, so hidden cards do not leak counts.
- Every displayed metric carries source/freshness state; unavailable/not-instrumented remains explicit and never becomes a fabricated zero.
- Active Relationships are not Consent/Access Grant; active subscriptions are not inferred to be paying-user counts.
- Raw Health and Women Health are excluded from Home aggregation.

## Permanent QA gate

- `.github/workflows/qa.yml` remains a permanent PR/main browser-security gate in addition to `admin-web-ci`.
- It uses synthetic OTP/TOTP/AAL2 without production accounts, PII/PHI, service-role credentials or an application auth bypass.
- Permission denial, Axe serious/critical checks, desktop/mobile visual baselines, RTL/keyboard smoke and zero CI retries remain enforced.
- Do not weaken this gate to make future UI work pass.

## Dataset performance guardrails

- Current pageable Command Center API list surfaces are capped at 100 pages and 100 rows/page; stricter endpoint-specific limits remain stricter.
- Serialized Admin API JSON responses fail closed above 512 KiB.
- Admin responses remain `Cache-Control: no-store`; Admin server clients keep timeouts at or below 10 seconds.
- Performance fixtures/telemetry must not contain production PII/PHI, raw search text, secrets, provider payloads, Health or Women Health content.
- Timeout/unavailable remains distinct from empty/zero data.

## Security rules that remain active

1. Admin Web does not query sensitive database tables directly.
2. Supabase Auth + mandatory MFA/AAL2 precede the Admin API boundary.
3. Authorization is enforced by the Admin API, not navigation visibility.
4. Medical data remains default-deny for ordinary admin roles; Women Health is stricter.
5. Relationship, Consent, Access Grant and Admin Permission remain separate concepts.
6. Admin role never implies caregiver access.
7. Elevated sensitive access remains blocked until the approved break-glass workflow is implemented.
8. Browser code never receives `service_role`, database passwords or payment-provider credentials.
9. Missing data/search/alert/KPI/attribution sources stay explicit unavailable/not-instrumented; production facts are never fabricated.

## Current implementation order

Completed through:

1. `ADM-ANL-002` Acquisition / Activation / Retention / Cohorts (#13)

Current strictly sequential focus:

2. `ADM-MKT-001` Marketing Metrics Overview (#40)

The exact current sequence is maintained in Master Issue #49.

## Production rollout

Merged code is not proof of production deployment. Production migration/function rollout, Founder bootstrap, environment configuration and smoke verification remain gated under `ADM-OPS-002` (#24). Re-verify live Supabase immediately before any production write.
