# Grill My Mind

This repository contains a portable agent skill plus its dependency-free local web application. The canonical skill package is `skills/grill-my-mind/`. Keep improvements usable when that folder is copied into another repository.

## Product invariants

- Suggestions stay inactive until the user chooses a branch. Creating an exploration authorizes its initial investigation.
- Questions use actual user answers. An agent completing research does not accept its own conclusion.
- Completed branches stay complete; changed premises create new inactive investigations and retain earlier findings.
- The localhost UI stores and queues work. It does not run or wake an LLM. Do not promise background research unless the actual host integration supports it.
- JSON snapshots are authoritative; Markdown is generated. Use the app/CLI/Store for mutations. Preserve old format-1 maps.
- History shows graph growth, with current content and positions. It is not a historical snapshot of every edit or conclusion. Undated older data must stay explicitly unknown.
- Briefs are bounded extracts. Keep accepted, provisional, stale, unanswered, and unexplored material distinct; expose omissions and retrieval paths.

## Layout and checks

- `scripts/store.mjs` inside the skill serializes map mutations and generates readable views.
- `scripts/server.mjs` exposes loopback HTTP and the asset allowlist; `scripts/cli.mjs` is the agent bridge.
- `assets/` contains the live Constellation UI and shared pure graph/history helpers.
- `references/` holds conditional agent guidance; keep `SKILL.md` concise.
- `tests/` uses Node's built-in test runner. Run `node scripts/test.mjs`, `node scripts/check.mjs`, and `node scripts/verify-prototypes.mjs` from the repository root. HTTP tests need local loopback connections.
- `node scripts/review-demo.mjs --serve` creates an isolated illustrative map under `.test-output/` and serves it on a free port.

Do not use the owner's `ideas/` for tests. `.grill-my-mind/` contains runtime credentials and claims: never commit it or print its token fields. Standalone `prototypes/` snapshots are preserved comparisons, not the live app.

## Review context

Read `docs/review-guide.md` for the improvement branch and its limits, and `.scratch/grill-my-mind/map.md` for the local issue tracker. Record decisions with reasons and verification, not hidden reasoning. A copied skill package or simulated worker test does not prove live Claude Code/Copilot compatibility.

The owner requested review on `codex/exploration-workspace`. Do not merge or push main as part of this initiative. Keep pre-existing owner map edits out of implementation commits.
