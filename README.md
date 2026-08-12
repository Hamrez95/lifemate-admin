# LifeMate Command Center

Internal management frontend for the LifeMate digital-health ecosystem.

## Current implementation status

The repository now contains the first two reviewed vertical slices:

### PR 1 — Admin Web Foundation

- Next.js App Router + TypeScript
- Persian/RTL-first application shell
- LifeMate Command Center design tokens and responsive layout
- routes for the 12 approved management workspaces
- explicit placeholder states that never present fixture metrics as production facts
- accessibility baseline (skip link, semantic navigation, focus states, reduced-motion support)
- CI for formatting, linting, type checking, unit tests, security checks, and production build

### PR 2 — Authentication and Admin security boundary

Frontend:

- Supabase Auth using publishable browser configuration only
- existing-account phone OTP sign-in (`shouldCreateUser: false`)
- mandatory TOTP MFA / AAL2 before Command Center access
- Next.js SSR session handling and fail-closed protected routes
- capability-aware workspace navigation and route checks
- no direct database reads or mutations from the browser

Core LifeMate repository (`Hamrez95/LifeMate`):

- separate `supabase/functions/lifemate-admin-api` server boundary
- dedicated `admin` PostgreSQL control-plane schema
- Founder / Super Admin / Product / Support / Marketing / Finance / Technical / Security roles
- capability-based server authorization
- append-oriented administrative audit foundation
- dedicated least-privilege `lifemate_admin_runtime` database identity
- ordinary Admin runtime has no direct access to the `lifemate` health schema
- elevated health permissions are not ordinary role permissions and are reserved for future subject-specific, time-bound break-glass access

> The code is merged, but the Admin API/control-plane migration is **not considered live production functionality until the reviewed migration and Edge Function are deployed with explicit environment configuration and the initial Founder bootstrap is completed**.

## Architecture boundary

```text
Browser: lifemate-admin
        |
        | Supabase Auth session + mandatory MFA/AAL2
        v
Authenticated lifemate-admin-api
        |
        | admin membership + capability RBAC
        | validation + correlation IDs + audit + idempotency
        v
lifemate_admin_runtime
        |
        v
Approved management tables / read models

ordinary raw-health access -> DENIED
```

The browser must never connect directly to sensitive production healthcare tables and must never receive service-role keys, database credentials, AI secrets, social tokens, payment secrets, or other privileged credentials.

## Environment variables

Only browser-safe/publishable configuration belongs here:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_ADMIN_API_URL=
```

Never place a Supabase service-role key, PostgreSQL URL/password, AI provider secret, payment secret, or social access token in `NEXT_PUBLIC_*` values.

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
npm run lint
npm run typecheck
npm test
npm run build
```

## Version choices

The current foundation uses stable supported versions compatible with the selected Next.js lint/auth stack:

- Next.js 16.2.11
- React 19.2.7
- TypeScript 6.x
- `@supabase/ssr` 0.12.4
- `@supabase/supabase-js` 2.111.0
- ESLint 9.39.5
- Prettier 3.9
- Vitest 4.1

## Next vertical slice

The next product-data slice is the measurement foundation: formal Event Taxonomy, KPI Dictionary and purpose-built analytics/read models before Founder dashboard metrics are wired. Fake metrics are not acceptable substitutes for missing instrumentation.

See `AGENTS.md` and `SECURITY.md` before making changes.
