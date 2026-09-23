# MVP agreement and trial

The user accepted these choices on 2026-09-22 and asked to move to a working MVP rather than continue discovery:

- Use the invoking, already authenticated agent as the first execution mode. Keep integration replaceable.
- Let other agents read saved files, but route mutations through the application's commands.
- One activated branch investigates until it has findings or needs an answer. New suggested branches remain inactive until the user chooses them.
- Measure context growth during actual usage and revisit the bridge if it becomes expensive or awkward.

## First implementation

A self-contained Agent Skill contains a Node.js localhost application and a command bridge. It uses Node's standard library so trial installation needs no package download or provider credentials.

The invoking agent uses `next --wait 25` to receive one compact job, researches or asks questions, and posts a structured result. An active agent session is required for processing; merely opening the website does not start an LLM. The UI shows whether the bridge is listening. It remains usable for viewing, saving, and queuing work while the agent is away.

For this first version, a single `map.json` per map is authoritative, including detailed text. Node Markdown and an overview are generated views at that revision. This reduces the multi-file transaction risk identified in research. A single server coordinates writes, checks expected revisions, and replaces a fully written snapshot. The readable views can be regenerated from the snapshot. Large-map sharding remains a measured follow-up, not an MVP prerequisite.

## Visual direction

The list below records the first card-based MVP. On 2026-09-23 the user selected Constellation/version 1, which is now integrated with the real map and agent bridge. The working UI has light/dark modes, a radial node layout, a contextual inspector, a Maps menu, persistent connected-node dragging, and keyboard movement. The original map is retained as a reference snapshot. See [the design decision](../prototypes/README.md) and [completed integration issue](../.scratch/grill-my-mind/issues/08-live-constellation.md).

- Canvas: ice blue `#edf2f8`; ink: navy `#192b4d`; action: royal blue `#315be8`; questions: burnt orange `#a64f26`; findings: teal `#206b60`; paper: white `#ffffff`.
- Typography: Georgia for the idea/title, Segoe UI for controls and readable body text; no external font request.
- Layout: quiet session rail, generous pannable idea canvas, contextual reading/question panel. Left-align controls and detail; place the root and branches spatially.
- Memorable element: connected idea cards and visibly unactivated branch suggestions. Color indicates meaningful state rather than decoration.
- Review: avoid a landing-page dashboard and decorative counters. The canvas and current question are the work itself.

## Trial checks

- Create a map, activate a branch, get a real agent response, answer a question, and resume the same branch.
- Suggested descendants must never execute without activation.
- Close/restart the server and reopen the saved map.
- Reject duplicate claims and stale result overwrites; preserve partial research.
- Read an overview and relevant branch using a fresh agent.
- Record packet character counts, omitted context, and wait calls. Character-based token estimates are approximate, not vendor token accounting.
- Review layout and keyboard behavior in a real browser.
- Validate skill packaging; do not claim live Claude Code or Copilot execution until independently tried there.
