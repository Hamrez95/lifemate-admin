# LifeMate Command Center Engineering Rules

## Scope

This repository contains the internal LifeMate Command Center web client. Canonical production business-schema migrations stay in `Hamrez95/LifeMate/supabase/migrations`.

## Non-negotiable security boundaries

- The browser must never directly read or mutate sensitive LifeMate production healthcare tables.
- Never commit service-role keys, database credentials, OpenAI secrets, social-media tokens, OTPs, signing keys, PII, or health records.
- Browser-visible environment variables are limited to publishable/non-secret configuration.
- Administrative authorization is enforced by the future `lifemate-admin-api`; hiding navigation is never treated as authorization.
- Raw health information is denied by default. Sensitive access must use a reasoned, time-bound, audited workflow.
- AI integrations must use a server-side gateway and start read-only.

## Product / UI rules

- Persian (`fa`) and RTL are the default experience.
- Preserve the approved LifeMate Command Center visual language: warm off-white surfaces, dark navy text, green LifeMate accent, soft borders, restrained shadows, dense but readable management information.
- Do not replace the approved UI with a generic admin template.
- Desktop-first, responsive, keyboard-accessible, WCAG 2.2 AA where practical.
- Never present fixture/demo metrics as production facts.

## Verification

Before opening or updating a PR run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Use focused branches and reviewable pull requests. Do not force-push `main`.
