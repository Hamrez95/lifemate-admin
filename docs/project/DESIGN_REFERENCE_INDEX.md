# LifeMate Command Center — Design Reference Index

Source package: `LifeMate-Command-Center-Design-v1.zip` supplied by the Founder on 2026-08-13.

The source package contains 28 high-fidelity Persian/RTL screens. Mockups define visual hierarchy, layout and interaction patterns. They are **not** a canonical source for numeric production data or OCR-derived copy.

Task-focused copies committed under `docs/mockups/tasks/` are intentionally optimized for GitHub Issue review.

## Core references

| Reference | Repository file | Primary Issues |
|---|---|---|
| Founder Command Center | `docs/mockups/tasks/01-founder-command-center.jpg` | ADM-HOME-001 |
| AI Executive Brief | `docs/mockups/tasks/02-ai-executive-brief.jpg` | ADM-AI-001, ADM-PLAT-003 |
| User 360 / privacy | `docs/mockups/tasks/03-user-360.jpg` | ADM-USR-002, ADM-USR-004 |
| Secure Temporary Access | `docs/mockups/tasks/04-secure-temporary-access.jpg` | ADM-SEC-005, ADM-USR-005 |
| User Directory | `docs/mockups/tasks/05-user-directory.jpg` | ADM-USR-001, ADM-PLAT-001, ADM-PLAT-002 |
| Support Queue | `docs/mockups/tasks/07-support-queue.jpg` | ADM-SUP-001 |
| Ticket Detail | `docs/mockups/tasks/08-ticket-detail.jpg` | ADM-SUP-002 |
| Roles & Permissions | `docs/mockups/tasks/19-roles-permissions.jpg` | ADM-SEC-001, ADM-SEC-002, ADM-SEC-004 |
| Audit Log | `docs/mockups/tasks/20-audit-log.jpg` | ADM-SEC-003 |
| Relationships & Consent | `docs/mockups/tasks/22-relationships-consent.jpg` | ADM-REL-001, ADM-REL-002 |
| Interface States | `docs/mockups/tasks/28-interface-states.jpg` | ADM-PLAT-001, ADM-QA-001 |

## Full source screen catalogue

1. Founder Command Center
2. AI Executive Daily Brief
3. User 360 and privacy
4. Secure temporary sensitive-access approval
5. User/account search workspace
6. Ecosystem/product analytics
7. Support inbox/queue
8. Support ticket detail
9. Activation funnel
10. Promotion rules/codes
11. Subscription and recurring revenue
12. AI Marketing Studio
13. Campaigns and attribution
14. Financial overview
15. Budget vs Actual
16. Financial scenario planner/runway
17. Operations Command Center
18. Security Command Center
19. Roles and permissions
20. Audit log
21. Secure login and MFA
22. Relationships, access and consent
23. Social content calendar
24. Cohort retention
25. LifeMate AI Advisor
26. CEO mobile monitoring
27. Command Center settings
28. Loading / Empty / Error / Permission state reference

## Visual rules carried into implementation

- Persian-first, RTL by default.
- Desktop-first management experience; responsive down to mobile monitoring/approval flows.
- Warm off-white surfaces, LifeMate mint/green primary, soft blue/violet/coral accents.
- Clean shadows and rounded cards without excessive glassmorphism.
- Dense enough for operational work, but calm and highly scannable.
- No generic corporate/hospital navy dashboard aesthetic.
- Raw health and Women Health data are not shown by default.
- AI, financial, security and social-publishing sensitive actions require human review/approval.
- Every data surface includes Loading, Empty, Error, Forbidden and Stale/Unavailable states.
- Unavailable metrics use `—`; never fabricate a KPI.