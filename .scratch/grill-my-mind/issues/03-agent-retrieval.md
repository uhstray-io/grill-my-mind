# Let fresh agents understand and continue a large map

Type: research
Status: resolved
Assignee: primary-agent
Blocked by: none
Parent: [Grill My Mind: find the architecture and build a resumable exploration skill](../map.md)

## Question

What retrieval, provenance, revision, and recovery rules let a fresh agent understand and continue a saved map without requiring the original conversation or treating a summary as the whole source of truth?

## Answer

Use a small revision-aware overview and linked detail, explicit evidence and decision state, durable pending questions, and provider-independent IDs. Separate map resumption from provider-session continuation. Test correction handling, stale results, interrupted work, duplicates, and concurrent updates. These are recommended design invariants, not tested implementation guarantees.

Evidence: [retrieval and resume research](../../../docs/research/agent-retrieval-and-resume.md).
