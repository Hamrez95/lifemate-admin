# LifeMate Command Center — Current State

Last verified: 2026-08-16 (Asia/Tehran)

## Repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core: `Hamrez95/LifeMate`
- Master roadmap: `Hamrez95/lifemate-admin#49`
- GitHub Issues are canonical; Trello is portfolio/focus only.

## Verified GitHub state

At the ADM-HOME-001 milestone sync:

- Commerce remains complete through `ADM-COM-005` (#16): Core PR #197 / Admin PR #70.
- `ADM-PLAT-002` (#4) Secure Global Search / Command Palette: Core #198 / Admin #72.
- `ADM-PLAT-003` (#30) Admin Notification Center / Alerts: Core #201 / Admin #74.
- `ADM-QA-001` (#5) is complete via Admin PR #76; permanent `admin-web-ci` and `admin-qa` are active.
- `ADM-PERF-001` (#39) is complete via Core PR #231 / Admin PR #78.
- `ADM-HOME-001` (#6) is complete via Admin PR #80.
- Admin #80 passed format, browser-secret boundary, lint, strict TypeScript, unit tests, production build and permanent browser/security/a11y QA before merge.
- Existing permission-enforced Core APIs were sufficient for Home; no new Core endpoint/migration was required for #6.
- Master Issue #49 sets `ADM-ANL-002` (#13) Acquisition / Activation / Retention / Cohorts as the current task.
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

## Founder / Executive Overview now in main

- Home composes only existing server-side, permission-enforced Analytics KPI, Relationship overview, Commerce overview and Notification Center sources.
- Unauthorized domain sources are not queried, so hidden cards do not leak counts.
- Every displayed metric carries source/freshness state; unavailable/not-instrumented remains explicit and never becomes a fabricated zero.
- Analytics preserves the canonical KPI `partial`/`unavailable` semantics rather than upgrading fallback data into false certainty.
- Active Relationships are labelled only as Relationships; Consent and Access Grant remain separate concepts.
- Active subscriptions are labelled as subscriptions and are not inferred to be paying-user counts.
- Support/Security/Operations/Finance/Product attention states reuse the permission-filtered Notification Center and safe deep links.
- Raw Health and Women Health are excluded from Home aggregation.
- Per-source failure isolation keeps one unavailable backend source from collapsing the full executive page.

## Permanent QA gate

- `.github/workflows/qa.yml` remains a permanent PR/main browser-security gate in addition to `admin-web-ci`.
- It runs synthetic existing-account OTP -> verified TOTP -> AAL2 -> server claims/workspace authorization without production accounts, PII/PHI, service-role credentials or an application auth bypass.
- Representative permission-denial tests, Axe serious/critical checks, desktop/mobile visual baselines, RTL/keyboard smoke and zero CI retries remain enforced.
- Do not weaken this gate to make future UI work pass.

## Dataset performance guardrails now in main

- All current pageable Command Center API list surfaces are capped at 100 pages and 100 rows/page; endpoint-specific stricter page-size limits remain stricter.
- Relationship ledger keeps its independent maximum 366-day time window; Global Search keeps its stricter page-size and DB-backed per-admin throttle.
- Serialized Admin API JSON responses fail closed above 512 KiB before browser delivery.
- Admin responses remain `Cache-Control: no-store` and Admin server clients keep bounded timeouts of at most 10 seconds.
- Performance fixtures/telemetry remain privacy-minimized: no production PII/PHI, raw search text, tokens, payment credentials, provider payloads, Health or Women Health content.
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
9. Missing data/search/alert/KPI sources stay explicit unavailable/not-instrumented; production facts are never fabricated.

## Current implementation order

Completed through:

1. `ADM-HOME-001` Founder / Executive Overview (#6)

Current strictly sequential focus:

2. `ADM-ANL-002` Acquisition / Activation / Retention / Cohorts (#13)

The exact current sequence is maintained in Master Issue #49.

## Production rollout

Merged code is not proof of production deployment. Production migration/function rollout, Founder bootstrap, environment configuration and smoke verification remain gated under `ADM-OPS-002` (#24). Re-verify live Supabase immediately before any production write.
