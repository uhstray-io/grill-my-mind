# Track map growth and replay its history

Type: wayfinder:prototype
Status: in progress
Assignee: User (repository owner)
Blocked by: none
Scheduling: implemented on review branch; visual owner review pending
Parent: [Grill My Mind](../map.md)

## Question

How should we record when nodes and branches enter a mind map, and let the user scrub through time to see the map come to life?

## User intent

Preserve the timing of additions so a future history view can show how an idea grew. Moving backward and forward through the timeline should reveal the nodes and their connections as they appeared. This is future work, not a request to implement playback now.

## Existing foundation

The store already assigns `createdAt` to nodes and maps and records timestamped history events. Edges do not currently carry their own creation timestamps. These fields are a starting point, not a guarantee that every past map state can be reconstructed. Inspect the existing creation paths and history coverage before choosing a storage change.

## Decisions to resolve

- Define the initial replay scope: additions alone, or also research states, questions, findings, edits, and layout changes. Keep the requested map-growth view as the minimum useful scope.
- Choose durable timing and ordering for node and connection additions, including several additions in one operation or with equal timestamps.
- Decide how a timeline scrubber, readable dates, and return-to-present control should behave; consider automatic playback after the basic interaction is useful.
- Choose a stable historical layout so scrubbing is understandable, and determine how to represent older maps with incomplete timing without inventing dates or historical content.
- Keep history retrieval separate from normal agent context so larger histories do not inflate routine exploration packets.

## Acceptance criteria for future implementation

- Node and branch/connection additions have persistent timing and deterministic ordering across saving and reopening a map.
- The user can scrub backward and forward to see only the nodes and connections that existed at the selected point, with the selected time clearly shown.
- Connections never appear before their endpoints. Batch additions replay consistently.
- Historical browsing is read-only: it does not activate research, alter findings, move saved nodes, or overwrite the current map. Returning to the present restores the live view.
- Any use of present-day content or positions in a historical view is made clear; the view does not imply a full historical snapshot unless the stored evidence supports it.
- Older maps remain readable, and unavailable timing is shown honestly rather than fabricated.
- A representative multi-session map verifies ordering, reload persistence, and timeline navigation; the owner reviews the visual prototype before the interaction is treated as settled.

## Resolution

The 2026-10-29 improvement initiative implemented an additions-only timeline on `codex/exploration-workspace`. Optional format-1 `growth` batches record node and connection additions in transaction order. Current findings, status, and layout remain clearly labeled as current; undated older records appear in their own unknown-date step. History mode prevents graph mutations and research activation.

Automated checks cover equal timestamps, clock regression, edge-only additions, malformed/stale result atomicity, duplicate delivery, reload, legacy maps, detached read-only views, and 500 nodes across 250 additions. See [review guide](../../../docs/review-guide.md) and [iteration evidence](../../../docs/iterations/2026-10-29.md).

This ticket remains in progress for the visual acceptance criterion: the Windows desktop was locked during Brave validation, and native browser interaction was stopped. The implementation is available for the owner to review; no owner design approval is inferred.
