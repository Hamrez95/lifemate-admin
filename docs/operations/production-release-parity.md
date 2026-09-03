# Command Center production release parity

Issue: #260

## Source of truth

The Operations page distinguishes the deployment currently executing from current GitHub `main` using immutable commit SHAs.

- Deployed SHA: Vercel system metadata (`VERCEL_GIT_COMMIT_SHA`) with the release workflow stamp as a server-side fallback.
- Current main SHA: resolved server-side from the canonical GitHub repository. A server-only `LIFEMATE_ADMIN_EXPECTED_MAIN_SHA` may be used as an explicit fallback when live GitHub resolution is unavailable.
- Preview deployments are never classified as Production.
- Missing or unverified evidence is never shown as healthy/current.

The browser receives only bounded release identifiers and state. Vercel/GitHub credentials are never required by client code.

## Production release path

Use the `Release Admin` workflow from `main`. Set `deploy_web=true` only for a reviewed release.

The workflow:

1. checks out exact current `main` and records its immutable SHA;
2. runs format, security, lint, typecheck, unit tests and production build;
3. records the previous Production deployment ID when available as the rollback reference;
4. deploys to Vercel Production with release SHA/version/time metadata;
5. waits for Vercel completion;
6. reads the resulting deployment server-side and fails unless `target=production` and the stamped release SHA equals the exact source SHA;
7. publishes the normal immutable release artifacts only after the release jobs succeed.

A newer READY Preview is not release evidence.

## Rollback / forward fix

The Operations page shows the prior Production deployment reference when the canonical release workflow supplied one. Operators may use that ID as the reviewed rollback candidate in Vercel. The Command Center does not auto-rollback.

If Production is behind `main`, either:

- release the reviewed current `main` through `Release Admin`, or
- intentionally keep Production behind while a blocking issue is investigated; the UI must continue to show the drift.

If ancestry cannot be verified, state remains `ahead_or_unknown`/`unverifiable` rather than green.

## Migration compatibility

Deployment parity does not imply database/API migration compatibility. Until a canonical cross-component compatibility contract is available, this field remains `unknown` and must not be inferred from matching timestamps or SHAs alone.
