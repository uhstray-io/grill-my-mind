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
