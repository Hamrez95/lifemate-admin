# LifeMate Command Center delivery contract

This document defines the source-controlled delivery boundary for `lifemate-admin`. It does **not** assert that repository protection, hosted preview infrastructure, staging infrastructure, or production rollout are configured.

## Environment matrix

| Stage         | Trigger                  | Artifact / action                                            | Credentials                                | Promotion authority                                               |
| ------------- | ------------------------ | ------------------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------- |
| Local         | developer command        | local Next.js build/run                                      | developer-local browser-safe config        | none                                                              |
| Preview       | pull request             | short-lived `.next` QA artifact from `admin-preview-staging` | placeholder publishable values only        | none; artifact is not deployed                                    |
| Staging-ready | manual workflow dispatch | `.next` QA artifact built from the selected reviewed ref     | placeholder publishable values only        | none; artifact is evidence, not a deployment                      |
| Production    | separate gated rollout   | not implemented by this workflow                             | environment-scoped reviewed runtime config | ADM-OPS-002 (#24) plus repository/environment protection evidence |

## Non-negotiable boundary

The preview/staging workflow is intentionally artifact-only:

- it has `contents: read` permissions only;
- it has no OIDC, deployment, package, environment, or repository write permission;
- it cannot run a Vercel/Supabase/production deployment command;
- its public build configuration is limited to the three allow-listed `NEXT_PUBLIC_*` values from `.env.example`;
- placeholder values are used in CI so a build artifact never depends on production credentials;
- privileged database credentials, service-role keys, payment/provider secrets, AI secrets, social tokens, and other server-only values are forbidden from the browser build boundary.

`scripts/delivery-contract-check.mjs` enforces the source-controlled parts of this contract in regular CI and in the artifact workflow itself.

## Preview review gate

A pull request that changes application/runtime delivery paths should have:

1. `admin-web-ci` green (format, secret boundary, delivery contract, lint, typecheck, unit tests, production build).
2. `admin-qa` green when its path filters apply.
3. `admin-preview-staging` green with a generated QA artifact when its path filters apply.
4. No unresolved review thread or known security/accessibility regression.

The generated artifact is retained for three days to support review evidence. It is not a release artifact and must not be promoted directly to production.

## Staging-ready evidence

Manual `workflow_dispatch` may build an artifact labelled `preview` or `staging`. This only verifies that the selected ref builds under the same public configuration boundary. It does not prove that a hosted staging environment exists, that its secrets are correct, or that network/API dependencies are reachable.

A real staging deployment, when introduced, must use a separately protected environment with least-privilege credentials and must preserve the Admin API/BFF boundary. It must never give the browser a database or service-role credential.

## Production promotion prerequisites

Production promotion is explicitly outside this workflow. Before any production rollout, all of the following need independent evidence:

- ADM-OPS-002 (#24) rollout approval and runbook;
- protected `main` / required-check policy and protected production environment;
- reviewed production public configuration and restricted server runtime configuration;
- AAL2/RBAC/401/403/allowed-path smoke evidence;
- rollback path and release correlation/version evidence;
- no unresolved security/privacy blocker.

A merge to `main` is **not** production-deployment evidence.

## Rollback semantics

For preview/staging artifacts, rollback means rebuilding a previously reviewed Git ref and comparing QA results. No production data or infrastructure mutation is performed by this workflow.

Production rollback belongs to #24 and must be based on the deployed release/version and live environment evidence; it must not be inferred from Git history alone.

## Known external blocker

GitHub currently reports the Admin `main` branch as unprotected. Source changes in this repository cannot truthfully close that repository-setting requirement. Parent issue #38 must remain open until protection/environment controls are verified live.
