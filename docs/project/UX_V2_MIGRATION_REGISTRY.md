# UX v2 migration registry

Last reviewed: 2026-09-28

This registry tracks the generic visual-system migration. It does not claim that backend, Core/LifeMate, provider or hosted-environment work is complete.

| Area | Status | Canonical boundary | Remaining work |
| --- | --- | --- | --- |
| Semantic token foundation | Complete | `app/design-system.css` | Keep token definitions centralized; regression gate is active. |
| Shared primitives and shell | Complete for current v2 surface | `src/components/ui/`, `src/components/shell/` | Extend only with bounded, reusable variants. |
| Route-level semantic migration | Complete | Route CSS consumes shared tokens; domain composition remains local | Review new routes through the inventory gate. |
| Loading/error/empty/forbidden states | Complete for migrated routes | Shared state components and route boundaries | Add states only when a canonical contract exposes them. |
| UX architecture documentation | Complete | `docs/project/BUILDING_ADMIN_UI.md` | Keep examples current as primitives evolve. |
| Performance remediation | Blocked/pending evidence | PERF-01/PERF-02 measurement and safe runtime changes | Requires measured traces and production-equivalent retest. |
| Hosted authenticated visual baseline | Blocked by environment | QA-01 release evidence | Requires staging/production-equivalent authenticated session and green CI capacity. |
| Core/LifeMate-dependent domains | Blocked by source contract | Authenticated Admin API and canonical Core read models | Do not invent UI data or browser-side fallbacks. |

## Guardrails

- `tests/admin-ux-semantic-inventory-gate.test.ts` prevents raw route colors from returning.
- `scripts/ui-inventory.mjs` regenerates `docs/project/UX_V2_UI_INVENTORY.json`.
- The only current raw-color hotspot is the intentional token foundation: `app/design-system.css`.
