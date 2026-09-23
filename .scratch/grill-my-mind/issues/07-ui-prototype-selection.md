# Select and preserve the UI prototype

Type: prototype
Status: resolved
Assignee: none
Blocked by: none
Parent: [Grill My Mind](../map.md)
Resolved: 2026-09-23

## Outcome

The user selected Constellation/version 1 as the direction for the next working prototype. Version 2/research paths is rejected. The selected design is open to later enhancement or replacement based on use.

## Completed

- Built and compared the constellation and research-path interactions.
- Added light/dark modes and individual node dragging while keeping connections attached.
- Preserved [Constellation](../../../prototypes/01-constellation.html) and the [original card map](../../../prototypes/02-original-map.html) as standalone HTML files with simulated interactions.
- Ran JavaScript syntax and static dependency checks against both saved files. Both passed.
- Recorded the design decision, repeatable verification command, exact file hashes, and verification limits in the [snapshot record](../../../prototypes/README.md).

## Closure boundary

This closes the prototype-selection and preservation work, not the entire MVP. Exported-file browser execution was blocked by the browser URL policy and remains unverified; it is not represented as a passing check. The user requested static syntax/dependency verification and decision recording to close this issue. The blocked action was not retried.

## Next

[Issue 08: Connect Constellation to the live map](08-live-constellation.md) is ready. Do not expand this closed issue into live integration or change the saved snapshots as part of that implementation.
