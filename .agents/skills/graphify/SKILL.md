---
name: graphify
description: Use Graphify before broad source reads for architecture, dependency, impact-analysis, and code-navigation questions. It reduces context and token usage by returning a scoped structural view of the repository.
---

# Graphify — mandatory code-context workflow

Use Graphify-Labs/graphify v8+ as the local code index. The graph narrows context; repository source remains authoritative.

## Required workflow

1. Check whether `graphify-out/graph.json` exists.
2. If it is missing, build a low-cost structural graph:
   `graphify . --code-only --no-viz`
3. If it exists but source changed since the last build, refresh it:
   `graphify update .`
4. Before reading broad source, ask a scoped question:
   `graphify query "<task-specific question>" --budget 1200`
5. For relationships use:
   `graphify path "<A>" "<B>"`
   and for a focused concept use:
   `graphify explain "<concept>"`.
6. Open only the source files returned by the graph, then verify exact code before editing or making factual claims.
7. After code changes run `graphify update .` so the next Work/agent can reuse the index.

## Cost and fallback policy

Use code-only mode for routine development. Do not run semantic extraction over docs, PDFs, images, or video unless the task explicitly needs those relationships. Do not commit generated `graphify-out/` artifacts.

If Graphify is unavailable, state the blocker, use a narrow `rg` fallback only, and record the fallback in the final report. Never silently replace a graph query with a whole-repository scan.

When the user invokes `$graphify`, follow this workflow. In PowerShell use `graphify .`, not `/graphify .`.
