# Grill My Mind: agent integration research

Research date: 2026-09-22. Scope: Codex, Claude Code, GitHub Copilot, skill discovery, localhost UI activation, execution, persistence, authentication, and resumption. This is a research report, not an implemented or tested integration.

## Recommendation

Build one exploration format and local application, with a portable `grill-my-mind` skill and separate execution adapters. Treat **reading and resuming a map**, **launching its UI**, and **executing research from a UI click** as different compatibility promises. The first can work everywhere that can read repository files; the last depends on a supported agent runtime or event integration.

Keep the repository's map authoritative. Provider conversation IDs are optional acceleration, not the only way to resume. A different agent should reconstruct the working context from the map, selected branch, user answers, evidence, and unresolved questions without importing another vendor's transcript.

Do not choose a rollout order from this report: the user wants all three environments ultimately and has not settled the first implementation target.

## What was checked locally

The repository initially contained `README.md` and `.git`, with no project agent instruction files. The installed Codex CLI was located through `Get-Command`; `codex --help` confirmed `exec`, `app-server`, `resume`, and `queue` commands exist locally. Help returned a non-fatal warning, `Could not find home directory`, while attempting PATH aliases. No authentication, account secrets, or agent execution were inspected. No dependencies were installed or services launched.

Local help establishes available command names, not successful operation, API compatibility, account entitlement, or integration feasibility. Official documentation was then read for the missing details. Some `developers.openai.com/codex/...` pages redirect to first-party `learn.chatgpt.com` documentation; the original official URLs remain cited below.

## 1. Portable skill packaging is achievable

