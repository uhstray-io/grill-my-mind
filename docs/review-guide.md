# Exploration workspace review

Branch: `codex/exploration-workspace` · Started: 2026-10-29

The goal is to make Grill My Mind useful across a longer exploration: start with an idea, see which decisions need attention, investigate only chosen branches, and carry the resulting understanding into another work session. The selected Constellation design remains the main interface.

## Try it without changing your saved maps

From this branch, with Node.js 20 or later:

```sh
node scripts/review-demo.mjs --serve
```

Open the URL printed by the command in Brave. Each run creates a new isolated workspace under `.test-output/review-*`; keep the terminal running. The sample is explicitly illustrative, including its answers and accepted findings. It does not access your existing `ideas/` directory and does not launch a model.

The demo explores offline field notes. It includes a question awaiting an answer, a queued investigation, a current accepted pilot, an earlier accepted conclusion made stale by a changed premise, and inactive directions. This variety makes the difference between knowledge, uncertainty, and work state visible.

For your real workspace, use `node skills/grill-my-mind/scripts/server.mjs --workspace <repo>`. If a server already owns it, use `node skills/grill-my-mind/scripts/cli.mjs doctor --workspace <repo>` to inspect the connection before starting another one.

## What to review

1. Open the map overview. Find the unresolved question, stale conclusion, queued branch, and unexplored suggestions without scanning every node.
2. Select a nearby idea and drag it. Connections should follow; refresh should retain the position. Searching and navigation should not start research.
3. Open the exploration brief. Check that the stale accepted conclusion is excluded from accepted-and-current findings. Copy or download the brief for a future agent.
4. Open growth history and scrub backward and forward. Nodes and connections appear by recorded addition. Return to the live map to edit or activate research. Today's findings, statuses, and layout are used throughout; this is deliberately not a complete historical snapshot.
5. Connect an agent using the copyable prompt. On a real idea, choose a branch, answer only questions that matter, and see whether its result actually changes a decision. The agent must be active to process queued work.

## Design decisions

**One coherent variation.** We retained the user-selected Constellation instead of splitting the project into incompatible visual rewrites. New overview, brief, and history views serve different jobs within the same saved map.

**The brief is an index, not another generated opinion.** It extracts recorded material and distinguishes acceptance and freshness. Counts and omission notices prevent a short export from appearing exhaustive. Stable map, node, and question IDs support targeted retrieval. Original text and linked evidence remain authoritative for detail.

**Growth recording precedes full historical replay.** Node dates alone cannot establish when semantic connections appeared. Addition transactions therefore record graph growth explicitly. Older missing dates are shown as unknown; current body text, state, and layout are not retroactively represented as past facts. Full content/version replay remains a future decision.

**Better questions instead of more branches.** The skill should propose branches that resolve a concrete uncertainty, state why that uncertainty matters, and avoid repeating known answers. Technical architecture, product exploration, and nontechnical decisions share that workflow, with different evidence needs. Branch activation remains the user's choice.

**Resumption should be cheap.** Diagnostics distinguish an absent server from an unavailable worker. Paged map discovery and targeted reads let an agent recover the relevant slice without consuming every document. Recorded output sizes are not model tokens or a claim about host compaction.

**No new runtime dependencies.** The app remains portable Node plus browser code. No provider SDK, account linkage, hosted service, remote font, or bundled credential is introduced.

## Verification and limits

Baseline: 25 tests passed before changes on Node.js 24.22.1, Windows. The sandbox initially blocked loopback connections; the same tests passed with permission to connect to their own temporary local servers.

Initial checks and independent agent trials are recorded in [the iteration record](iterations/2026-10-29.md). The subsequent [polish review](iterations/2026-10-29-polish.md) records the deeper correctness review, fixes, and real Brave workflow checks. Do not treat a planned check as a passed check.

Two fresh agents exercised technical and nontechnical ideas, and a third recovered saved context without their conversations. They exposed a partial-findings omission that was fixed and independently retested. The polish pass adds regression coverage for revised-premise history, dependent partial findings, Unicode transport, scoped agent presence, and asynchronous editing. Headless Brave now exercises desktop and phone-width layouts, dragging, history, native undo during polling, exports, and save races; see the polish record for final counts and evidence. Live Claude Code/Copilot and real long-session context validation remain open.

The polished branch passes **90 automated tests and 13 Brave workflow checks**. No reproduced blocker remains in those tested workflows.

Live Claude Code and GitHub Copilot execution, actual long-session host context/compaction, multi-device collaboration, and full content history are not established by these changes. Existing saved prototype snapshots remain comparisons rather than production workflows.

## Review ownership

Only the review branch is intended for pushing. Main remains at the original base. Pre-existing local edits in the owner's saved map are preserved outside implementation commits. Review the branch before merging; this document does not authorize a merge.
