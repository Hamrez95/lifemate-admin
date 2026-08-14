# LifeMate Command Center — Analytics Taxonomy & KPI Dictionary

Status: ADM-DATA-001 contract v1

Canonical server contract: `Hamrez95/LifeMate/supabase/functions/lifemate-admin-api/analytics_catalog.ts`

## Rules

1. GitHub source control is the definition source of truth; dashboards must not invent local KPI formulas.
2. Every event and KPI is versioned.
3. Analytics events are aggregate-safe. Raw health, Women Health, treatment details, free-text medical content, contact values and provider secrets are not analytics payloads.
4. `planned` does not mean zero. Until an event is instrumented, dependent KPI values are **unavailable** and UI must render `—` with truthful freshness/availability state.
5. No fake historical backfill is allowed.
6. Command Center analytics access requires `analytics.read`. Finance-derived metrics additionally require the relevant finance permission when introduced.
7. Canonical timezone for KPI definitions is `Asia/Tehran` unless a future definition version explicitly changes it.

## Instrumentation states

| State | Meaning |
| --- | --- |
| `instrumented` | A canonical event producer exists and has a verified source/freshness contract. |
| `partial` | A source exists but does not yet provide complete event-history semantics. |
| `planned` | The taxonomy is defined but the canonical event producer is not implemented. Dependent metrics are unavailable, not zero. |

## Event taxonomy v1

| Event | Domain | Current state | Privacy note |
| --- | --- | --- | --- |
| `account_created` | identity | partial | Account lifecycle only; no contact value. |
| `profile_completed` | profile | planned | Completion event only; no profile payload. |
| `app_opened` | product | planned | Product/session telemetry only. |
| `treatment_created` | treatment | planned | Aggregate event only; no treatment or medication details. |
| `care_invitation_created` | care | planned | No invitation message/content payload. |
| `care_relationship_activated` | care | planned | Relationship lifecycle only; does not imply consent/access grant. |
| `trial_started` | commerce | planned | No payment secret/provider payload. |
| `subscription_started` | commerce | planned | Subscription lifecycle only. |
| `subscription_renewed` | commerce | planned | Subscription lifecycle only. |
| `subscription_expired` | commerce | planned | Subscription lifecycle only. |
| `promotion_redeemed` | commerce | planned | Redemption lifecycle only. |
| `support_ticket_created` | support | planned | No ticket body/free-text payload. |
| `social_post_published` | marketing | planned | Human-approved publishing lifecycle only. |
| `incident_created` | operations | planned | Incident lifecycle only; no secrets/log dumps. |

## KPI dictionary v1

The server contract defines each KPI with canonical name, Persian display name, formula, numerator, denominator, time window, timezone, exclusions, event sources, freshness rule and definition version.

Initial definitions:

- `accounts_created`
- `profile_completion_rate`
- `monthly_active_accounts`
- `care_relationship_activation_rate`
- `treatment_creators`
- `trial_to_subscription_conversion_rate`
- `subscription_renewal_rate`
- `support_tickets_created`
- `social_posts_published`
- `incidents_created`

These names/formulas are not dashboard values. ADM-ANL-001 must consume the server catalog and only display metric values once the corresponding read/value source exists.

## Read-model contract

Command Center consumers call:

`GET /api/v1/analytics/catalog`

Required permission:

`analytics.read`

Response includes:

- `eventTaxonomyVersion`
- `kpiDictionaryVersion`
- `events[]`
- `kpis[]`
- `generatedAtUtc`

The Admin Web client uses `cache: no-store` and does not query analytics or health tables directly.

## Definition-change policy

A semantic change to an event or KPI requires a new definition version. Copy-only changes that do not alter formula, inclusion/exclusion semantics, source, window or timezone may keep the version. A dashboard must be able to identify which definition version produced its displayed KPI.

## Next implementation dependency

ADM-ANL-001 may now build against this contract. It must keep unavailable metrics as `—` until the corresponding canonical event/read-value source is genuinely instrumented and verified.
