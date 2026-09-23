# MVP verification

The first MVP was checked locally with Node.js 24.15.0 on Windows. No provider SDK or package installation was needed for the application.

## Automated checks

Run `node --test tests/store.test.mjs tests/server.test.mjs tests/cli.test.mjs`.

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

- Live Claude Code and GitHub Copilot execution is not yet verified; copying to their discovery paths is tested.
- The invoking agent must stay active. An inactive agent is not automatically awakened by a browser click. Queued work remains saved.
- Cancelling rejects a queued/active result locally; it cannot forcibly terminate a host-owned model call or subagent. The agent may finish its current step.
- Context accumulation over long interactive sessions still needs real measurement. Per-job limits alone do not solve conversation growth.
- The application is local and single-writer. Multi-device sync, collaborative merging, schema migration tooling, and advanced graph navigation are not implemented.
