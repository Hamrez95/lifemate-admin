# LifeMate Command Center — Current State

Last verified: 2026-08-15 (Asia/Tehran)

## Repositories

- Admin web: `Hamrez95/lifemate-admin`
- Core: `Hamrez95/LifeMate`
- Master roadmap: `Hamrez95/lifemate-admin#49`
- GitHub Issues are canonical; Trello is portfolio/focus only.

## Verified GitHub state

At the ADM-COM-003 milestone sync:

- Admin `main`: `785ab7cb77bca716d14c836a5de501bd8f5539d3` — ADM-COM-003 Admin PR #67 merged.
- Core `main` has advanced to `bb89b3c69693a1701488fd66854db7644665fda2`; ADM-COM-003 Core PR #186 is contained in history as merge `d6e353abc7e12dc34ff48ef589f09cae82da6ef1`.
- Admin Issue #36 is closed as completed.
- Master Issue #49 marks ADM-COM-003 complete and ADM-COM-004 (#37) as the next Commerce task.
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

## ADM-COM-003 verified contract

The Commerce transactions workspace now preserves these domain boundaries:

`Order ≠ Transaction ≠ Provider Event`

Implemented and merged:

- canonical Commerce orders, normalized transactions and append-only provider-event observations;
- `GET /api/v1/commerce/transactions` behind `commerce.read`;
- server pagination and bounded product/provider/status/date/internal-reference filters;
- provider/status filtering aligned across transactions and related recent orders;
- duplicate and out-of-order provider-event diagnostics without exposing provider references;
- `amountMinor` remains string-backed to avoid bigint precision loss;
- Admin browser receives `accountLinked` rather than an account identifier;
- no card information, payment credentials, raw provider payload or raw provider transaction reference in the browser contract;
- Persian-first RTL `/commerce/transactions` UI with mobile fallback and truthful freshness/source states;
- Tehran operator calendar-day filters converted to the correct UTC instants using timezone-aware runtime data;
- discoverable inbound route from `/commerce`;
- Core and Admin review threads resolved with green required CI before merge.

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

1. `ADM-COM-003` Transactions / Orders List (#36)

Next, strictly sequential:

2. `ADM-COM-004` Transaction Detail / Audited Financial Actions (#37)
3. `ADM-COM-005` Promotions / Discount Codes (#16)

The exact current sequence is maintained in Master Issue #49.

## Production rollout

Merged code is not proof of production deployment. Production migration/function rollout, Founder bootstrap, environment configuration and smoke verification remain gated under `ADM-OPS-002` (#24). Re-verify live Supabase immediately before any production write; do not infer live schema or function state from Git history.
