# LifeMate Command Center visual asset pack

These are reusable, transparent PNG illustrations for the Command Center's RTL design refresh. They are **supporting visuals**, not screenshots of UI: keep all copy, values, tables, charts, buttons, and permissions in React/CSS and canonical API data.

## Asset map

| Asset                               | Primary use                                               |
| ----------------------------------- | --------------------------------------------------------- |
| `founder-ecosystem-hero-v1.png`     | Founder dashboard and mobile CEO monitor                  |
| `login-mfa-hero-v1.png`             | Login and MFA pages                                       |
| `ai-advisor-hero-v1.png`            | AI daily brief and AI advisor                             |
| `user-privacy-hero-v1.png`          | User search, User 360, sensitive-access states            |
| `relationships-consent-hero-v1.png` | Relationships, requests, and consent                      |
| `commerce-hero-v1.png`              | Plans, promotions, subscriptions, and revenue             |
| `marketing-hero-v1.png`             | Campaigns, marketing studio, and calendar                 |
| `finance-hero-v1.png`               | Finance overview, budget, and scenarios                   |
| `support-hero-v1.png`               | Support queue and ticket detail                           |
| `security-audit-hero-v1.png`        | Security, roles, permissions, and audit                   |
| `empty-success-sprout-v1.png`       | Empty, success, and confirmation states                   |
| `wellmate-mascot-v1.webp`           | WellMate product card, ecosystem hero, or empty state     |
| `caremate-mascot-v1.webp`           | CareMate product card, ecosystem hero, or empty state     |
| `connection-ribbon-v1.webp`         | Decorative connection between WellMate and CareMate cards |
| `ecosystem-paths-v1.webp`           | Full-bleed, low-priority ecosystem background scene       |

## Implementation rules

- Render with `next/image`, explicit `width`, `height`, and responsive `sizes`.
- Give `priority` only to the single above-the-fold image on Login or the Founder dashboard. Lazy-load all other images.
- Use one supporting illustration per route/hero; do not repeat a large image inside tables or cards.
- Do not add text or data into an image. Keep Persian/English copy selectable, localizable, and accessible.
- Do not show health, identity, or other sensitive data in a visual asset.
- Preserve transparency; place the PNG on the page's neutral/sage surfaces. Vercel image optimization will serve appropriately sized modern formats at runtime.

## Ecosystem source assets

The two product mascots, connection ribbon, and ecosystem scene are copied from the
canonical `Hamrez95/lifemate-web` repository at commit
`f036cdb669d4ab46c9a0ce71f3666cef9a2c7112`. Keep their attribution and visual
language aligned with that source. `ecosystem-paths-v1.webp` is intentionally a
full-bleed scene rather than a transparent cutout; use it only as a background.
