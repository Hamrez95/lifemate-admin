# Building Admin UI

This is the paved path for new LifeMate Command Center screens. The goal is a calm, Buffer-informed product vocabulary without copying Buffer's visual assets or implementation. The public benchmark and adaptation notes live in `docs/qa/BUFFER_REFERENCE_2026-09-26.md`.

## Ownership boundaries

| Layer | Owns | Must not own |
|---|---|---|
| `src/components/ui` | Generic accessible primitives and bounded visual variants | Product permissions, API calls or domain decisions |
| `src/components/shell` | Navigation, workspace context, topbar and global orchestration | Feature-specific data fetching or business rules |
| `app/<domain>` components | Domain semantics, copy, workflow state and domain composition | A second generic button/card/form vocabulary |
| `app/<route>` | Fetch/compose route state and choose a page archetype | Global tokens, generic interaction patterns or browser-only authority |

## Paved path

1. Choose a page archetype: overview, list/detail, form, workspace, or truthful unavailable state.
2. Compose `PageHeader`, `Card`/surface primitives, `FormField`, `DataTable`, `StateCard`, `LoadingState`, `ErrorState` and `ForbiddenState` before creating a new generic element.
3. Use semantic `--lm-*` tokens from `app/design-system.css`; do not create a second token owner.
4. Use CSS logical properties (`margin-inline`, `inset-inline`, `border-block`, `text-align: start`) so RTL and LTR share the same composition.
5. Keep domain visuals in a colocated CSS module only when they are genuinely domain-specific.
6. Keep Server authorization and canonical data decisions on the server boundary; the UI must show loading, empty, error, forbidden, stale and unavailable states truthfully.

## Legitimate new primitives

Add a primitive only when the interaction repeats across at least two domains, has a bounded typed API, centralizes accessibility behavior and has a focused contract test. Prefer composition over a large component with many booleans or arbitrary `variant: string` values.

## Accessibility and performance checklist

- Every control has an accessible name, visible focus and a 44px minimum touch target.
- Tables have captions and scoped headers; status changes use appropriate live regions.
- Keyboard navigation and reduced motion work in both directions and themes.
- Avoid `use client` in primitives unless interaction requires it.
- Keep route data fetching parallel and avoid browser-side secrets or direct database access.

## Migration registry

| Legacy pattern | Current owner/consumers | Removal target |
|---|---|---|
| Raw colors in feature CSS modules | Temporary file registry in `scripts/ui-architecture-check.mjs` | New files are rejected; migrate existing files wave-by-wave with #284 |
| Generic `.section-card`, `.metric-card`, `.state-card` styles | Legacy global styles and profile/auth consumers | Replace with canonical primitives during #284 migration |
| `--lm-*` token declarations outside the design system | Previously included a responsive sidebar override in `app/globals.css` | One owner: `app/design-system.css` — enforced in CI |

## Guardrail command

Run `npm run architecture:check` before opening a PR. It rejects new physical direction rules, duplicate token owners and generic primitive clones while allowing legitimate chart/domain composition and tracking the remaining migration work explicitly.
