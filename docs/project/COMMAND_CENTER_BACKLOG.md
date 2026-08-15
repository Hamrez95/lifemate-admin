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

Every task Issue must be self-contained and include:

- Goal
- Scope
- UI/UX
- Backend/API
- Permission
- Privacy/Security
- Loading / Empty / Error / Forbidden / Stale-Unavailable behavior
- Responsive / RTL / Accessibility
- Tests
- Acceptance Criteria
- Dependencies
- Design Reference
- Definition of Done

## Global implementation invariants

- No direct browser access to sensitive Supabase/admin/health tables.
- All list APIs use server-side pagination and bounded limits.
- Sensitive mutations require authorization, validation, idempotency, reason where applicable and immutable audit.
- Raw health is default deny. Women Health is stricter.
- Relationship does not automatically create Access Grant.
- Admin role is not caregiver access.
- AI phase 1 is read-only and cannot access raw health, execute unrestricted SQL, mutate business state or auto-publish social content.
- Human approval is mandatory for social publishing.
- Actual financials and forecast data are distinct.
- No fake production metrics; unavailable values render `—`.

## Verified execution position

Completed through `ADM-COM-005` (#16), with Core PR #197 and Admin PR #70 merged after required CI. `ADM-COM-004` (#37) is also complete via Core PR #189 and Admin PR #69.

Current strictly sequential focus:

1. `ADM-PLAT-002` — Secure Global Search / Command Palette (#4)
2. `ADM-PLAT-003` — Admin Notification Center / Alerts (#30)

Master Issue #49 is canonical for exact completion state and sequencing. `ADM-OPS-002` (#24) remains the separate production rollout gate; source merges do not imply deployment.
