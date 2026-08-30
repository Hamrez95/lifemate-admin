# LifeMate Command Center incident and restore runbook

This runbook is the source-controlled operator procedure for Command Center incidents. It deliberately separates **verified controls** from **provider facts that still require live evidence**. Do not invent an RPO, RTO, backup retention period, or recovery guarantee from source code.

## Scope and safety boundary

This runbook covers the Admin web application, `lifemate-admin-api`, workforce authentication, the Admin PostgreSQL schemas/read models, and the dependencies needed to operate them. It does not authorize production writes by itself.

Non-negotiable rules:

- never place database passwords, service-role tokens, MFA seeds, recovery codes, identity-link encryption/HMAC keys, provider tokens, or backup decryption material in GitHub issues, runbooks, browser logs, or database backups;
- a browser must never receive service-role or direct privileged database credentials;
- authentication is not Admin authorization; recovery must preserve server-side default-deny RBAC and AAL2 requirements;
- Founder has no recovery bypass;
- Account, Person, Relationship, Consent, and Access Grant remain distinct during recovery;
- a restored Relationship does not itself grant health access;
- fail closed if identity-link key material, authorization state, migration provenance, or release provenance cannot be verified.

## Severity model

| Severity | Example | First action |
| --- | --- | --- |
| SEV-1 | suspected credential/key compromise, unauthorized sensitive-data access, destructive production corruption, unavailable authentication for all Admin operators | contain access and preserve evidence before attempting recovery |
| SEV-2 | material Admin API outage, partial authorization regression, failed migration affecting production operations | stop promotion, identify last known-good release and database state |
| SEV-3 | degraded non-sensitive feature, isolated UI/runtime defect without privilege or data-integrity impact | triage through normal release workflow |

Severity may only be lowered after evidence rules out the higher-risk condition.

## Incident command checklist

1. Record UTC start time, affected environment, observed symptom, current deployed release identifiers, and correlation/request IDs. Do not paste secrets or health payloads.
2. Freeze further production promotion while the incident is active.
3. For suspected credential compromise, revoke/rotate the affected credential through its provider control plane before normal troubleshooting. Do not copy replacement values into GitHub.
4. Preserve relevant immutable audit/event identifiers and provider logs. Export only the minimum metadata needed for investigation.
5. Verify whether the failure is authentication, authorization, application release, database/schema, provider, or network related. A `403` must never be "fixed" by weakening RBAC/AAL2.
6. Choose forward-fix or rollback using reviewed release/database evidence. Never run an ad-hoc production DDL statement to make the UI green.
7. Run the post-recovery security smoke below before reopening promotion.
8. Document residual risk, affected window, corrective action, and follow-up issue(s).

## Backup and restore prerequisites

Before a restore can be declared operationally ready, the operator must capture live provider evidence for all of these fields:

| Evidence | Required value | Current source status |
| --- | --- | --- |
| Database backup mechanism | provider/job name and scope | **unverified in source** |
| Backup encryption | provider evidence that backup material is encrypted and key ownership is known | **unverified in source** |
| Backup retention | live configured retention | **unverified in source** |
| RPO | founder/operator-approved target supported by provider evidence | **decision/evidence required** |
| RTO | founder/operator-approved target demonstrated by a timed drill | **decision/evidence required** |
| Restore destination | isolated/disposable or protected staging target | **must be chosen for each drill** |
| Identity-link key recovery | external key reference/version can be restored without storing key material in PostgreSQL backup | **must be evidenced with Core #217** |
| Release correlation | exact Admin + Core refs compatible with restored schema | **required for every drill** |

A source merge does not satisfy these rows.

## Safe restore drill

The normal drill target is an isolated/disposable or explicitly protected staging environment. Never overwrite production to prove that backup works.

1. Capture the source backup identifier and timestamp without exposing credentials.
2. Capture current Core/Admin Git refs and the expected migration head.
3. Restore into the isolated target using provider-approved tooling.
4. Compare migration history with the selected source release before starting application traffic. If the chain diverges, stop and reconcile; do not manually mark migrations applied.
5. Verify restricted database roles/grants and RLS posture before application smoke.
6. Configure required external runtime key **references** through the protected environment; never import key material from the database dump.
7. Start the matching Admin/Core release.
8. Run the security smoke below.
9. Confirm that audit evidence remains append-only/immutable according to the current schema contract and that sensitive values did not appear in restore logs.
10. Record start/end timestamps, restore outcome, observed recovery duration, backup age at drill start, release refs, migration head, and any deviations. These measured values are evidence; they are not automatically the approved RPO/RTO.
11. Destroy or re-protect the disposable restored environment according to provider policy.

## Post-recovery security smoke

All applicable checks must pass before the environment can be considered recovered:

- unauthenticated Admin API request is denied;
- authenticated but unauthorized staff receives `403` on a permissioned route;
- authorized staff path succeeds only with the expected permission;
- high-risk Admin write remains AAL2-gated and audited;
- Founder follows the same AAL2/RBAC path as other privileged workforce identities;
- browser bundle contains no service-role/database credential;
- canonical User 360/Relationships paths preserve Relationship != Consent != Access Grant;
- sensitive health access remains fail-closed without explicit consent/access enforcement;
- Admin cannot mutate a user's promotional opt-out, legal acceptance, or optional consent choice on their behalf;
- production/runtime facts that are unavailable remain unavailable rather than synthesized;
- migration head and deployed release correlation match the evidence captured for the restore.

## Compromised Admin account

1. Disable or revoke the affected workforce identity/session through the canonical auth/control-plane path.
2. Rotate compromised credentials/recovery factors through the provider; do not add a Founder bypass or temporary broad role.
3. Review permission/audit events for the exposure window using privacy-minimized metadata.
4. If sensitive access may have occurred, escalate as SEV-1 and preserve evidence before cleanup.
5. Re-enrollment must return through the canonical invite/activation + MFA/AAL2 path.

## Database migration incident

- stop additional migrations/promotions;
- identify exact source migration and production migration head;
- prefer a reviewed forward-fix when data may have been written under the new schema;
- use rollback only when the migration explicitly supports it and data-loss implications are understood;
- never delete migration-history rows or hand-edit production schema to mimic source state;
- verify RLS/grants and application role journeys after remediation.

## Postmortem record

Each SEV-1/SEV-2 incident should record, without secrets or sensitive payloads:

- incident window and severity;
- user/operator impact;
- detection source;
- root cause and contributing factors;
- exact releases/migration heads involved;
- containment, recovery, and validation actions;
- measured restore/recovery timings when applicable;
- security/privacy assessment;
- corrective/preventive issues with owners;
- explicit remaining unknowns.

## Definition of done for Admin #25

The source runbook is only one part of #25. The issue must remain open until a real isolated restore drill, provider backup/encryption/retention evidence, approved RPO/RTO ownership, and incident-tabletop evidence are recorded. CI can validate that this runbook remains present and fail-closed; CI cannot manufacture those operational facts.
