# Graphify in LifeMate Admin

Graphify is the project’s local codebase map. It turns the repository structure into a queryable graph so Work sessions can identify the relevant routes, components, contracts, tests, and dependencies without loading the entire repository into context.

## Install once per developer environment

Graphify is a Python CLI, not an npm dependency. The package name is `graphifyy`.

### Windows PowerShell

```powershell
winget install astral-sh.uv
uv tool install graphifyy
```

### macOS/Linux

```bash
uv tool install graphifyy
# or: pipx install graphifyy
```

Restart the shell if the `graphify` command is not on PATH.

## Project-scoped Codex integration

From the repository root:

```bash
graphify install --project --platform codex
```

The resulting project skill is checked into `.agents/skills/graphify/`; this repository already carries the official skill and its reference files. `AGENTS.md` is the always-on project policy that makes Graphify mandatory for codebase navigation.

## Low-cost daily workflow

Run the first build once per workspace:

```bash
graphify . --code-only --no-viz
```

Before a task, query the graph with the task’s actual intent:

```bash
graphify query "How does the admin marketing analytics flow through routes, components, API contracts and tests?"
graphify explain "MarketingAnalyticsPage"
graphify path "MarketingAnalyticsPage" "lifemate-admin-api"
```

After edits, refresh the local index:

```bash
graphify update .
```

Use `graphify .` without `--code-only` only when the task truly needs documentation or media relationships. Do not request or configure an API key for ordinary code-only mapping.

## Output and source-of-truth policy

Generated files under `graphify-out/` are local workspace artifacts and are intentionally ignored by Git. The graph is an index, not a source of truth: always open the exact source files returned by a query before editing or making a definitive claim.

If Graphify is not installed or cannot run, record the blocker and use a narrow fallback search; never silently replace a graph query with a whole-repository scan.
