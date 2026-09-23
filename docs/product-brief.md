# Grill My Mind: product brief

Status: first MVP implemented after the user approved the execution, editing, and activation recommendations. See [MVP agreement](mvp.md) and [verification](verification.md) for the current build; the original research remains linked for context.

## Confirmed by the user

- Build an installable skill named **Grill My Mind**, inspired by Grill Me's questioning workflow.
- Support Codex, Claude Code, and GitHub Copilot. Ultimately keep the design portable to additional agent environments. Rollout order and the specific Copilot surfaces are not yet settled.
- Launch a visually appealing localhost interface where a user describes an idea and explores a map resembling a technology tree.
- Agents identify potential branches. The user activates branches through the UI before agents explore them.
- Mix questioning, deeper analysis, and research throughout the map.
- Focus on domains, thinking, architecture, and technical/coding ideas, without restricting the tool to software topics.
- Save the information in the repository in a structured format that other agents can easily understand.
- Let the user reopen and continue a previous mind map.
- A mandatory final handoff is not the intended product model. Investigate persistent formats rather than assuming a final document is the primary outcome.

## Research completed

1. Which supported interfaces connect the local UI to each agent environment?
2. Which persistence format preserves meaning, evidence, revisions, and resumability while remaining readable by arbitrary agents?
3. How should an agent retrieve enough context from a large map without loading all its history?

## Accepted direction for the MVP

- Represent cross-links between branches, even if the default visual layout resembles a tree.
- Separate approval to explore a branch from acceptance of any conclusion it produces.
- Preserve source evidence and distinguish it from agent inferences and user decisions.
- Make the saved map usable without keeping its originating chat open.
- Use the invoking agent first, with bounded context and usage measurements; keep that integration replaceable.
- Let agents read saved maps, but route edits through the app/CLI.
- An activated branch investigates until it has findings or needs a user answer. New directions require separate activation.

## Open product decisions

- Whether normal questioning should happen entirely in the web UI and how the launch chat participates afterward.
- Refinements to interruptions, retries, and budgets based on the first trial.
- Whether maps are private to one user/repository at first or expected to merge changes from multiple collaborators.
- How the UI represents accepted decisions, unanswered questions, alternatives, and stale findings.

The local planning index is [the Wayfinder map](../.scratch/grill-my-mind/map.md).
