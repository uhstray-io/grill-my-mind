# Measure long-session context and narrow linked-document reads

Type: validation
Status: in progress
Assignee: User (repository owner)
Implementation support: Codex
Blocked by: none
Parent: [Grill My Mind](../map.md)

## Evidence and goal

Issue 09 measured 171,008 cumulative packet characters across 20 synthetic rounds. Its fresh-agent trial recovered an omitted answer by reading a 43,563-character node document. Neither measurement represents vendor token usage or the active conversation window. The owner accepted moving forward after the navigation trial; retain this unresolved measurement as separate work.

## Acceptance criteria

- During a real, longer exploration, record packet input, additional document reads, research/tool outputs, and host-reported context or token usage where available. State what cannot be measured.
- Provide and exercise targeted retrieval of old questions/evidence without loading an entire long node document by default.
- Verify that omitted early constraints remain discoverable, including during fresh-agent resumption.
- Record how real context grows or is compacted. Keep provider estimates distinct from exact measured values, and do not equate per-packet limits with a total-context guarantee.

## Delivered and measured

- Added bounded, revision-aware section reads through HTTP and CLI: summary, premise, findings, questions, sources, and relationships. Query or question ID selects old answers; continuation pages preserve the selected revision. Default node reads now return summaries instead of full histories.
- Added question IDs and retrieval guidance to work packets; updated the portable skill to prefer targeted reads. Excerpts default to 4,000 raw characters and cap formatted JSON at 8,000 characters.
- Added content-free CLI output-size logging and `usage --map ID`. Logs contain counts and identifiers, not credentials or excerpts. They explicitly exclude host tokens, compaction, direct reads, other tools, model replies, and failed commands.
- Retrieved the old fixture answer in 2,234 formatted output characters versus the earlier 43,563-character whole-document read. The same early answer was found without later history. Unicode/escaping pagination reconstructs text exactly, and stale continuation is rejected.
- During issue 10's actual two-step implementation investigation, recorded six CLI outputs totaling 4,280 characters / 4,290 UTF-8 bytes. This is a short validation run, not a long owner-led exploration. Full evidence and limits are in [verification](../../../docs/verification.md).

## Remaining

Run the longer real exploration and record additional reads/tool/research outputs alongside host-reported context or token use if available. The current host tooling exposes account-wide limits, not an attributable per-investigation context counter; those account limits cannot validate this criterion. Actual compaction behavior remains unmeasured. The previous fresh-agent trial established discoverability through linked detail; the new excerpt route is covered by independent CLI processes and tests, not a second fresh-model trial.