The Agent Skills standard specifies a directory containing `SKILL.md`, YAML metadata including `name` and `description`, and optional scripts, references, and assets. It recommends progressive loading rather than putting all reference material in the main instructions. Tool preapproval metadata is experimental and varies by implementation. **Design implication:** package the procedure, templates, and launcher together, but do not mistake the standard for an agent orchestration API. [Agent Skills specification](https://agentskills.io/specification)

| Environment | Documented project discovery | Consequence |
| --- | --- | --- |
| Codex | `.agents/skills` between the working directory and repository root; symlinked skill folders supported | Provide a Codex discovery entry here. |
| Claude Code | `.claude/skills/<name>/SKILL.md`; plugin skills have their own package conventions | Provide a Claude discovery entry or installable package. |
| Copilot CLI | `.github/skills`, `.agents/skills`, or `.claude/skills` | Can reuse a supported shared entry. |
| Copilot in VS Code | `.github/skills`, `.claude/skills`, or `.agents/skills` | Discovery is available, but execution bridge still needs implementation. |

Sources: [Codex skills](https://developers.openai.com/codex/skills), [Claude Code skills](https://code.claude.com/docs/en/skills), [Copilot CLI skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills), [VS Code Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills).

**Recommendation:** maintain one canonical skill source and generate/copy installation bundles to supported discovery paths. Avoid three manually diverging copies. A symlink-only distribution may complicate Windows installation; test it before promising it. Keep vendor-specific execution instructions in adapter references. Skill installation and map storage must be separate so upgrading the skill cannot overwrite a user's research.

## 2. Execution options by provider

### Codex

**Documented:** App Server exposes bidirectional JSON-RPC with thread creation/resumption, starting/steering/interrupting turns, streaming events, structured output, and approval requests. Stdio is supported; its WebSocket transport is explicitly experimental and unsupported. A client initializes the connection before making requests. Skill invocation can include an explicit skill input item. Generated protocol schemas are version-specific. [Codex App Server](https://developers.openai.com/codex/app-server)

The TypeScript SDK exposes `startThread`, `run`, and `resumeThread`. The Python SDK controls the local App Server and provides sandbox presets. [Codex SDK](https://developers.openai.com/codex/sdk)

Noninteractive CLI operation is also available through `codex exec`; it is appropriate to investigate for bounded research jobs. [Codex noninteractive mode](https://developers.openai.com/codex/noninteractive)

**Recommendation:** the local service owns a stdio App Server connection when rich streaming and user approvals are needed. A simpler SDK/job adapter may suffice first. Create application-owned research threads rather than assume that a skill can attach safely to the user's current desktop task. Keep process control behind the localhost service, not directly in browser JavaScript. Verify the installed protocol against generated schemas before implementation.

**Authentication fact:** local Codex supports ChatGPT sign-in and API-key sign-in; API-key usage is separately billed at standard API rates. OpenAI recommends API keys for programmatic CLI workflows. Account policies and feature availability differ by authentication mode. **Do not promise every user subscription covers every integration.** [Codex authentication](https://developers.openai.com/codex/auth)

### Claude Code

**Documented:** the Agent SDK provides the Claude Code loop and tools through Python/TypeScript. Anthropic states third-party developers may not offer claude.ai login or rate limits in their products without prior approval and points them to API-key authentication. This is a material constraint on an embedded application backend. [Claude Agent SDK overview](https://code.claude.com/docs/en/agent-sdk/overview)

`claude -p` supports noninteractive runs, JSON/streaming output, session continuation, and JSON Schema output. Bare mode skips much automatic configuration and does not use subscription login. A background shell spawned during `-p` is terminated roughly five seconds after the final result and stdin closure; background agents have separate wait behavior. Therefore a dev server launched by a short research turn is not a dependable persistent application host. [Claude programmatic usage](https://code.claude.com/docs/en/headless)

The SDK provides approval and question handling hooks suitable for connecting requests to an application UI. Skills also have SDK-specific loading configuration. [Claude SDK user input](https://code.claude.com/docs/en/agent-sdk/user-input), [Claude SDK skills](https://code.claude.com/docs/en/agent-sdk/skills)

**Important alternative:** Claude's research-preview Channels can push events into a currently running session. Its official `fakechat` example already demonstrates localhost browser messages and replies. The session must stay open and users must explicitly enable the channel. Organization policies and plugin allowlists apply. This is evidence that browser-to-existing-session interaction is possible through a specific integration, not evidence that any ordinary skill or MCP tool can do it. [Claude Channels](https://code.claude.com/docs/en/channels)

Custom channel implementations bridge local HTTP to stdio MCP notifications and can expose reply tools. Publicly distributing a plugin does not automatically put it on the approved channel list. The reference documents an explicit development-only opt-in and administrator approval paths. Those are not a reliable default installation experience for a portable released skill. No channel flags or permission overrides were run in this research. [Claude Channels reference](https://code.claude.com/docs/en/channels-reference)

**Recommendation:** distinguish two products/modes: a skill cooperating with the user's existing Claude Code session, and an application-owned SDK runtime authenticated through an allowed API mechanism. Investigate Channels as an optional host-session adapter when supported and approved; do not base the cross-provider core on a preview feature. Do not treat CLI wrapping as an automatic exemption from the SDK's published authentication restriction.

### GitHub Copilot

**Documented:** the Copilot SDK embeds the CLI agent engine and communicates with CLI server mode over JSON-RPC. It can manage CLI process lifetime or connect to an external server. Standard use requires Copilot entitlement and follows CLI usage billing; BYOK is separately supported. The official repository no longer labels the SDK a technical preview, so an old article calling it preview should not establish current maturity. [GitHub Copilot SDK repository](https://github.com/github/copilot-sdk)

The SDK supports session creation, resumption, listing, skills, custom agents, and MCP configuration; terminal-specific commands do not all have SDK equivalents. Consequently, do not infer SDK support from a CLI slash-command feature alone. [SDK/CLI compatibility](https://docs.github.com/en/copilot/how-tos/copilot-sdk/troubleshooting/compatibility)

**Recommendation:** implement a Copilot SDK adapter for click-to-run local research. That provides a runtime with explicit ownership; it does not establish that a browser can commandeer an already open VS Code Copilot conversation. The skill can be invoked in VS Code while the application delegates approved work through a separate local runtime, provided the UI explains this distinction.

Copilot cloud agent runs in an ephemeral GitHub Actions environment. It can research and plan, and its normal coding workflows include remote branches and repository changes. This is a different surface from local IDE/CLI agents. [Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent)

**Inference:** localhost inside that cloud environment is not the user's workstation localhost. Cloud compatibility should initially mean reading and extending the persisted map, not promising the same local interactive UI. A remote hosting/transport design would be a separate scope. Do not trigger the cloud agent's branch/commit behavior under this repository's current no-Git-write rules.

## 3. What MCP solves, and what it does not establish

MCP could expose operations such as reading a branch, claiming an activated job, proposing findings, and asking questions. It would give agents one map interface while keeping provider APIs outside the domain model.

The **2025-11-25** MCP sampling specification defines server-requested model generation, but clients must advertise sampling capability; tool-enabled sampling has an additional capability. The client controls access and approvals. The existence of this protocol does **not** prove that every target host supports it or that it starts a normal turn in the user's existing chat. [MCP 2025-11-25 sampling specification](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling)

The newer **2026-07-28** release replaces the protocol initialization/session model with a stateless core and introduces multi-round-trip requests for client input. It also deprecates Sampling, Roots, and Logging, preserving them for at least twelve months while advising new implementations not to adopt them. Therefore sampling is not the recommended foundation for this new application. Pin the transport/protocol version to what each host actually supports; do not transfer old initialization or notification assumptions into a new MCP implementation. Codex App Server's own initialization requirements above are its separate API contract. [MCP 2026-07-28 release](https://blog.modelcontextprotocol.io/posts/2026-07-28/)

**Recommendation:** make MCP optional interoperability, not a magical universal agent launcher. A supported event integration, a service-owned runtime, or an actively waiting agent must bridge UI activation to actual execution. A basic fallback can persist an activated queue and let the user explicitly tell their agent to process it. That fallback is usable but must not be presented as automatic click-to-run support.

## 4. Proposed execution contract

The following is a design recommendation, not a vendor API:

1. An agent proposes branch nodes with purpose, expected result, dependencies, and suggested questions. New branches remain `suggested`.
2. The user clicks **Explore**. The local service records that exact activation and its scope before starting a provider call.
3. The service creates an idempotent job linked to map ID, branch ID, activation ID, and input revision. Only activated jobs may be claimed.
4. An adapter receives a bounded context packet: root intent, branch lineage, relevant cross-links, settled answers, evidence, and unresolved questions. It returns events and a structured result.
5. Results can add findings, evidence, questions, and further *suggested* branches. They cannot silently activate those new branches.
6. One local writer validates results and updates graph state. Parallel workers submit changes rather than overwrite the same map file.
7. A user answer is persisted separately from agent inference, then explicitly resumes the waiting job or starts a new attempt.

Useful execution states: `queued`, `running`, `awaiting-user`, `succeeded`, `failed`, `cancelled`, `interrupted`. Keep these separate from whether an idea is accepted, uncertain, rejected, or superseded: research completion does not establish truth.

Minimum adapter operations: `probeCapabilities`, `start`, `stream`, `answer`, `cancel`, and optionally `resumeProviderSession`. Capability probing should cover structured results, questions, permission callbacks, web research, and resumption. Do not silently convert an unavailable capability into fabricated research.

## 5. Persistence and resumption boundaries

Recommendations:

- Store knowledge in the repository using provider-neutral IDs. Record source URLs, retrieval dates, claim status, human answers, alternatives, and supersession relationships.
- Persist runtime references separately: provider name, optional provider session ID, run attempt, input revision, and failure/retry status. These references may be machine-specific and are not required to understand the idea.
- A resumed map need not resume an old LLM conversation. Rebuild the relevant context from canonical state; optionally reconnect to the original conversation when available and appropriate.
- Keep local process IDs, ports, locks, account details, and credentials out of the shareable knowledge format. No browser should receive provider credentials.
- On restart, do not assume jobs previously marked running are still active or automatically rerun them. Reconcile known processes/session state; mark uncertain attempts interrupted and show the user their recoverable state.
- Treat the UI process, durable map, and research workers as separate lifetimes. Closing a research turn must not erase a map or implicitly claim the UI remains live.
- Keep a small agent-readable entry point and branch summaries so a fresh agent need not consume an entire transcript. The map is a living source of understanding rather than a one-time handoff export.

## 6. Tests needed before claiming compatibility

None of these have been executed; they define the integration spike:

| Check | Required observable result |
| --- | --- |
| Discovery | Each chosen host discovers the same named skill and can find bundled assets after installation. |
| Launch | A supported invocation starts one loopback service, reports its URL, and identifies its owning process. |
| Activation | One click creates one job; duplicate requests do not duplicate paid work. Suggested children do not run. |
| Research | A real provider returns a cited result to the correct node and the persisted representation matches the UI. |
| Questions | Worker asks a question; browser answer is saved and delivered to the correct run. |
| Permissions | A required approval is visible and actionable, not silently allowed or lost in a hidden terminal. |
| Recovery | Restart reopens the map, retains answers, and distinguishes unfinished from completed work. |
| Portability | Another provider reads the saved branch and continues without the original provider's conversation ID. |
| Lifetimes | Closing a worker, browser, or launching chat has documented effects; no invisible orphan processes. |
| Account limits | Missing entitlement, unavailable models, and usage exhaustion are presented accurately. |

The central unresolved product choice is whether users expect research to run **inside their invoking agent session** or in **application-managed provider sessions**. Both can consume the same durable map; their authentication, lifecycle, and installation requirements differ substantially. Clarify that choice before committing to an execution architecture.
