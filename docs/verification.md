# MVP verification

The first MVP was checked locally with Node.js 24.15.0 on Windows. No provider SDK or package installation was needed for the application.

## Automated checks

Run `node --test tests/store.test.mjs tests/server.test.mjs tests/cli.test.mjs tests/graph.test.mjs`.

Checks exercise observable behavior: explicit branch activation, one claim per job, continuation after questions, idempotent result delivery, preservation of original ideas and changed premises, independent concurrent results, cancellation, invalid result rejection, restart recovery, bounded context with hundreds of unrelated nodes, unsupported format rejection, HTTP/CLI round trips, and full package copying to the three discovery paths.

Interrupted temporary snapshots are ignored; large selected-node context is shortened with explicit omission counts. These checks are narrower than a power-loss durability certification.

## Browser and actual-agent trial

- Created the real Grill My Mind exploration through the browser using the user's stated requirements.
- Claimed its initial job through the public CLI, produced a real Codex analysis, and delivered the structured result back through the CLI. Three proposed directions appeared inactive on the canvas.
- In the clearly marked example map, submitted an explicit test answer through the question form and observed continuation queueing. Also activated and cancelled a suggested branch. Test jobs were cancelled afterward so they do not become background work.
- Verified the real map remains after reloading; confirmed readable Markdown exists beside canonical JSON.
- Reviewed the desktop canvas and a narrow mobile viewport. Checked for horizontal overflow and browser console errors; neither was present in that check. Restored the normal viewport afterward.
- Fixed automatic fitting when branches arrive and home navigation based on browser checks.

The first real context packet was 1,922 characters. Later implementation removes repeated premise text to reduce future packets further. The per-job budget targets fewer than 16,000 characters; estimates are not actual vendor token accounting and do not measure the entire conversation.

## Skill validation

JavaScript syntax checks passed. The bundled Python `quick_validate.py` could not run because its environment lacks `yaml` (PyYAML). A dependency-free check instead validated this skill's two plain-text metadata fields, name, description length, lack of unfinished scaffolding, and referenced resources. Installation tests compare the installed skill with its source and verify bundled runtime assets.

## Remaining trial limits

The standalone UI snapshots passed JavaScript syntax and static dependency checks on 2026-09-23. Run `node scripts/verify-prototypes.mjs`; see [the snapshot verification record](../prototypes/README.md) for exact scope, hashes, and the browser-policy limitation. This closes the prototype-selection issue, not live constellation integration.

- Live Claude Code and GitHub Copilot execution is not yet verified; copying to their discovery paths is tested.
- The invoking agent must stay active. An inactive agent is not automatically awakened by a browser click. Queued work remains saved.
- Cancelling rejects a queued/active result locally; it cannot forcibly terminate a host-owned model call or subagent. The agent may finish its current step.
- Context accumulation over long interactive sessions still needs real measurement. Per-job limits alone do not solve conversation growth.
- The application is local and single-writer. Multi-device sync, collaborative merging, schema migration tooling, and advanced graph navigation are not implemented.

## Live Constellation integration — 2026-09-23

Issue 08 is resolved. All 19 automated checks passed, including saved-coordinate preservation, graph state distinctions, deterministic layout without research mutations, and HTTP restart preservation. JavaScript syntax checks passed. The server serves the live UI for old variant URLs and no longer exposes the rejected prototype script.

Browser/agent trial used a new, explicitly labeled `QA — Live constellation` map (`map-65608420`), separate from the owner's original map. Its fixture answer and accepted finding are validation data, not user product decisions.

- Created the QA map through the UI, observed queued/agent-away state, then claimed the root through the public CLI. The browser showed Researching and Agent is listening.
- Delivered a real Codex analysis and question through the CLI; two new suggestions appeared inactive.
- Submitted the fixture answer in the browser and claimed the same root with that answer in its compact context. Delivered continued findings with an inspected local-page source reference, visible in the inspector.
- Dragged a suggested node; its SVG endpoint followed and its coordinates persisted on reload. Alt+Right updated the same node during its later investigation without making the result stale. Final saved position: x=128.34782608695656, y=-219.37391304347824.
- Explicit activation, cancellation, and retry displayed Queued → Ready to retry → Queued. The CLI then claimed only that branch. Its real result added a still-inactive descendant and a visible semantic relationship to another suggestion.
- Accepted the root finding as a QA fixture; work status and acceptance remained distinct. Stale-state distinctions are also covered in graph tests; invalidation is covered in store tests.
- Restarted the server and reloaded the browser: coordinates, the fixture answer, findings, and acceptance remained. QA work is terminal; its unactivated directions remain suggestions.
- Checked the question form in dark mode and a 390×844 viewport; there was no horizontal page overflow. Restored the normal viewport and light mode.
- Both standalone snapshot hashes match the issue-07 record. Their browser-file verification limitation is unchanged; this trial exercised the separate live application over localhost.

