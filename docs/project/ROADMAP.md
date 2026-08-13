# LifeMate Command Center — Roadmap

This document is a durable implementation sequence. GitHub Issues are the canonical engineering backlog; Trello is only the portfolio/focus layer.

## Phase A — First real vertical slice

1. `ADM-PLAT-001` — Shared Data Table / Filter / Pagination / Page States.
2. `ADM-USR-001` — Secure User Directory.
3. `ADM-USR-002` — User 360.
4. `ADM-DATA-001` — Event Taxonomy + KPI Dictionary + Analytics Read Models.
5. `ADM-ANL-001` — Product KPI Dashboard.

Exit criteria: a permission-checked, server-paginated, production-shaped user lookup/read flow exists end-to-end without direct browser DB access or fabricated data.

## Phase B — Trust, relationships and support

- `ADM-REL-001` Relationship / Consent Overview.
- `ADM-REL-002` Relationship / Consent / Access Grant Ledger.
- `ADM-SUP-001` Support Ticket Queue.
- `ADM-SUP-002` Ticket Detail.
- `ADM-SEC-001` Role × Permission Matrix.
- `ADM-SEC-002` Role Detail + Admin Membership.
- `ADM-SEC-003` Audit Log Explorer.
- `ADM-SEC-004` Invite/Edit Admin Member.

## Phase C — Commerce and product analytics

- `ADM-COM-001` Subscription / Plan / Entitlement Dashboard.
- `ADM-COM-002` Plan / Entitlement Detail.
- `ADM-COM-003` Transactions / Orders List.
- `ADM-COM-004` Transaction Detail / Audited Financial Actions.
- `ADM-COM-005` Promotions / Discount Codes.
- `ADM-ANL-002` Acquisition / Activation / Retention / Cohorts.

## Phase D — Marketing and finance

- `ADM-MKT-001` Marketing Performance Dashboard.
- `ADM-MKT-002` Campaign List + Workflow.
- `ADM-MKT-003` Campaign Detail + Funnel + Publishing.
- `ADM-MKT-004` AI Content Studio.
- `ADM-MKT-005` Secure Social Account Connections.
- `ADM-MKT-006` Content Calendar + Approval Queue + Scheduled Publishing.
- `ADM-FIN-001` P&L Dashboard.
- `ADM-FIN-002` Budget vs Actual.
- `ADM-FIN-003` Burn Rate / Runway / Cash Planning.

AI never auto-publishes social content. Human approval is mandatory. Actual financials and forecasts must remain visually and semantically separate.

## Phase E — Operations, security hardening and AI advisor

- `ADM-OPS-001` Service Health / Background Jobs / Releases / Incidents.
- `ADM-OPS-002` Production Admin API / Migration / Founder Bootstrap.
- `ADM-OPS-003` Private Repo / Ruleset / Preview-Staging / CD.
- `ADM-OPS-004` Runbooks / Backup / Restore / Audit Retention / Incident Response.
- `ADM-SEC-005` Break-glass Sensitive Access.
- `ADM-USR-005` Elevated Health Viewer — blocked until `ADM-SEC-005` is complete and approved.
- `ADM-AI-001` AI Business / Marketing Advisor, phase 1 read-only.
- `ADM-SET-001` Environment / Team / Command Center Settings.

## Cross-cutting platform work

- `ADM-PLAT-002` Secure Global Search / Command Palette.
- `ADM-PLAT-003` Admin Notification Center / Alerts.
- `ADM-QA-001` E2E + Accessibility + Visual Regression + Security Denial Matrix.
- `ADM-PERF-001` Large Dataset / Query Limits / Caching / Rate Limits.

## Release gates

Every implementation task follows:

1. Read the Issue and dependency state.
2. Fetch latest `main`.
3. Create a dedicated branch from verified latest `main`.
4. Implement the smallest complete vertical slice.
5. Add/adjust tests.
6. Run formatting, lint, typecheck, unit tests and production build as applicable.
7. Run security denial checks for protected paths/data.
8. Open PR.
9. Wait for CI and inspect failures.
10. Merge only when green and review concerns are resolved.
11. Close the Issue and update the Master Issue.
12. Update `CURRENT_STATE.md` after meaningful milestones.
13. Update Trello only at milestone/focus level.

## Production rollout gate

`ADM-OPS-002` is intentionally independent from ordinary feature work. Production migration/function deployment, Founder bootstrap, secret/env configuration and smoke tests must be verified immediately before any production write. Never assume repository merge means production deployment.