# Validate larger maps and longer exploration sessions

Type: validation
Status: resolved
Assignee: User (repository owner)
Implementation support: Codex
Blocked by: none
Parent: [Grill My Mind](../map.md)
Prerequisite: [Live constellation](08-live-constellation.md) — resolved
Started: 2026-09-23
Resolved: 2026-09-23, following owner review and navigation refinements

## Goal

Establish whether the selected constellation remains usable as an idea grows, and whether repeated investigations provide enough relevant context without excessive growth. Start with reproducible synthetic measurements, then validate during real exploration.

## Acceptance criteria

- Record a reproducible baseline for 25, 100, 250, and 500 nodes: layout extent, packet size and omissions, saved JSON size, and local save latency.
- Exercise at least 20 question/result continuation rounds in an isolated fixture. Measure individual and cumulative packet sizes, durable question retention, job/history growth, and inactive suggestions.
- Trial dense-map navigation in the live UI: locate a named node, inspect it, move it while keeping connections, and return to the overview. Record usability problems and address any blocker demonstrated by the trial.
- Run a real exploration and resume it from a fresh agent. Record what context was loaded, what information was missed, and the owner's usability feedback. Distinguish measured packet sizes from actual host conversation/token usage.
- Document findings, remaining limitations, and concrete follow-ups. Do not claim synthetic results establish real research quality or total context-window safety.

## Scope limits

Keep the two saved HTML prototypes unchanged. Use isolated QA data for synthetic measurements; do not activate existing user branches. Cross-host Claude Code/Copilot trials remain separate. This issue does not authorize changing execution architecture or automatic branch activation.

## Progress

- Selected and assigned to the repository owner on 2026-09-23.
- Completed the 25/100/250/500-node baseline and 20 simulated continuation rounds. The reproducible harness is `scripts/measure-exploration.mjs`; see [measurements and limitations](../../../docs/large-map-baseline.md).
- Confirmed the clipping problem in the browser, fixed full-map fitting, and added title search and readable node focus. Tested 500-node overview, connected dragging, persisted coordinates, keyboard search, and mobile/light/dark presentation.
- Saved an actual implementation investigation through the public CLI. An independently authorized fresh agent reconstructed its findings without the conversation, and recovered an omitted old fixture answer through linked Markdown. The full linked document added 43,563 characters, identifying targeted retrieval as a follow-up concern.
- All 21 automated tests passed after the compact-layout refinement. Both preserved HTML snapshots passed static checks with unchanged hashes.
- The owner reviewed the live trial, reported that everything generally works, requested closer/asymmetric placement and node centering, and accepted continuing. Replaced map-wide radial spacing with local placement/relaxation; open and select around the chosen node with parent/children visible. Dragging retains the camera and saves only the moved node; saved manual positions take precedence. Added nearby parent/child navigation.
- Resolution is based on the completed technical checks and that owner feedback. It does not imply a long owner-led real-idea conversation or host context usage was measured. That outstanding work is explicitly carried into [issue 11](11-context-growth.md).
- The owner's completed-branch lifecycle clarification is the next implementation issue: [issue 10](10-completed-branches.md).
