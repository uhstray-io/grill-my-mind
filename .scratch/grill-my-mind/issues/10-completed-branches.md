# Keep explored branches complete and grow new directions

Type: implementation
Status: resolved
Assignee: User (repository owner)
Implementation support: Codex
Blocked by: none
Parent: [Grill My Mind](../map.md)
Prerequisite: [Large-map validation](09-large-map-trial.md)
Resolved: 2026-09-23

## Owner decision

During the issue-09 review, the owner clarified that an explored branch represents an idea already worked through. It should not be re-explored. Further investigation should grow a separate direction from it. Question/answer continuation within an unfinished investigation is distinct from restarting a completed branch.

## Acceptance criteria

- Completed/explored nodes have no repeat-exploration action. Enforce this in the app and command/store boundary, not only by hiding the button.
- Allow the user to add and explicitly activate a new child direction while preserving the completed finding and its evidence.
- Keep question/answer continuation and retry of interrupted, unfinished work functional.
- Specify how changed premises and stale findings lead to a new investigation without silently rewriting completed findings or permitting ordinary repeat exploration.
- Existing maps remain readable; historical jobs and findings are preserved. Test migration/compatibility if a schema change becomes necessary.
- Verify the workflow through the public CLI and browser. Descendants never activate automatically.

## Delivered and verified

Completed branches reject repeat activation, direct premise replacement, answering old questions to requeue them, cancellation as a restart bypass, and replacement results. The UI shows a completion notice and removes **Explore further**. Unfinished question continuations and interrupted retries still pass their existing tests.

**Explore a changed premise** uses `fork-revision` to create an inactive child. Original premise, findings, questions, sources, and review history remain intact; affected findings become stale, and in-flight dependent work notices the changed assumption. Only explicit child activation queues the new investigation.

Format-1 maps remain readable. Completion is inferred for older snapshots; legacy repeat jobs are stopped during recovery while saved content/history are retained. Optional `completedAt` and `revises` fields require no format rewrite.

Verified through store tests, public CLI tests, and the live browser in isolated `map-445eb359`: completed root → changed-premise child (inactive) → explicit activation → child result → completed child, with unchanged original findings. Both completed nodes have no repeat-exploration action. The unchanged synthetic sibling stayed inactive. All 25 automated tests and static prototype checks passed; [verification details](../../../docs/verification.md).
