# LifeMate Command Center — Canonical Backlog

GitHub Issues are the canonical engineering tasks. This file is the durable index and sequencing aid; keep it synchronized with the Master Issue after milestones.

## Platform / Foundation

- `ADM-PLAT-001` Shared Data Table / Filter / Pagination / Page States
- `ADM-PLAT-002` Secure Global Search / Command Palette
- `ADM-PLAT-003` Admin Notification Center / Alerts
- `ADM-QA-001` E2E + Accessibility + Visual Regression + Security Denial Matrix
- `ADM-PERF-001` Large Dataset / Query Limits / Caching / Rate Limits

## Command Center Home

- `ADM-HOME-001` Founder / Executive Overview

## Users

- `ADM-USR-001` Secure User Directory
- `ADM-USR-002` User 360
- `ADM-USR-003` User Action Menu
- `ADM-USR-004` Full User Detail / Timeline / Tabs
- `ADM-USR-005` Elevated Health Viewer — **blocked by ADM-SEC-005**

## Analytics / Data

- `ADM-DATA-001` Event Taxonomy + KPI Dictionary + Analytics Read Models
- `ADM-ANL-001` Product KPI Dashboard
- `ADM-ANL-002` Acquisition / Activation / Retention / Cohorts

## Relationships & Consent

- `ADM-REL-001` Relationship / Consent Overview
- `ADM-REL-002` Relationship / Consent / Access Grant Ledger

## Support

- `ADM-SUP-001` Support Ticket Queue
- `ADM-SUP-002` Ticket Detail

## Commerce

- `ADM-COM-001` Subscription / Plan / Entitlement Dashboard
- `ADM-COM-002` Plan / Entitlement Detail
- `ADM-COM-003` Transactions / Orders List
- `ADM-COM-004` Transaction Detail / Audited Financial Actions
- `ADM-COM-005` Promotions / Discount Codes

## Marketing

- `ADM-MKT-001` Marketing Performance Dashboard
- `ADM-MKT-002` Campaign List + Workflow
- `ADM-MKT-003` Campaign Detail + Funnel + Publishing
- `ADM-MKT-004` AI Content Studio
- `ADM-MKT-005` Secure Social Account Connections
- `ADM-MKT-006` Content Calendar + Approval Queue + Scheduled Publishing

## Finance

- `ADM-FIN-001` P&L Dashboard
- `ADM-FIN-002` Budget vs Actual
- `ADM-FIN-003` Burn Rate / Runway / Cash Planning

## Operations

- `ADM-OPS-001` Service Health / Background Jobs / Releases / Incidents
- `ADM-OPS-002` Production Admin API / Migration / Founder Bootstrap
- `ADM-OPS-003` Private Repo / Ruleset / Preview-Staging / CD
- `ADM-OPS-004` Runbooks / Backup / Restore / Audit Retention / Incident Response

## Security

- `ADM-SEC-001` Role × Permission Matrix
- `ADM-SEC-002` Role Detail + Admin Membership
- `ADM-SEC-003` Audit Log Explorer
- `ADM-SEC-004` Invite/Edit Admin Member
- `ADM-SEC-005` Break-glass Sensitive Access

## AI

- `ADM-AI-001` AI Business / Marketing Advisor — phase 1 read-only

## Settings

- `ADM-SET-001` Environment / Team / Command Center Settings

## Required Issue contract

Every task Issue must be self-contained and include Goal, Scope, UI/UX, Backend/API, Permission, Privacy/Security, state behavior, responsive/RTL/accessibility, Tests, Acceptance Criteria, Dependencies, Design Reference and Definition of Done.

## Global implementation invariants

- No direct browser access to sensitive Supabase/admin/health tables.
- All list APIs use server-side pagination and bounded limits.
- Sensitive mutations require authorization, validation, idempotency, reason where applicable and immutable audit.
- Raw Health is default deny. Women Health is stricter.
- Relationship does not automatically create Access Grant; Admin role is not caregiver access.
- Global Search is allow-listed and permission-filtered; it never exposes raw Health, Women Health or arbitrary SQL.
- Notification counts/lists are permission-filtered; Operations alerts use metadata-only projections; missing source instrumentation is explicit.
- `admin-qa` is now a permanent merge gate: isolated synthetic MFA E2E, denial matrix, Axe, responsive/RTL and visual baselines; CI retries stay zero.
- Performance work must measure representative approved read models/endpoints without importing PII/PHI or production secrets into fixtures/logs/artifacts.
- Large-list APIs remain bounded; query/index/cache/rate-limit changes require representative explain/benchmark evidence and safe failure behavior.
- AI phase 1 is read-only and cannot access raw health, execute unrestricted SQL, mutate business state or auto-publish social content.
- Human approval is mandatory for social publishing.
- Actual financials and forecast data are distinct.
- No fake production metrics, search results or alerts; unavailable values render `—` or explicit unavailable/not-instrumented state.

## Verified execution position

Completed through `ADM-QA-001` (#5): Admin PR #76. `ADM-PLAT-003` (#30) is Core #201 / Admin #74; `ADM-PLAT-002` (#4) is Core #198 / Admin #72; Commerce remains complete through `ADM-COM-005` (#16): Core #197 / Admin #70.

Current strictly sequential focus:

1. `ADM-PERF-001` — Dataset Performance Guardrails (#39)

The browser/security regression gate is now permanent, so performance guardrails are the current foundation task before additional feature breadth. Master Issue #49 is canonical. `ADM-OPS-002` (#24) remains the separate production rollout gate; source merges do not imply deployment.
