# Connect Constellation to the live map

Type: implementation
Status: resolved
Assignee: Codex
Blocked by: none
Parent: [Grill My Mind](../map.md)
Prerequisite: [UI prototype selection](07-ui-prototype-selection.md) — resolved
Resolved: 2026-09-23

## Goal

Make the selected constellation design the working localhost map, using real saved sessions and the existing agent bridge rather than the illustrative fixture and simulated research timers.

## Acceptance criteria

- Render real nodes and relationships from the existing map format, including previously saved sessions.
- Keep suggested nodes gray and inactive until user activation; accurately distinguish queued/running research, questions, explored findings, accepted decisions, and stale findings.
- Route activation, answers, cancellation/retry, and finding acceptance through existing app commands. New suggested descendants never auto-activate.
- Show real node details and available sources in the inspector.
- Retain light/dark modes, pan/zoom, individual connected-node dragging, and keyboard movement. Save positions through the existing map view data and restore them when reopening a session.
- Make Constellation the working UI; remove the rejected variant from the active choice. Preserve the two standalone snapshots as reference artifacts.
- Exercise create/open → activate → real agent result or question → answer → continued result → reopen, including explicit unavailable-agent state. Verify persistence and activation boundaries.

## Scope limits

Live Claude Code/Copilot trials and long-session context measurements remain follow-up work. This issue does not require a new execution architecture, multi-device sync, or a schema redesign unless integration exposes a concrete need. The original map and current data must remain usable during the transition.

## Delivered and verified

Constellation is the live UI, with real nodes, state, relationships, inspector details, sources, existing command mutations, persisted dragging/keyboard coordinates, light/dark preference, and a Maps menu. Old variant links now open the live app; the rejected layout is no longer selectable. The standalone snapshots are byte-for-byte unchanged.

All 19 automated checks passed. A labeled QA session exercised browser creation, real CLI claims/results, question/answer continuation, inactive descendants, sources, semantic links, cancel/retry, acceptance, dragging, keyboard movement, and reopening after a server restart. See [the detailed verification record](../../../docs/verification.md). Existing user work and its queued branch were preserved; no Git history or remote writes occurred.

Next candidate: a longer real exploration that measures context growth and dense-map navigation; live Claude Code/Copilot validation also remains outstanding. These are follow-up trials, not unfinished acceptance criteria for this integration.
