# Operations runbooks

- [Production release parity](./production-release-parity.md) — immutable SHA comparison, Vercel Production verification and rollback reference discipline.

## Preview/Staging artifact gate

The `admin-preview-staging` workflow is artifact-only: it never deploys or receives production credentials. Before uploading a QA artifact it runs formatting, browser-secret, UI-architecture, workflow supply-chain, lint, TypeScript and unit-test gates, then builds with placeholder public environment values. A green artifact build is not production release evidence; production still requires the reviewed `Release Admin` workflow and server-side deployment verification.
