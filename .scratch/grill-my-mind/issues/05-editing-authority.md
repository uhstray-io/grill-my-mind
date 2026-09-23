# Decide how users and agents edit saved maps

Type: grilling
Status: resolved
Assignee: none
Blocked by: 02, 03
Parent: [Grill My Mind: find the architecture and build a resumable exploration skill](../map.md)

## Question

Must generic agents and users directly edit canonical repository files, or may they read the files and submit mutations through the application/CLI? Include whether concurrent multi-user Git merging is required initially. Use this answer to choose file authority and consistency rules without independently writable duplicate stores.

## Answer

The user accepted freely readable saved files with edits through the app/CLI. The MVP uses one canonical JSON snapshot and generated Markdown to avoid competing writable copies. Multi-user merging is not implemented or claimed; revisit if needed after the trial.
