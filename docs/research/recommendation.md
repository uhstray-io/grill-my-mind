# Grill My Mind: persistent exploration workspace

Status: research-backed proposal for discussion. No application or provider integration has been implemented or tested.

## Recommended direction

Build a living knowledge map saved in the repository, with a visual workspace and a documented reading contract for agents. Reopening the workspace continues the same map; switching agents does not require the original conversation or a final export.

Research supports a **versioned JSON-and-Markdown bundle** as the first candidate to prototype. JSON defines identity, relationships, state and provenance; Markdown holds readable detail. A small generated overview lets another agent find the relevant parts without loading the entire exploration. This recommendation is an engineering judgment, not a claim that a standard guarantees model comprehension.

The evidence and alternatives are in [map formats](map-formats.md), [retrieval and resumption](agent-retrieval-and-resume.md), and [agent integrations](agent-integrations.md).

## Why this representation

| Option | Assessment |
| --- | --- |
| JSON plus Markdown | Best first prototype for ordinary repository access, inspectability, custom semantics, and selective reading. Requires explicit authority and consistency rules. |
| JSON Canvas | Useful visual interchange. Its standard defines drawing primitives, not our research/decision/approval model. |
| JSON-LD with provenance terms | Useful if external semantic interoperability becomes important. We still need to define the exploration vocabulary. |
| SQLite with generated text | Strong alternative if transactionally coordinating application-owned edits matters more than direct file editing. Generated files must report their source revision. |
| Event-sourced JSONL | Potentially useful for replay and historical views, but introduces event design and migration obligations; a log alone does not guarantee safe recovery. |

Sources for these distinctions: [JSON Schema](https://json-schema.org/draft/2020-12), [JSON Canvas](https://jsoncanvas.org/spec/1.0/), [JSON-LD](https://www.w3.org/TR/json-ld11/), [PROV-O](https://www.w3.org/TR/prov-o/), [SQLite application format](https://www.sqlite.org/appfileformat.html), and [event sourcing](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing).

## What the map knows

The proposed model records:

- The user's original idea, subsequent answers, and current constraints.
- Questions, alternatives, claims, findings and decisions as distinguishable records.
- Suggested branches and their explicit user activations.
- Relationships such as `depends_on`, `supports`, `contradicts`, `answers`, and `supersedes`.
- Evidence attached to specific claims, with source references and retrieval dates.
- Who proposed or accepted a decision, the reason, and the alternatives considered.
- Pending work, interrupted investigations, and the revisions used by each research attempt.

Node kinds and names are proposed vocabulary, not yet approved schema. A graph can present a tree-like overview while retaining cross-links. A completed investigation is distinct from an accepted decision; a source reference is distinct from proof.

## Concrete saved-map proposal

Illustrative names, subject to the file-editing decision:

```text
ideas/<map-id>/
  README.md           # generated entry point, current map revision, links
  manifest.json       # format version and authoritative revision inventory
  graph.json          # node metadata, summaries, relationships, workflow
  nodes/<id>.md       # detailed questions, answers, findings, reasons
  sources/<id>.json   # citation metadata and locations
  view.json           # layout and presentation only
  FORMAT.md           # reading procedure and field meanings
```

In this candidate, each fact has one owner. The graph owns metadata and relations; node Markdown owns detailed prose; source records own citation metadata. The overview is generated. Layout changes do not redefine a decision. Provider session hints live separately and are not required to read or reconstruct the map.

The split creates a consistency problem that must be solved, not ignored. During application use, one coordinator should validate writes against expected revisions and publish a recoverable map revision. Parallel agents submit results to it. Direct external edits require an explicit import/reconciliation flow, or a different file-authoring design. A prototype must prove interrupted publication and concurrent-result recovery before this becomes the final storage choice. SQLite with generated views remains a candidate if that better fits the user's editing expectations.

## How another agent uses it

1. Follow a skill or repository pointer to the map overview.
2. Read the current objective, constraints, accepted choices, unresolved questions, and branch index.
3. Open the relevant node and follow semantic links to its dependencies, evidence and contradictions.
4. Check the revisions and current status before applying an older conclusion.
5. Continue questioning or research using the saved context, even in a different agent environment.

This is the same data used by the visual workspace while exploration is in progress. It does not depend on a special handoff step. Progressive retrieval is supported by [Agent Skills' loading model](https://agentskills.io/specification) and [Anthropic's context-engineering guidance](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents); applying it to this map is our design inference.

## Example user experience

The user describes an offline-capable app. The agent proposes branches for conflict resolution, storage, and synchronization. The user activates conflict resolution. That branch gathers evidence, asks about conflicting edits, and proposes two further directions. Those directions appear on the map but do not execute automatically.

The user closes the workspace. Later they reopen the map with another agent. The same answer, findings, source links, and unactivated branches are present. If the user now changes a key constraint, affected conclusions are flagged for review with links explaining the dependency. Earlier reasoning remains accessible rather than being silently rewritten.

Suggested visual treatment: distinguish suggested branches, active exploration, questions awaiting an answer, and established knowledge; use a detail panel for evidence and conversation so the canvas remains readable. The visual design itself still needs a user-reviewed prototype.

## Supporting the three agent environments

Skill packaging can share a common source, but full runtime support needs adapters. The saved format should not depend on any of them.

| Environment | Documented route worth prototyping | Important boundary |
| --- | --- | --- |
| Codex | App Server or SDK controlled by the local service | Does not establish automatic attachment to the invoking desktop task. |
| Claude Code | Existing-session integration where available, or Agent SDK | Channels are preview with installation/policy conditions; embedded SDK authentication must follow its documented requirements. |
| GitHub Copilot | Copilot SDK backed by CLI | Local runtime is separate from an existing VS Code conversation; cloud execution is a different environment. |

Sources: [Codex App Server](https://developers.openai.com/codex/app-server), [Claude Channels](https://code.claude.com/docs/en/channels), [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview), and [Copilot SDK](https://github.com/github/copilot-sdk).

A skill can teach the workflow and launch supporting software. It does not itself guarantee a persistent event bridge between a browser and every agent's chat. Test the concrete integration before claiming that a UI click starts research on each host.

## Next decisions

1. **Execution ownership:** should research stay in the invoking agent session, or may the local application manage separate provider workers? This affects setup, credentials, billing, and what must stay running.
2. **Editing expectations:** are ordinary agents expected to read the saved files and submit changes through the tool, or directly edit them with a text editor? This determines the storage authority and conflict model.
3. **Activation scope:** what can one selected branch do before further input is required? New branch activation remains exclusively a user action either way.

Recommended next proof: one real end-to-end branch, a saved question/answer, a browser/server restart, a changed premise, and a fresh agent reading the result. A polished but simulated graph alone would not verify the core product.

## What this research verified

Verified against primary documentation: format capabilities, skill discovery conventions, available provider interfaces, and relevant integration constraints. Saved the requirements, glossary, research, and a local Wayfinder map.

Not verified: runtime compatibility, account entitlement, installation behavior, crash recovery, model comprehension, or the final visual design. Those require the prototype and provider-specific checks described in the reports.
