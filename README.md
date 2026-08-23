# LifeMate Command Center

Internal management frontend for the LifeMate digital-health ecosystem.

## Current live checkpoint — 2026-08-23

The frontend foundation, secure Admin boundary, workforce authentication work, and the first write-capable monetization slice are merged to `main`.

Important delivery caveats:

- `main` currently points at `3b8f74a47a7bc5a922e74fb067faa14784d1a591` (same-origin workforce auth proxy, PR #119).
- The latest verified Vercel **production** deployment is still the earlier `ec87fb61276ed66295ad32424880ca4a178cd0d4` commit from PR #118.
- A Vercel build-rate-limit status is reported against the current `main` head, so source completion must not be described as production-ready until exact-head deployment evidence exists.
- `Hamrez95/LifeMate` owns canonical business migrations and `lifemate-admin-api` contracts. This repository must not add browser-side database shortcuts.
- The separate `lifemate-admin-staging` Supabase project is not production-equivalent and must not be promoted without explicit migration/RLS/grant drift evidence.

### Implemented frontend/security foundation

- Next.js App Router + TypeScript
- Persian/RTL-first shell and responsive management workspaces
- Supabase Auth using publishable browser configuration only
- mandatory Admin API authorization boundary with active membership/capability checks and AAL2 target
- same-origin workforce authentication proxy
- capability-aware navigation and protected routes
- no direct sensitive database reads or mutations from the browser
- format/security/lint/typecheck/unit/build and Playwright/security-denial QA workflows
- audited plan creation/lifecycle and append-only versioned pricing controls where canonical server contracts exist

### Canonical backend boundary

Core LifeMate repository (`Hamrez95/LifeMate`) contains:

- `supabase/migrations/`: canonical forward PostgreSQL migrations
- `supabase/functions/lifemate-admin-api/`: authenticated administrative API boundary
- dedicated `admin` control-plane schema
- explicit role/capability authorization and append-oriented audit foundation
- dedicated least-privilege `lifemate_admin_runtime` identity
- no ordinary runtime grant to raw `lifemate` health tables
- elevated raw-health access reserved for a future reviewed break-glass workflow; Founder/Super Admin has no implicit bypass

## Architecture boundary

```text
Browser: lifemate-admin
        |
        | publishable Supabase Auth session
        v
Authenticated lifemate-admin-api
        |
        | active admin membership + capability + AAL2
        | validation + correlation IDs + audit + idempotency
        v
lifemate_admin_runtime
        |
        v
Approved management tables / read models

ordinary raw-health access -> DENIED
```

The browser must never receive a service-role key, database credential, AI/provider secret, payment secret, raw health payload, or privileged runtime credential.

## Environment variables

Only browser-safe/publishable configuration belongs here:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_ADMIN_API_URL=
```

Never place a Supabase service-role key, PostgreSQL URL/password, AI provider secret, payment secret, social access token, OTP, or signing key in `NEXT_PUBLIC_*` values.

## Local development

Requirements:

- Node.js 20.9+ (CI uses Node.js 24 LTS)
- npm

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Verification

```bash
npm run format:check
npm run security:check
npm run delivery:check
npm run workflow:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:qa
```

## Version choices

- Next.js 16.2.11
- React 19.2.7
- TypeScript 6.x
- `@supabase/ssr` 0.12.4
- `@supabase/supabase-js` 2.111.0
- ESLint 9.39.5
- Prettier 3.9
- Vitest 4.1

## Current priority

Before expanding monetization or lower-priority settings work, reconcile operational gates: exact-head delivery evidence, repository/environment protection, Founder AAL2/bootstrap evidence, Audit Explorer backend pagination/filter contract, incident/backup/restore runbooks, and final Persian/RTL/a11y polish.

See `AGENTS.md` and `SECURITY.md` before making changes.
