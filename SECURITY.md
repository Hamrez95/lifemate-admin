# Security Policy

LifeMate Command Center is an internal management surface for a digital-health ecosystem. Treat every administrative capability as privileged.

## Data boundaries

The web client authenticates administrators but does not receive database credentials or server secrets. Sensitive reads and all mutations are mediated by an authenticated administrative API with server-side authorization, validation, audit logging, and least-privilege database access.

## Secrets

Never commit or expose:

- Supabase service-role credentials
- PostgreSQL connection strings/passwords
- OpenAI or other AI provider secrets
- social-media access/refresh tokens
- payment provider secrets
- signing keys or certificates
- user auth tokens, OTPs, PII, or health records

Only publishable browser configuration belongs in `NEXT_PUBLIC_*` variables.

## Sensitive health data

General admin roles must not receive raw health records by default. Future elevated access must be purpose-limited, time-bound, explicitly approved where required, and append-audited. Private women-health notes require stricter treatment and must never appear in ordinary User 360 responses.

## Reporting a security issue

Do not open a public issue containing exploit details, credentials, PII, or health information. Use the repository owner's private security contact/process.
