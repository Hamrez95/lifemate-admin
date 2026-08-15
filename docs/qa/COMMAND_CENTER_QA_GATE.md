# LifeMate Command Center QA Gate

`ADM-QA-001` turns the established Command Center security/UI contracts into merge-blocking automated checks. The QA harness is intentionally local and deterministic: it must never depend on production accounts, production Supabase, real OTP/TOTP secrets, PII or PHI.

## What the gate protects

The permanent `admin-qa` workflow covers representative browser and security paths in addition to the repository's normal format/lint/type/unit/build workflow:

- unauthenticated protected-route redirect to the secure login surface;
- existing-account-only phone OTP request (`shouldCreateUser: false`);
- OTP verification followed by a verified TOTP challenge before an AAL2 workspace can render;
- server-authorized workspace rendering after the mocked AAL2 session;
- separate unauthenticated / MFA-required / forbidden routing contracts;
- role × workspace permission denial checks;
- explicit denial of ordinary-role `health.read.elevated` and `women_health.read.elevated` capabilities;
- serious/critical accessibility violations on representative login, forbidden and authorized workspace surfaces;
- Persian/RTL keyboard behavior and mobile/desktop browser projects;
- committed visual snapshots for representative stable surfaces;
- browser/route secret-boundary checks already enforced by `security:check` and contract tests.

## Isolation model

Browser E2E uses only `scripts/qa/mock-services.mjs` and `scripts/qa/start-e2e-server.mjs`.

The local mock service:

- generates an ephemeral RSA keypair at test startup;
- serves a local JWKS endpoint so the real server-side `getClaims()` path verifies the QA JWT;
- implements only the narrow Supabase Auth endpoints needed for phone OTP and verified TOTP;
- rejects an OTP request if `create_user` is not exactly `false`;
- returns an AAL1 token after OTP and an AAL2 token only after the expected TOTP challenge/verify flow;
- exposes a local `/api/v1/me` Admin API fixture that grants only a synthetic `technical` permission set;
- contains synthetic UUIDs/phone/codes only and no production identifier or secret.

There is deliberately **no application-side QA authentication bypass**. The same login component, Supabase client, cookies, `getClaims()`, Admin API boundary and workspace permission checks used by the application are exercised against local test services.

## Visual regression policy

Visual snapshots live beside Playwright specs and are committed to Git.

Normal QA runs use:

```bash
npm run test:e2e
```

An intentional visual change is reviewed first, then baselines are refreshed explicitly with:

```bash
npm run test:e2e:update
```

Never update snapshots merely to make a red build green. Review the changed PNGs alongside the code change and confirm the visual delta is expected.

The current baseline set covers secure login, forbidden state and the authorized Operations workspace on desktop and mobile Chromium.

## Accessibility policy

Playwright runs `@axe-core/playwright` on representative surfaces and fails for `serious` or `critical` violations. This complements, rather than replaces, keyboard assertions such as focus reachability and the application's existing dialog focus-trap contract tests.

Accessibility failures are not waived by screenshot approval.

## Flaky-test policy

Playwright retries are set to **0** in CI. A failed test fails the gate.

If a test is genuinely flaky:

1. keep the gate red;
2. inspect the retained Playwright trace/screenshot/report artifact;
3. fix nondeterministic timing/data/selector behavior;
4. only then rerun the workflow.

Do not hide flakes with retry counts, arbitrary sleeps or production-network dependencies.

## Failure artifacts

The permanent QA workflow uploads the Playwright HTML report and `test-results/playwright` directory on every run. Failed tests retain trace and failure screenshots. Artifacts use a short retention period because they contain only synthetic QA state, but they still must not be used for real user data.

## Local execution

After dependencies and Chromium are installed:

```bash
npm run test:security-denial
npm run test:e2e
```

Playwright automatically starts the local mock services and Next.js test server. No `.env` production configuration is required.

## Merge rule

A Command Center PR that touches protected routes, auth, API boundaries, shared shell, responsive UI or QA harness must not merge with a red `admin-qa` check. The normal `admin-web-ci` check must also remain green.

Production rollout is still a separate operation under `ADM-OPS-002` (#24); passing this QA gate does not deploy the application or migrations.
