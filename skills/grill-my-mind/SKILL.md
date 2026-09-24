---
name: grill-my-mind
description: Explore a complex idea through a persistent localhost mind map, focused questions, and research branches the user chooses. Use to start or resume a visual idea exploration, especially for domains, architecture, and product thinking.
---

# Grill My Mind

Help the user understand an idea by questioning assumptions, investigating selected directions, and saving what is learned. The browser is the primary exploration interface. The repository map stays readable and resumable across agent environments.

## Start or resume

Requires Node.js 20+ and an agent capable of running shell commands. Locate this skill's actual directory; commands below are relative to it. Use the user's working repository as `--workspace`, not the installation directory.

1. Run `node scripts/cli.mjs status --workspace <repo>` to check for an existing app. On a first run it reports that the server must be started.
2. If absent, launch `node scripts/server.mjs --workspace <repo>` in a persistent background terminal using the host's supported process tools. On Windows, a `Start-Process` launch must use a hidden window. Keep process ownership available. If the default port is occupied by another application, use `--port 0` to allocate a free port; use the URL the server actually returns.
3. Open the returned loopback URL. The user can start a map, reopen one, answer questions, or activate branches there. If their initial message already contains an idea, create it with the bridge's `create` command instead of asking them to repeat it.
4. Explain once: the app saves maps, but research requires this agent session to remain active. Browser clicks alone cannot wake an agent after its turn ends. Do not imply otherwise.

## Serve the work queue

Read [the bridge reference](references/bridge.md) for command and result shapes. Use the invoking agent's existing tools and authentication. Do not start a separate provider SDK, obtain credentials, or assume that another subscription is available.

- Call `node scripts/cli.mjs next --wait 25 --worker <host-name> --workspace <repo>`. It returns one user-activated job and a compact context packet, or a short idle response. Add `--map <id>` if the user selected a specific map for this session.
- Work only on that branch. Ask questions that unblock it; research factual uncertainty using available primary sources. Distinguish findings, inference, user preferences, and unresolved questions.
- When the host supports subagents and the user permits their use, a bounded investigation can be delegated with only its packet. Otherwise investigate in the current agent. Never invent a subagent capability or require one for basic use.
- Save a result JSON file under the workspace's `.grill-my-mind/results/`, then deliver it with the `result` command. The UI will show the findings, questions, and suggested children.
- A question pauses that branch. Its answer is saved in the browser and queues continuation after all pending questions are answered. Newly suggested directions never activate automatically.
- A result without questions completes the branch. Never reactivate a completed branch or replace its findings. Suggest a new child direction for further work. If a completed premise changes, `fork-revision` creates an inactive child and flags affected findings for review while preserving the earlier content; the user must activate the child separately.
- If the job cannot be completed, record the reason with `fail`. Respect the user's security-stop and permission rules. Do not turn a block into repeated retries.

While the user is actively exploring, continue bounded `next` waits and process returned jobs. Avoid narrating idle responses or re-reading the whole map. If there is no work for approximately two minutes, finish with the workspace URL and tell the user to ask you to resume when ready. User instructions to keep listening or stop take precedence. The UI reports that the agent is away after polling stops. Do not create an automation to maintain the bridge unless asked.

## Keep context small

The packet contains the selected node, relevant ancestor/relationship summaries, recent answers with question IDs, and file pointers. Prefer `read --map ID --node ID --section questions --query "constraint"` or `--question ID` when an older answer is needed. Other sections are `summary`, `premise`, `findings`, `sources`, and `relationships`. Read only the relevant section. Do not load the entire `map.json`, all transcripts, or the planning/research documents of this repository merely to run a session.

Packets target fewer than 16,000 characters; this is a retrieval limit, not a guarantee about total model context or token cost. Section reads return bounded excerpts with `nextOffset` and `revision`; pass both with the same section/query to continue only when necessary. If the revision changed, restart the targeted read. The default node read is a summary, not a full document. Linked Markdown remains a fallback; locate and read a relevant section instead of loading a long file wholesale.

Every investigation records packet size. `usage --map ID` reports recorded CLI stdout characters/bytes, including targeted reads. This excludes direct file reads, research tools, browser observations, model replies, and host compaction. It is not vendor token usage or a measurement of the active context window. Record those gaps when evaluating a long real session; never substitute account-wide usage limits for per-session measurements.

## Persist meaning

Use CLI/application mutations. Do not edit canonical snapshots or generated views directly. Activating a branch authorizes an investigation, not accepting its conclusion. Cite which claim a source supports; leave uncertainty explicit. Retain decision reasons and relevant evidence, not hidden model reasoning.

Read [the map format](references/format.md) when you need storage semantics or to help another agent consume saved maps. Codex, Claude Code, and Copilot use the same command bridge when their local shell/process capabilities permit it. Skill discovery differs; do not claim a host has been tested merely because the files are portable.
