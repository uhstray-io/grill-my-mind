# Reading and resuming a persistent idea map

Research date: 2026-09-22 (America/New_York). Status: research and design proposal, not an implemented or approved architecture.

## Conclusion

Persist the meaning and state of the exploration independently of its chat history. Give agents a short entry point, linked node-level detail, explicit relationships, and source provenance. A fresh agent should be able to continue a map without access to the originating vendor session. Provider session continuation can improve continuity, but must remain optional.

No source establishes a universally best representation for every agent. The recommendations below need evaluation against actual Codex, Claude Code, and Copilot workflows.

## Evidence from primary sources

| Source | Documented finding | Implication for Grill My Mind |
| --- | --- | --- |
| [Anthropic: context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | Describes on-demand context retrieval and persistent structured notes for work across context windows. | Store navigable references and durable knowledge outside the conversation; avoid loading the whole map by default. |
| [Agent Skills specification](https://agentskills.io/specification) | Separates skill metadata, instructions, and resources loaded as needed. | Apply similar staged loading to map content. The skill teaches the reading procedure; its existence does not make arbitrary map files automatically discoverable. |
| [Anthropic: tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) | Recommends meaningful responses, bounded output, and evaluating response formats; it does not identify one best format for all tasks. | Offer concise summaries and detailed records; measure whether an agent finds the right evidence instead of assuming JSON alone guarantees comprehension. |
| [MCP memory reference server](https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md) | Implements entities, directed relations, observations, and search/open operations using local JSONL persistence. | Demonstrates a practical graph-memory interface. Its documented core model does not define Grill My Mind's branch approvals, decision history, or research-run lifecycle. |
| [Anthropic: long-running harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) | Describes failures across fresh sessions and uses explicit progress artifacts to orient subsequent sessions. | Record pending questions and interrupted work explicitly. This repo's manual-only Git policy takes precedence over the article's example commit workflow. |
| [LongMemEval: authors' repository](https://github.com/xiaowu0162/LongMemEval/blob/main/README.md) | Evaluates retrieval and reasoning across sessions, time, updated knowledge, and unanswerable questions. | Test corrections, superseded decisions, and unknowns, not just whether a map file can be reopened. These are useful evaluation categories, not proof of performance for this product. |
| [SQLite isolation](https://www.sqlite.org/isolation.html) and [atomic commit](https://www.sqlite.org/atomiccommit.html) | SQLite serializes writers and provides transactional atomicity; journal mode affects implementation details. | A transactional store is a credible option for coordinating concurrent research results. Plain JSON/Markdown need their own validated publication and recovery protocol. |
| [MCP resources, version 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/resources) | Defines resource access and capability-dependent change notifications. | MCP can be an access adapter, not the saved-map format or an assumption that a model starts working whenever a file changes. |

The [2026-07-28 MCP release](https://blog.modelcontextprotocol.io/posts/2026-07-28/) changes lifecycle and request mechanics. Implementations must target versions supported by their actual hosts rather than copy an older protocol example uncritically.

## Proposed reading contract

This section is a product-specific recommendation inferred from the evidence above.

1. **Discover maps.** An installed skill or an explicitly configured repository pointer identifies the map directory. Do not require agents to guess a hidden filename. Multiple maps have stable identities and readable titles.
2. **Read the overview.** Include the original objective, current user constraints, accepted decisions, active work, unanswered questions, suggested directions, and links into the map. Distinguish empty/unexplored areas from areas examined and ruled out.
3. **Retrieve relevant detail.** Load the selected branch, its parent context, dependencies, contradictory findings, applicable decisions, and linked evidence. Use explicit relations as well as text search; the visually nearest node is not necessarily the most relevant one.
4. **Check revisions.** A summary names the canonical revision it describes. If it is stale or absent, read authoritative records or regenerate the summary before relying on it.
5. **Continue from saved state.** Rehydrate unanswered questions and user-approved work. Show interrupted runs rather than silently claiming they finished or launching duplicate work.

Suggested adapter operations are `list_maps`, `read_overview`, `search_map`, `read_node`, and `read_branch_context`. These are proposed product operations, not existing commands. File reads provide the baseline; CLI or MCP tools can expose the same semantics when available.

## Preserve four different kinds of state

| State | Examples | Required to understand the idea? |
| --- | --- | --- |
| Knowledge | Questions, claims, decisions, constraints, sources, reasons, relationships, revisions | Yes |
| Exploration | Suggested branches, activations, pending answers, completed/failed/interrupted runs | Yes, for continuing work |
| Presentation | Node positions, collapsed groups, current selection, viewport | No; needed to restore the visual workspace |
| Provider continuity | Vendor session identifiers, worker identifiers, transient output streams | No; useful when that environment remains available |

Store visible user answers and useful research artifacts. Do not make an exhaustive chat transcript or private model reasoning the authoritative explanation. Concise decision reasons and source-backed findings must survive independently.

## Distinguish authorization from truth

These are separate questions that must not collapse into one `status` field:

- What kind of record is this: question, claim, evidence, constraint, alternative, decision?
- What is its review state: proposed, accepted, disputed, superseded?
- Was exploration authorized by the user?
- What happened to the work: queued, running, awaiting input, completed, interrupted, failed, cancelled?

Activating a research branch permits exploring it. It does not accept the research result as true, choose an architecture, or authorize every suggested descendant. Additional branches remain suggestions until activated. The exact scope of work inside one activation is still a product decision.

For evidence, record a stable source reference, URL or repository path, relevant locator, retrieval time, and which claim it supports or challenges. A citation records provenance; it does not automatically make the linked claim correct. User preferences should be attributed to the user rather than dressed up as externally verified facts.

## Corrections and stale findings

Consider a map for a synchronization feature:

1. The user initially requires online-only operation.
2. Research concludes a server-only design meets that constraint.
3. The user changes the requirement to offline operation.

Do not silently overwrite history or present the old conclusion as current. Preserve the old statement, link its replacement, and mark conclusions depending on it as needing review. This does not mean automatically rerunning all dependent branches; the UI should explain why review is suggested and let the user activate it.

Recommended version rules:

- Stable node and relation IDs survive retitling and layout changes.
- A map revision identifies a consistent saved state.
- A research run records which node and map revisions it used.
- Results based on changed prerequisites are retained as stale results for review rather than silently overwriting newer content.
- Relationships distinguish organization from meaning: `contains`, `depends_on`, `supports`, `contradicts`, `answers`, and `supersedes` are different.
- Dependencies used for scheduling need cycle checks. The whole knowledge graph need not be a tree or an acyclic graph.

## Resumption and failure handling

Recommended behavior, requiring a prototype:

- Reopening a map first loads durable knowledge, questions, and presentation state; it does not require any provider connection.
- A fresh agent can attach to the map and read its overview, relevant branch, and change history.
- A provider resume token may be used if valid, but its absence does not lose the map's meaning.
- On restart, reconcile persisted running jobs with actual worker state. Treat abandoned workers as interrupted; do not automatically equate a disconnected browser with a dead worker.
- Record a stable activation/request ID. Double-clicks or retried delivery must not enqueue duplicate exploration.
- Keep partial findings separate from a completed result and label them accordingly.
- Publish results with expected-revision checks through a coordinator. Agents should not concurrently rewrite the same authoritative files.
- The UI reports a save as durable only after the authoritative store acknowledges it. Generated Markdown or indexes can be rebuilt afterward and carry the source revision.

A JSONL history file by itself does not establish crash safety, ordering across processes, or exactly-once execution. A file-based implementation needs an explicit single-writer and recovery protocol; a SQLite implementation needs a transaction boundary and a reproducible readable projection. Choose one authority. Do not create mutually writable database, JSON, and Markdown copies of the same facts.

## Evaluation before choosing a storage implementation

These checks should be implemented when the runtime exists; none has been executed yet.

| Scenario | Expected result |
| --- | --- |
| Fresh agent, no chat transcript | Explains objective, accepted constraints, unresolved questions, and supporting sources correctly. |
| Switch agent environments | The next agent continues from durable records without needing the first vendor's session ID. |
| Correct an earlier requirement | Current answers use the correction; affected older results are identifiable as stale. |
| Contradictory research | Both claims and their evidence remain visible; the overview does not invent a resolution. |
| Unanswerable question | Agent identifies the gap instead of inferring an accepted decision. |
| Suggest new descendants | No work starts on those descendants without activation. |
| Duplicate activation or retried result | One logical activation is tracked; results are not duplicated. |
| Crash during save | Last acknowledged consistent state is recoverable; incomplete publication is detected. |
| Two concurrent research completions | Both results survive; conflicts become explicit instead of last-write-wins loss. |
| Agent result arrives after a user edit | Result's original input revision is retained; newer content is not overwritten. |
| Hundreds of nodes | Agent can retrieve a relevant subset with bounded context and follow dependencies. |
| UI layout changes | Semantic knowledge and decision history remain unchanged. |

Start with deterministic navigation and ordinary text search. Add embeddings or a specialized graph database only if measured retrieval failures justify them; they are not prerequisites for an agent-readable map.

## Decisions still needed

1. Should users and external agents edit canonical files directly, or should mutations go through the application/CLI?
2. Is multi-user Git merging a first-version requirement, or is this initially a single-user map with concurrent workers?
3. What work, cost, and continuation behavior does one branch activation authorize?

The research answers how a persistent map can remain useful. These preference-dependent questions determine the exact persistence and execution design.
