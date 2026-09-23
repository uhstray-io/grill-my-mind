# Grill My Mind: find the architecture and build a resumable exploration skill

Type: wayfinder:map

## Destination

Determine a buildable design for Grill My Mind: an installable skill with a localhost mind-map interface, user-activated agent exploration, portable repository persistence, and support for Codex, Claude Code, and GitHub Copilot. The overall user request includes building the skill after the design is understood; this discovery phase resolves the decisions needed for that build.

## Notes

- Use Wayfinder, Grilling, Domain Modeling, and Research during discovery.
- User requirements are recorded in [the product brief](../../docs/product-brief.md); vocabulary is in [CONTEXT.md](../../CONTEXT.md).
- No tracker was selected during setup. Use Wayfinder's local Markdown fallback for this research map; do not imply GitHub tracker configuration has been approved.
- Keep findings and decisions separate. Research tickets resolve investigations, not architecture approval.
- Git changes remain uncommitted. Do not create branches, commit, push, or create PRs without the user's specific authorization.
- Research artifacts belong in `docs/research/`.
- The user explicitly requested an MVP now after accepting the three recommendations. Execution is included in this effort; further discovery must not block a usable trial. The first implementation and checks are documented in [MVP agreement](../../docs/mvp.md) and [verification](../../docs/verification.md).

## Decisions so far

- [Connect the localhost workspace to supported agent environments](issues/01-agent-integrations.md): shared skill packaging is feasible; click-to-run execution requires host-specific integration and testing.
- [Choose candidate formats for a persistent, agent-readable mind map](issues/02-map-formats.md): prototype JSON plus Markdown with explicit authority; final storage depends on editing expectations.
- [Let fresh agents understand and continue a large map](issues/03-agent-retrieval.md): use revision-aware navigation, provenance, durable exploration state, and vendor-independent resumption.
- [Decide whether the invoking agent or the application runs exploration](issues/04-execution-ownership.md): use the invoking agent and test context growth during real use.
- [Decide how users and agents edit saved maps](issues/05-editing-authority.md): files are readable; app/CLI commands own mutations.
- [Define what activating one branch authorizes](issues/06-activation-scope.md): investigate that branch until findings or user input; suggestions remain inactive.
- [Select and preserve the UI prototype](issues/07-ui-prototype-selection.md): resolved 2026-09-23. Constellation/version 1 is selected for the working prototype; version 2 is rejected. Preserve the original map for comparison. This decision can evolve after real use.
- [Connect Constellation to the live map](issues/08-live-constellation.md): resolved 2026-09-23. Real sessions and agent commands now power the constellation. Saved positions survive restart; standalone snapshots remain unchanged. See the live QA record in [verification](../../docs/verification.md).

Research synthesis: [persistent exploration workspace proposal](../../docs/research/recommendation.md). Research conclusions do not constitute user approval of an implementation architecture.

## Follow-up work

- Issues 01–08 are resolved. Next candidates are a longer real exploration measuring context growth and dense-map navigation, plus live Claude Code/Copilot trials. No further implementation ticket has been selected yet.

## Not yet specified

- Detailed interaction between live grilling, proposed branches, and evidence on the canvas.
- Provider availability, rollout order, and which Copilot surfaces must provide the full localhost experience.
- Later schema migrations and history retention as maps grow.
- Live Claude Code and Copilot trials of the packaged command bridge.
- Further visual and interaction refinements after integrating the selected constellation design.
- Context accumulation across many real investigations, beyond bounded per-job retrieval.

## Out of scope

No additional product exclusions have been agreed. A separate final handoff ceremony is not a required outcome; the map must remain useful and resumable throughout exploration.
