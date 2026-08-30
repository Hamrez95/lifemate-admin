# Restore drill evidence record

Use one copy of this template per restore drill. Record evidence only; do not paste credentials, MFA material, provider secrets, backup decryption keys, health payloads, contact plaintext, or identity-link key material.

## Drill identity

- Date (UTC):
- Operator/owner:
- Target environment:
- Backup identifier/reference:
- Backup timestamp (UTC):
- Admin Git ref:
- Core Git ref:
- Expected migration head:
- Restored migration head:

## Provider evidence

- Backup mechanism/scope:
- Encryption evidence reference:
- Configured retention evidence reference:
- External identity-link key **reference/version** available after restore: yes / no / not applicable
- Key material present in database backup: must be **no**

## Timing

- Drill started (UTC):
- Restore became available for validation (UTC):
- Security smoke completed (UTC):
- Observed restore duration:
- Backup age when drill started:

Observed timings are measurements, not automatically approved RPO/RTO commitments.

## Migration and security validation

- [ ] migration chain matches reviewed source; no history rows manually edited
- [ ] restricted database roles/grants verified
- [ ] RLS posture verified for applicable schemas
- [ ] unauthenticated Admin API access denied
- [ ] authenticated unauthorized route returns `403`
- [ ] authorized path succeeds only with expected permission
- [ ] AAL2 still required for privileged/high-risk Admin path
- [ ] Founder has no bypass
- [ ] browser secret boundary passed
- [ ] Relationship != Consent != Access Grant preserved
- [ ] sensitive health access remains fail-closed
- [ ] user legal/privacy/marketing choices cannot be changed by Admin on their behalf
- [ ] unavailable operational/financial facts remain unavailable, not fabricated
- [ ] audit/evidence boundary contains no sensitive payloads or secrets

## Outcome

- Result: pass / fail / partial
- Deviations:
- Data-integrity findings:
- Security/privacy findings:
- Recovery blockers:
- Follow-up issue(s):
- Approved RPO target and owner: **record only after explicit approval**
- Approved RTO target and owner: **record only after explicit approval**

A drill is not complete when required evidence is unknown. Mark the unknown explicitly and keep Admin #25 open.
