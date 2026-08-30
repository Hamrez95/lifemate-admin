# Releasing LifeMate Admin

Use **Actions → Release Admin → Run workflow** on `main`. It builds a Web/PWA release archive and unsigned Windows portable ZIP, with checksums and tag `admin-vX.Y.Z`.

To deploy the Web/PWA from this workflow, set `deploy_web=true` and configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` as repository secrets. Without those secrets, run with `deploy_web=false`: the release assets are still created, but no web deployment is claimed.
