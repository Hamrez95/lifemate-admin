# LifeMate Command Center

Internal management frontend for the LifeMate digital-health ecosystem.

## Current scope

This repository currently contains **PR 1 — Admin Web Foundation**:

- Next.js App Router + TypeScript
- Persian/RTL-first application shell
- LifeMate Command Center design tokens and responsive layout
- routes for the 12 approved management workspaces
- explicit placeholder states that never present fixture metrics as production facts
- accessibility baseline (skip link, semantic navigation, focus states, reduced-motion support)
- CI for formatting, linting, type checking, unit tests, and production build
- security and agent guidance

Authentication, server-side admin RBAC, audit storage, and the `lifemate-admin-api` are intentionally deferred to the next vertical slice in the core `Hamrez95/LifeMate` repository.

## Architecture boundary

```text
Browser: lifemate-admin
        |
        | Supabase Auth session (PR 2)
        v
Authenticated lifemate-admin-api (PR 2)
        |
        | capability RBAC + validation + audit + least privilege
        v
PostgreSQL / analytics read models
```

The browser must never connect directly to sensitive production healthcare tables and must never receive service-role keys, database credentials, AI secrets, social tokens, or other privileged credentials.

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
npm run lint
npm run typecheck
npm test
npm run build
```

## Version choices

The foundation intentionally tracks supported stable releases rather than preview channels:

- Next.js 16.2.11 (Active LTS security line at implementation time)
- React 19.2.7
- TypeScript 6.x
- ESLint 10.7
- Prettier 3.9
- Vitest 4.1

See `AGENTS.md` and `SECURITY.md` before making changes.
