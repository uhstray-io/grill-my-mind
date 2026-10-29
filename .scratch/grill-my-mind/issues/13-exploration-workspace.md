# Make exploration easier to navigate, resume, and review

Type: task
Status: ready for owner review
Assignee: User (repository owner)
Implementation support: Codex with parallel Astra agents
Blocked by: none
Parent: [Grill My Mind](../map.md)

## Objective

The owner authorized substantial improvements on a separate review branch, including implementation, testing, documentation, commits, and pushing that branch. Main must remain unchanged. Build a coherent improvement to the existing Constellation workflow rather than several incompatible replacements.

## Work selected

- Make unresolved questions, stale assumptions, queued work, and suggested directions easy to find in large maps.
- Generate a bounded, portable exploration brief from stored material, with acceptance, uncertainty, and omissions explicit.
- Improve branch proposals and focused questioning through a concise skill and optional exploration guidance.
- Make first use and resumption diagnosable without credentials or an already-running server.
- Complete the data and UI prototype for [Track map growth and replay its history](12-map-growth-history.md).

## Acceptance criteria

- Existing activation, question continuation, completion, stale-result, and persistence behavior still passes meaningful tests.
- Timeline browsing cannot change a map or launch research; incomplete older history is labeled honestly.
- Briefs preserve the distinction between accepted, unreviewed, stale, unanswered, and unexplored material; they do not invent new conclusions.
- Agent reads can find nodes beyond the first page without loading the entire graph into model context.
- Exercise technical and nontechnical exploration, resumption, hostile text, and legacy maps; separate actual model trials from fixtures.
- Provide a reproducible isolated demo, a review guide, decisions, verification evidence, and remaining limits.
- Push only `codex/exploration-workspace`. Preserve the owner's pre-existing local map edits outside the commits.

## Evidence

Baseline on 2026-10-29: all 25 existing Node tests passed with local loopback networking enabled. Main and origin/main both pointed to `bb4a0545a68cc4e399656876667b13161569cfde` before work. Implementation and final results will be linked here when ready for review.

Implementation is documented in [the review guide](../../../docs/review-guide.md), with test results, fresh-agent trials, corrected defects, and remaining UI/host validation limits in [the iteration record](../../../docs/iterations/2026-10-29.md). The owner reviews and decides whether to merge. Main is not a push target.
