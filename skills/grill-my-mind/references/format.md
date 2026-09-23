# Map format v1

Each exploration is saved in `ideas/map-<id>/` inside the working repository:

```text
map.json         canonical snapshot: knowledge, relationships, work, history, layout
README.md        generated overview with source revision and links
nodes/<id>.md    generated readable node detail with source revision
```

The JSON snapshot is the only source of truth. Markdown files are readable projections and can be rebuilt by restarting the server. If a generated file's revision differs from `map.json`, treat it as stale. Do not write generated files expecting the UI to ingest the edit.

`schemaVersion` identifies the format; `revision` identifies a saved map state. Stable map/node/job IDs survive title and layout changes. The original user idea is preserved in `originalIdea`; each node's `prompt` records its current premise independently of model-generated `body` findings. Prior premises and research results remain in history/jobs.

Nodes contain `id`, `title`, `kind`, `parentId`, `prompt`, `summary`, `body`, `status`, `reviewState`, `contentRevision`, `questions`, `sources`, and `stale`. Questions retain answers and answer timestamps. Sources retain an HTTP(S) URL, descriptive title, the supported/challenged proposition, and retrieval timestamp.

- Work states: `suggested`, `queued`, `running`, `awaiting-answer`, `explored`, `interrupted`.
- Review states: `unreviewed`, `accepted`. Staleness is separate from review; a previously accepted finding can need review after a premise changes.
- Graph edges: `contains`, `depends_on`, `supports`, `contradicts`, `related_to`. A visual parent is not an evidence relationship. Dependency links inform context and staleness; they do not automatically activate/schedule other nodes.
- Jobs retain their input-context fingerprint, visible results, worker name, timing and packet character count. A late result whose relevant context changed is retained for review instead of replacing the current premise.
- `view.positions` is presentation state. A layout change does not alter content fingerprints.

The server serializes mutations and writes/syncs a temporary snapshot before replacing `map.json`. Interrupted temporary files are not read as committed snapshots. This is a local single-writer MVP, not a multi-device synchronization system or a guarantee against every filesystem/power-loss failure. Generated Markdown is not part of the authoritative transaction.

Machine-local connection tokens, process locks, result drafts, and claim-delivery files live under `.grill-my-mind/`, which should be ignored by Git. No model API key is part of a map. A provider's original chat history or conversation ID is not necessary to read/continue the map. Share saved maps deliberately: they contain the user's actual ideas and answers.

## Reading procedure

Read the map overview, then the selected node and related evidence. Check status and staleness before treating a finding as accepted knowledge. Use the CLI `read` command or linked node files instead of loading the whole snapshot into an agent's context.
