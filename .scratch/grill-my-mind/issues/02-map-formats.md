# Choose candidate formats for a persistent, agent-readable mind map

Type: research
Status: resolved
Assignee: map_format_research
Blocked by: none
Parent: [Grill My Mind: find the architecture and build a resumable exploration skill](../map.md)

## Question

How do JSON with Markdown, JSON Canvas, JSON-LD/RDF, SQLite, and event logs compare for semantic relationships, evidence, user decisions, repository portability, cross-agent readability, and resuming a mind map? Identify a recommended candidate without treating it as an approved implementation decision.

## Answer

No inspected standard supplies the complete exploration semantics. Prototype a versioned JSON-and-Markdown bundle with explicit authority; retain SQLite plus readable projections as an alternative depending on editing expectations. Canvas is useful for visual interchange, linked-data standards for optional semantic interchange, and a log for history only with documented guarantees. Final storage is not selected.

Evidence: [map format research](../../../docs/research/map-formats.md).
