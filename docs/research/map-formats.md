# Persistent map formats for Grill My Mind

Research date: 2026-09-22. Status: research and design options, not an approved architecture.

## Findings

The user's requirement is a continuing exploration workspace whose saved knowledge can be read by a different agent at any time. It does not require a completion ceremony or a separate handoff document. The distinction to preserve is **knowledge state versus conversation/runtime state versus visual layout**. This is a design inference from the requested behavior, not a claim that an existing standard implements the product.

No inspected format provides all of Grill My Mind's semantics. The strongest candidates combine a documented graph vocabulary with readable text. JSON Canvas is useful for visual interchange; JSON-LD and PROV provide semantic identifiers and provenance; SQLite provides transactional persistence; an event stream provides history. These solve different problems and are not mutually exclusive.

The research supports prototyping a versioned JSON-and-Markdown bundle and comparing it with SQLite plus continuously generated text views. The deciding product question is whether humans and generic agents should **edit** the saved files directly, or primarily read them and submit changes through the running application.

## What existing formats actually standardize

| Candidate | What it gives us | What we still define | Best role to evaluate |
| --- | --- | --- | --- |
| JSON plus Markdown | Structured records plus readable prose; JSON Schema validation | All graph vocabulary, authority rules, revisions and workflow | Portable repository-native primary bundle |
| JSON Canvas 1.0 | Spatial nodes, visual connections, Markdown text and file references | Evidence, hypotheses, decisions, branch activation and job lifecycle | Interchange/export and possibly a visual projection |
| JSON-LD 1.1 with PROV-O | Globally identified graph terms and a provenance vocabulary | Exploration-specific ontology, UI, storage transactions | Optional semantic interchange or a carefully scoped core |
| SQLite | Queryable database file and transactions | Knowledge model, agent reading interface and text projections | Local runtime persistence, potentially canonical |
| JSONL event stream | Records that can be processed one at a time | Event vocabulary, ordering, replay, migrations and conflict resolution | History/audit trail, or canonical storage only with deliberate event sourcing |

### JSON plus Markdown

JSON Schema provides a published vocabulary for describing and validating JSON structure. It does not supply a mind-map vocabulary or by itself check every application-level invariant, such as whether an edge target exists in a separate file. [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12)

Design inference: JSON can hold stable IDs, typed relationships, workflow records and concise summaries; Markdown can hold readable reasoning and evidence. A plain-text reader then needs only a short format guide and entry point. This is syntactic portability, not a guarantee that every agent will discover the files automatically or infer the intended meaning of custom fields.

Avoid two independently editable copies of the same facts. Two workable variants are:

- Canonical JSON records with Markdown bodies referenced by path; a generated Markdown index summarizes them.
- Canonical Markdown node documents with defined metadata, plus a generated JSON graph index.

The first is easier to validate strictly; the second favors direct authoring. Either requires an explicit authority rule and stale-projection detection. A single giant JSON document is simpler initially but causes larger reads and broader edit conflicts as the map grows. One file per node makes selective reads easier but introduces multi-file consistency work. These are engineering tradeoffs, not prescribed standards.

### JSON Canvas

