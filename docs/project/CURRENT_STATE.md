# LifeMate Command Center — Current State

Last verified: 2026-08-19 (Asia/Tehran)

## Scope and source of truth

- Admin implementation scope: `Hamrez95/lifemate-admin` only.
- Core (`Hamrez95/LifeMate`) is inspected only for required Admin API/database dependencies.
- GitHub live state, connected Supabase, Vercel and Trello evidence override stale snapshots.
- Master roadmap remains `Hamrez95/lifemate-admin#49`.
- Merge does not imply production rollout.

## Live GitHub anchor

- Admin `main`: `2755d833d821b3f872cc5d86ffac415b084dc2ea` (PR #114).
- PR #114 added username/password workforce auth through the dedicated server boundary, pending employee signup, Founder first-run activation support, profile/password change, responsive profile navigation and updated browser QA.
- Exact PR #114 head `46735efe214980f2eefbce3a3f34e8dcbc5fe057` passed `admin-web-ci`, `admin-qa` and `admin-preview-staging`.
- Open Admin PR #108 is the first batch of #106 Monetization Control Plane and remains intentionally unmerged until it is refreshed on current `main` and its already-merged Core dependency is re-verified live.

## Live Supabase anchor

Connected LifeMate project is `ACTIVE_HEALTHY` and now contains the real Admin control plane.

Verified live:

- `admin` schema exists with RLS enabled on Admin tables.
- `lifemate-admin-api` is ACTIVE with JWT verification enabled.
- `lifemate-admin-auth` is ACTIVE and implements the dedicated workforce auth boundary.
- Founder workforce profile exists with stored username `hamrez`, member status `Active`, and active role `founder`.
- Founder activation record still reports `consumed=false`; do not claim one-time activation completion until live evidence changes.
- Supabase security advisor still reports Leaked Password Protection disabled. Password auth must not be treated as production-hardened until owner activation issue #115/#116 is completed with real evidence.

The deployed `lifemate-admin-api` release points to Core commit `846be65bdd50aa0d8fd0d03164fbff84fbd25d45`, which is ahead of and contains the merged Admin commerce dependency from LifeMate PR #370.

## Live Vercel anchor

- Team project `lifemate-admin` now exists on Vercel.
- Recent PR #114 preview deployments are `READY`; the previous build-rate-limit condition is no longer blocking preview builds.
- A production deployment of current `main` still requires fresh evidence. Do not claim production readiness from a preview deployment.
- GitHub still records the Vercel status on merge `2755d833...` as failed because that merge itself was not deployed while the rate limit was active.

## Live Trello anchor

Trello `🎯 Command Center` remains portfolio/focus tracking only. Its Command Center cards are stale relative to current GitHub/Supabase state and must be synchronized after the next verified merge/deployment checkpoint.

## Completed product foundation

The master roadmap records the following functional streams as source-complete: shared data table, global search, notifications, browser/security QA, executive overview, performance guardrails, Windows PWA/portable build, user directory/360/actions, analytics/cohorts, relationships/consent/grants, support, commerce reads/actions, marketing/content/calendar, finance workspaces, operations status, RBAC matrix, role detail/admin membership, and read-only AI insights.

Security boundaries remain unchanged:

1. Browser code never receives `service_role`, database passwords, provider secrets or direct privileged DB access.
2. Auth success alone grants zero Command Center authorization; Admin membership/RBAC is server-side and default-deny.
3. Sensitive Admin APIs remain permission-enforced and AAL2-gated unless a narrowly documented temporary Founder bootstrap compatibility path is explicitly in force.
4. Health and Women Health remain unavailable to ordinary roles; break-glass is not implemented yet.
5. Missing production facts stay explicit unavailable/not-instrumented and are never fabricated.
6. Authenticated Admin pages and API responses remain non-cacheable.

## Current execution order

1. Restore a real Vercel deployment path for current `main`, smoke the login/auth boundary, and record deployment evidence.
2. Refresh Admin PR #108 on current `main`; dependency LifeMate PR #370 is already merged and present in the deployed Admin API release. Re-run all Admin CI/QA before merge.
3. Continue #106 in small dependency-safe batches only where canonical server contracts already exist.
4. Continue #113/#111/#44 only through audited server-side workforce contracts. Do not bypass MFA, membership, role or audit boundaries.
5. Keep #115/#116 as owner/manual production-auth hardening work; no fake completion for Google provider, MFA recovery, leaked-password protection or production origin/domain setup.
6. Finish #43 only when canonical server date filtering and stable cursor pagination exist.
7. #45, #10 and #25 remain gated by their security/production prerequisites.

## Delivery rules

- Fresh short-lived branch and PR for each implementation batch.
- Format/lint/strict TypeScript/unit/integration/build/browser/a11y/security gates must pass on the exact head before merge.
- Review the diff independently from implementation before merge.
- Production mutation/deployment gates remain explicit; source completion alone is not rollout evidence.
