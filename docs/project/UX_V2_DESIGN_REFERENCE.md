# LifeMate Command Center — UX/UI v2 Reference

Status: foundation reference for #279 / UX-01 (#280)  
Audit date: 2026-09-06  
Scope: `Hamrez95/lifemate-admin` only. This document does not define API, database, provider, analytics-computation, or Core behavior.

## Product standard

LifeMate Command Center is a calm, Persian-first operating workspace for running a digital-health company. It must make the next important action obvious without reducing security, privacy, or operational truthfulness.

The interface is one system with two directions and three appearances:

- Persian is RTL; the primary sidebar is on the right.
- English is LTR; the primary sidebar is on the left.
- Light, Dark, and System are equally supported; product accents never replace semantic status colors.

Founder Home answers: *what changed, what needs action, where should I go next?* Support, Finance, Security, and Marketing then use workspace-specific flows without becoming separate products.

## Live Buffer reference audit

Checked 2026-09-06. Buffer is a UX grammar reference only; LifeMate must not copy its branding, colors, wording, assets, or proprietary UI.

| Public reference | Useful pattern | LifeMate adaptation |
| --- | --- | --- |
| [Buffer product overview](https://buffer.com/) | A small set of named workspaces: Publish, Create, Community, Insights, Collaborate; each has a clear job. | Keep role-filtered workspaces, but organize them around company operations: Users, Support, Commerce, Marketing, Finance, Operations, Security, AI. |
| [Buffer Home rationale](https://buffer.com/resources/buffer-home/) | Home starts newcomers with a small contextual setup set and gives established users clickable status/action summaries rather than an encyclopedic dashboard. | Founder Home displays only actionable company signals, incomplete setup, and priority queues; every tile has a deliberate drill-down. |
| [Buffer Publish](https://buffer.com/publish) | Queue/list and calendar are complementary views; a focused editor lets people tailor a shared draft to each channel. | Marketing uses canonical Queue/Calendar and review patterns. Provider-specific capability differences remain explicit, rather than pretending all channels work alike. |
| [Buffer product overview](https://buffer.com/) | Community centralizes triage with filters/sorting; Insights frames data as answers, not decorative charts. | Support/Community uses a triage split pane. Analytics lead with a decision, comparison window, source status, and one next action. |

Extracted patterns:

1. A workspace has one primary job, not a miscellaneous collection of cards.
2. Home is a launch surface with progressive disclosure, not an ornamental KPI wall.
3. A queue/list and a calendar may represent the same work at different scanning speeds.
4. Composer/review flows keep the primary artifact in focus and put configuration nearby, not first.
5. Triage work benefits from filters, sort, ownership, and a split-pane detail view.
6. Analytics must answer a question and route users to action; it must disclose its coverage and freshness.
7. Mobile preserves review, alerts, approvals, and essential action—not squeezed desktop tables.
8. Current Buffer’s focus on navigation and Home reinforces a small, consistent navigation surface; LifeMate needs this while retaining RBAC and privacy states.

## Current-code inventory

The reproducible static report is [`UX_V2_UI_INVENTORY.json`](./UX_V2_UI_INVENTORY.json). Refresh it with `node scripts/ui-inventory.mjs` after structural UI work.

### Confirmed shared foundation

| Concept | Existing owner | v2 decision |
| --- | --- | --- |
| Shell | `src/components/ui/AppShell.tsx`, `src/components/shell/*` | Retain the ownership boundary; replace forced RTL and physical layout CSS with locale-derived direction and logical properties in UX-04. |
| Header | `PageHeader.tsx` | Evolve to canonical `PageHeader` with actions, metadata/status, and compact/mobile variants. |
| Data table | `DataTable.tsx`, `admin-data-table/*` | Keep one accessible table foundation; add canonical toolbar, pagination, narrow-screen list strategy, and truthful data states. |
| Metrics | `MetricCard.tsx` | Keep as a bounded metric primitive, never a default page layout. |
| State cards | `StateCard.tsx`, Loading/Empty/Error/Forbidden/Success wrappers | Consolidate under a canonical state model, then add Partial, Stale, Unavailable, Not instrumented, and destructive confirmation patterns. |
| Authentication | `app/admin-auth*.css`, `src/components/auth/*` | Migrate after tokens/primitives; MFA/security information stays prominent and truthful. |

### Duplicate/legacy hotspots

- `app/globals.css` and `app/design-system.css` both define overlapping `--lm-*` tokens, and both contain literal visual values. `design-system.css` forcibly sets `.app-shell { direction: rtl; }`.
- The root layout hard-codes `<html lang="fa" dir="rtl">` and `colorScheme: "light"`; this blocks first-class locale direction and dark/system appearance.
- The audit found 40+ feature/global CSS files across route families, plus local design-system styles. This is appropriate for domain layout only after generic surface/form/table/state rules move to canonical primitives.
- Static scan currently finds more than 1,300 raw color literals across `app/` and `src/`. The report identifies file-level hotspots; it is a migration baseline, not a mandate to remove legitimate brand/illustration colors in one change.
- Sidebar currently disables Link prefetch for major navigation and renders Persian labels/ARIA text directly. UX-04 must make navigation locale-aware and measure any prefetch change before adopting it.

## Semantic foundation for UX-02

Components consume intent, never a raw product palette:

```text
canvas, surface, surface-raised, surface-sunken, overlay
text-primary, text-secondary, text-muted, text-inverse
border, border-strong, focus-ring, selection
action-primary, action-primary-hover, action-secondary, action-danger
status-success, status-warning, status-danger, status-info, status-neutral
```

Required non-color tokens: `space-*`, `radius-*`, `shadow-*`, `font-*`, `motion-*`, `z-*`, `content-max`, `sidebar-width`, and component-level tokens only where a reusable primitive needs one. A theme owns token values; components never branch on a theme name.

Appearance initialization must avoid a flash of the wrong theme. System mode follows `prefers-color-scheme`, while an explicit choice remains user-controlled and accessible.

## Visual direction

- **Canvas/surfaces:** warm neutral light canvas and deep ink/charcoal dark canvas, with restrained elevation steps; no page-wide product-color tinting.
- **Typography:** strong, compact page title; secondary context is smaller and quieter; dense data stays readable at 200% zoom.
- **Spacing:** 4px base scale (`4, 8, 12, 16, 20, 24, 32, 40, 48`), with 16/24 as common card/section rhythm.
- **Radius/shadow:** small control radius, medium card radius, restrained low-opacity shadow only to clarify elevation. Borders do most structural work.
- **Color:** use LifeMate green for primary action/selection only. Status colors must have label/icon/text support and retain AA contrast in both themes.
- **Motion:** short, purposeful feedback; respects `prefers-reduced-motion`; no continuous decorative animation.

## Canonical primitive map for UX-03

| Family | Canonical primitive / variants | Domain composition examples |
| --- | --- | --- |
| Layout | `Page`, `Workspace`, `Section`, `Surface`, `Card`, `PageHeader`, `Toolbar`, `FilterBar`, `SplitPane` | User 360, ticket detail, audit timeline |
| Actions | `Button`, `IconButton`, `ActionGroup`, destructive confirmation dialog | Revoke access, publish, suspend |
| Forms | `FormField`, `Input`, `Textarea`, `Select`, `Combobox`, `Checkbox`, `Radio`, `Switch`, date/time field | Commerce adjustments, campaign setup |
| Navigation | `Sidebar`, `Tabs`, `SegmentedControl`, contextual breadcrumb, mobile drawer | Analytics view switcher, marketing calendar |
| Data | `Table`, `List`, `MetricCard`, `Pagination`, `Badge`, `Status` | Users, subscriptions, incident queue |
| Overlay | `Dialog`, `Drawer`, `Popover`, `Tooltip`, `Menu` | User actions, filter presets, approvals |
| States | `Loading`, `Skeleton`, `Empty`, `Error`, `Forbidden`, `Partial`, `Stale`, `Unavailable`, `Success` | Uninstrumented funnel; OAuth/provider state |

Rules: domain components compose these primitives; tokens live in one semantic source; v2 route migrations delete redundant generic CSS in that route. A generic primitive must not absorb domain permissions or business logic.

## State and safety matrix

| State | User-facing truth | Typical primary action |
| --- | --- | --- |
| Loading | Data is being requested; do not imply a value. | Wait or cancel where meaningful |
| Empty | Query succeeded and has no matching records. | Clear filters / create item |
| Error | Request failed; no conclusion about the data. | Retry / view safe diagnostic |
| Forbidden | User lacks permission; navigation visibility was never authorization. | Request access / return |
| Partial | Only named sections/time ranges are available. | View coverage/details |
| Stale | Last verified timestamp and refresh status are visible. | Refresh |
| Unavailable | Capability, credential, or source is unavailable. | Reconnect / resolve dependency |
| Not instrumented | Metric cannot be computed from the current contract. | Open instrumentation requirement |
| Destructive | Outcome, scope, and irreversibility are explicit. | Confirm with clear verb |

Provider/channel UI must distinguish: `CredentialMissing`, `VerificationPending`, `Verified`, `VerificationStale`, `ReconnectRequired`, `RateLimited`, and `Unavailable`. It must never infer a successful connection from stored credentials.

## Direction and responsive rules for UX-04

- Derive `lang` and `dir` from the active locale. One markup/component system; CSS uses logical properties (`margin-inline`, `inset-inline`, `border-inline`, logical grid placement).
- Desktop: persistent sidebar (right in RTL, left in LTR); contextual workspace navigation only when needed.
- Tablet: compact sidebar or drawer, preserving labels on demand—not icon-only navigation without accessible names.
- Mobile: a real drawer/bottom navigation for the highest-priority destinations; tables become a focused list/detail flow or retain an intentional horizontal scroller with column priority. Do not shrink a desktop grid until text clips.
- Charts need accessible textual summary, visible time/filter context, and a no-data/not-instrumented counterpart.

## Page composition archetypes and migration order

| Wave | Route families | User job / canonical composition | Exit condition |
| --- | --- | --- | --- |
| 0 | Tokens, primitives, shell | Make every later page safe to migrate. | #281–#283 merged; component gallery and direction/theme gate present. |
| 1 | Founder Home, Profile, Settings, Users, User 360 | Understand priority; find a person safely; manage own account. | Action-first headers, truthful state matrix, mobile detail flow. |
| 2 | Relationships, Support, Operations, Security/Audit | Triage and safely investigate high-risk work. | Split-pane/list-detail patterns and visible authorization context. |
| 3 | Analytics, Growth, Funnel, Cohorts, Finance | Answer a business question with timeframe, source, coverage, action. | No decorative/false-zero metrics; drill-down route preserved. |
| 4 | Catalog, Plans, Offers, Subscriptions, Entitlements, Pricing | Configure and review commerce without confusing entitlement with health access. | Destructive/confirmation flows standardized. |
| 5 | Marketing, Channels, Campaigns, Calendar, Messaging, Creative, Community | Create, review, schedule, triage, and learn. | Queue/calendar/inbox patterns use provider truth states. |
| 6 | Remaining routes + QA | Remove migrated legacy generic CSS and prove all representative combinations. | #288 visual/a11y evidence across themes, directions, breakpoints. |

## Required page review checklist

Each migration documents desktop Persian RTL, mobile Persian RTL, English LTR, light, dark, loading, empty, error, and forbidden. Add partial/stale/not-enough-data/not-instrumented and destructive confirmation where the route can reach them.

Check: first-glance user job; primary action; keyboard/focus path; labels beyond color; 200% zoom; reduced motion; no clipped Persian; no horizontal overflow except intentional data scrollers; safe fixture/no PHI evidence; and RBAC truthfulness.

## Explicit anti-patterns

- Raw generic hex/rgb values in feature CSS when a semantic token exists.
- `FooCard`, `FooButton`, or `FooInput` made only to change padding.
- A local loading/empty/error design when canonical state components fit.
- Physical `left`/`right` positioning for direction-sensitive layout.
- A single god component that imports every domain concern.
- Treating missing data as zero, partial as complete, or a credential as a verified connection.
- Hiding audit/approval/risk context to make a page look simpler.
- Copying Buffer visuals rather than adapting its interaction grammar.

## Reference assets

The supplied `LifeMate-Command-Center-Design-v1` package is a prior visual/reference asset. Its text/metrics are not production facts and must not be OCR'd into product UI. It informs LifeMate’s warm, human, security-aware visual direction; this v2 reference and verified contracts remain the implementation source of truth.