Version 1.0 defines text, file, link and group nodes, each with an ID and pixel geometry. Text supports Markdown; file nodes can refer to a heading or block. Edges connect IDs and carry optional labels, arrows and colors. Array order establishes node stacking. It does not define research confidence, accepted decisions or execution state. [JSON Canvas specification](https://jsoncanvas.org/spec/1.0/)

Design inference: use it to expose maps to other canvas tools, with labels and linked Markdown preserving a readable approximation of domain meaning. Do not claim lossless semantic round-tripping merely because a tool reads `.canvas`. An importer may understand the drawing while knowing nothing about our custom metadata. Keep semantic records authoritative until actual import/edit/export tests establish what survives. Separating layout also avoids turning a node drag into a substantive knowledge revision.

### JSON-LD, RDF and provenance

JSON-LD 1.1 is a W3C Recommendation using JSON syntax. Contexts map terms to IRIs; identifiers connect objects across documents; graphs and named graphs are supported. JSON-LD arrays are generally unordered unless modeled as lists. This means an event sequence cannot rely on ordinary array order after linked-data transformations. [JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)

PROV-O distinguishes entities, activities and responsible agents, with relationships for derivation, attribution, primary sources and revisions. It explicitly allows using only part of its vocabulary. A research run can therefore be an activity, a finding an entity, and its author a software agent. The standard also demonstrates successive document revisions. [PROV-O](https://www.w3.org/TR/prov-o/)

Design inference: borrow this separation even if v1 uses plain JSON. Record which run produced a finding and which sources informed it. A provenance trail establishes origin, not truth. Neither JSON-LD nor PROV alone expresses our meaning of `hypothesis`, `contradicts`, `user-selected`, or `needs-review`; that vocabulary remains ours. A bespoke ontology is justified only if semantic interchange with external knowledge systems is a real use case.

The similarly named PROV-JSONLD document is a W3C **Member Submission**, not a W3C Recommendation; avoid presenting it as having the same standards status as JSON-LD 1.1 or PROV-O. [PROV-JSONLD submission](https://www.w3.org/submissions/prov-jsonld/)

### SQLite

SQLite's maintainers explicitly describe using a database as an application file format. It supports structured querying and updates without rewriting an application-specific flat document. [SQLite application file format](https://www.sqlite.org/appfileformat.html)

Transactions isolate committed changes. SQLite permits one writer at a time, and WAL allows readers to continue reading a snapshot while a writer works. These guarantees are useful when several research jobs complete close together. [SQLite isolation](https://www.sqlite.org/isolation.html)

Design inference: SQLite is attractive for the local application, particularly job coordination and crash recovery. As the only saved representation, it makes casual repository inspection less convenient: agents need a database reader or application command, and ordinary text diffs cannot show the semantic change directly. A continuously regenerated Markdown/JSON view addresses reading, but creates a projection-freshness problem. If SQLite is canonical, document that clearly and include revision identifiers in exports. Do not maintain an independently writable database and file bundle with vague reconciliation rules.

### Event streams and JSONL

JSON Lines specifies UTF-8 and one valid JSON value per line. It does not provide event ordering, atomic concurrent appends, replay rules or recovery semantics. [JSON Lines](https://jsonlines.org/)

Event sourcing treats the event stream as authoritative and rebuilds state from it; snapshots reduce replay cost but do not replace the authoritative history. Microsoft's architectural guidance also calls out concurrency conflicts, event design and the complexity of evolving event schemas. [Event sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)

Design inference: a small audit log may be enough without adopting full event sourcing. Useful records include a branch being suggested, a user activating it, a run starting, evidence arriving, and a decision being revised. Never use the transcript itself as the only reconstruction mechanism. If the snapshot is authoritative, say that the log is supplemental; if the log is authoritative, implement versioned deterministic replay and crash recovery. The suffix `.jsonl` does not decide this.

## Primary implementation examples

The MCP reference memory server demonstrates a deliberately small persistent knowledge graph: typed entities, directed typed relations and atomic textual observations, with search and targeted node retrieval. This is a useful example of selective access, not a complete exploration model or a universal knowledge-file standard. Its string observations lack the richer claim/evidence/workflow distinctions needed here. [Memory server README](https://github.com/modelcontextprotocol/servers/blob/main/src/memory/README.md)

Its implementation serializes graph mutations through a queue and writes a temporary file before replacement. This is concrete evidence that even a small file-backed graph needs write coordination; concurrent read-modify-write operations are not safe by default. The implementation's POSIX rename commentary should not be treated as verification of Windows durability. [Memory server source](https://github.com/modelcontextprotocol/servers/blob/main/src/memory/index.ts)

The Agent Skills specification uses progressive disclosure: brief metadata, instructions when activated, and detailed resources on demand. It recommends focused reference files. Applying that pattern to saved knowledge is an inference: give another agent an index, then summaries, then specific evidence only when needed. The skills standard does not define the session-data format. [Agent Skills specification](https://agentskills.io/specification)

## Proposed semantic requirements to test

These are research-derived design proposals, not an approved schema.

1. **Stable identity:** renaming or moving a node must not break links. Use IDs independent of titles. Track schema version separately from map revision.
2. **Graph semantics:** retain a navigable primary parent when useful, but allow cross-links for dependencies, alternatives, support, contradiction and related concepts. Cycles can be meaningful; the visual tech tree need not dictate the entire graph model.
3. **Separate epistemic state from job state:** `research-complete` must not mean `true` or `accepted`. A finished investigation may conclude that a hypothesis is unverified or disputed.
4. **Separate suggestions from authorization:** a suggested branch is saved without starting work. Activation records the user action, intended scope and input revision. Agent-produced subbranches remain suggestions until activated.
5. **Represent decisions explicitly:** capture who accepted a choice, the rationale, considered alternatives and relevant constraints. A source-backed claim and a user preference are different kinds of information.
6. **Attach evidence to claims:** record source URL or repository path, location, retrieval time and the narrow proposition supported. A bibliography at the end of a node is insufficient when claims disagree.
7. **Preserve useful history:** corrections should supersede earlier assertions rather than silently erasing their rationale. Full hidden model reasoning is unnecessary; preserve observable questions, user answers, concise justifications, sources and outputs.
8. **Bound context:** each node needs a short summary and links to details. Mark generated summaries with their source revision so outdated summaries can be detected.

For precise source locations, Web Annotation provides body/target relationships and selectors, including an exact text quotation with surrounding prefix/suffix. Its guidance also notes that raw text offsets are brittle as sources change. Borrowing a small selector shape can improve citation durability without requiring the entire annotation model. [Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)

## Candidate file bundle for a prototype

This illustrates one option for evaluation; it does not select storage or commit the application to these names.

```text
ideas/<session-id>/
  README.md                 # current index, purpose, key decisions, open questions
  manifest.json             # schema version, map revision, roots, file inventory
  graph.json                # typed nodes/edges and concise summaries
  nodes/<node-id>.md         # reasoning, questions, answers and evidence references
  sources/<source-id>.json   # source metadata and precise locations
  activity.jsonl            # optional visible history with documented authority
  view.json                 # layout, collapsed nodes and viewport
  FORMAT.md                 # field meanings and reading/update rules
```

For this text-first candidate, authority would be explicit: `graph.json` owns node metadata, relationships and summaries; each referenced node Markdown file owns only its detailed body, without duplicated editable status or relationship metadata. Together they form one logical canonical content bundle. `README.md` is generated, `view.json` owns presentation only, and any Canvas export or database index is a derived artifact. A coordinator is the sole writer while the app is active, accepts mutations against an expected revision, and publishes a recoverable revision of the whole bundle. Generic agents read these files and submit structured changes through that coordinator; direct editing while it is running would not be supported without an explicit import/reconciliation operation. This design still needs a proven multi-file publication strategy: replacing one file atomically does not make the whole bundle transactional.

An agent's reading path would be: session index → relevant node summaries → selected node documents → underlying evidence. The same files remain useful while the session is unfinished. A final summary can be an optional view; it should not become a prerequisite for understanding or continuing the map.

Store durable pending questions, suggestions and job outcomes; do not make portability depend on vendor-specific conversation IDs. Such IDs can be optional resume hints. Resuming saved knowledge and resuming an interrupted provider process are separate capabilities.

## Resume and persistence checks before choosing an architecture

- Reopen after the browser and server have closed: graph, pending questions, proposed branches and layout remain available.
- Restart during an active investigation: the run becomes recoverable or interrupted, never silently successful. Avoid launching duplicate work just because the UI reconnects.
- Complete two independent runs together: neither result is lost, duplicated or applied to the wrong revision.
- Edit an upstream premise during research: retain the result with its original input revision and flag the need for review.
- Rename nodes and add cross-links: all references still resolve.
- Read without the localhost app: another agent can locate the index and understand decision status, evidence and unresolved questions.
- Copy the session to a different host: knowledge remains readable without an account-specific thread identifier.
- Migrate schema: preserve the original data and verify the upgraded graph; include a clear unsupported-version error.
- Export and re-import a `.canvas` file: report what semantics were preserved and what were intentionally omitted.

The highest-value early experiment is one small realistic session exercised through restart, parallel-result and foreign-agent-read scenarios. Visual polish and semantic portability should both be demonstrated on that session before expanding the schema.