The owner's `map-3e4d4390` remains available with its existing queued branch. This implementation trial did not claim or answer that branch. The browser still requires an active invoking agent; it does not launch an LLM on its own. Dense-map usability and conversation growth remain follow-up trials.

## Larger maps and independent resumption — issue 09

See [the complete baseline and trial record](large-map-baseline.md). The 500-node browser test demonstrated and fixed clipped fitting. Search-to-focus, full overview, connected dragging with reload persistence, keyboard search, mobile spacing, and light/dark search were verified. All 20 automated tests and static prototype checks passed; snapshot hashes remain unchanged.

A fresh agent authorized by the owner reconstructed a real saved implementation investigation without this conversation and recovered an omitted fixture answer through linked Markdown. The linked document itself added 43,563 characters; this is evidence that packet caps do not bound every read. Owner-led usability and actual long-session host context usage remain unvalidated. The tests used an isolated workspace and did not claim or answer work in the owner's original map.

After owner review, compact local placement replaced radial spacing that grew with map size. The map opens around the root; clicking centers a node and frames its immediate neighbors, with parent/child links in the inspector. Browser checks confirmed desktop/mobile neighbor visibility and persistent dragging without camera movement. All 21 tests passed, including a dense-layout geometry regression; static snapshot checks remain unchanged. The owner accepted continuing. Issue 09 is resolved; completed-branch semantics are issue 10, while actual long-session host usage and targeted reads remain issue 11.

## Completed branches and targeted retrieval — issues 10 and 11

All 25 automated tests passed using `node --test tests/*.test.mjs`. JavaScript syntax and static prototype checks passed; both standalone hashes remain unchanged. No production dependencies were added. Both local servers were started with the updated backend, and their browser tabs were reopened without discarding unsaved form edits.

Issue 10 is resolved:

- Store/CLI tests reject restarting a completed node and bypasses through cancellation, old answers, direct revision, and replacement results. They preserve the original premise, findings, evidence, and questions when creating a changed-premise child.
- `fork-revision` adds an inactive child and marks affected completed findings stale. Existing unfinished question/answer and interrupted retry checks continue to pass.
- Format-1 completion is inferred for older maps. Recovery stops historical repeat work while retaining node content and job history. This compatibility path is tested with a legacy active repeat; no user-map repeat jobs were found during the server restart inspection.
- In isolated QA map `map-445eb359`, the browser showed a completed root with no **Explore further** action. **Explore a changed premise** created a gray, inactive child and a needs-review marker on the preserved root. Explicit activation queued only the child; its CLI result completed it independently. The original summary and findings stayed intact, and the other suggested child remained inactive. Neither finding was accepted as an owner decision.

Issue 11's implemented retrieval and measurement work:

- `read --node` defaults to a summary, with paged premise/findings/questions/sources/relationships sections. Text queries and question IDs narrow retrieval. Continuing requires the same revision; tests reject mixed-version pages and reconstruct long Unicode/escaped text exactly. Read responses cap formatted JSON at 8,000 characters, with a default 4,000-character raw excerpt.
- A public CLI query for `Fixture question 1:` in the earlier 19-answer fixture returned one complete question/answer in 2,234 output characters. The previous fresh agent read 43,563 raw characters for the whole node. This is roughly 95% less character input for that lookup, not a vendor-token comparison. The answer remains explicitly synthetic.
- Successful operational CLI commands now log only command/map identifiers, timestamp, stdout characters, and UTF-8 bytes. `usage` reports these counts and their exclusions. No credentials, answers, or result bodies are logged.
- The actual two-step issue-10 implementation investigation recorded six CLI outputs: creation 76 characters, two packets 3,309, two result acknowledgements 208, and one targeted findings read 687. Total: 4,280 characters / 4,290 UTF-8 bytes. Browser observations, code/test reads, model-generated text, and other tools are not included.

The long real-session/host context criterion remains open. This environment provides account-wide usage limits rather than an attributable active-context/token counter, so no host token total or compaction behavior is asserted. The shorter actual investigation and synthetic retrieval checks do not substitute for that longer trial. The updated targeted path was tested with new CLI processes; no second fresh-model agent trial was performed.
