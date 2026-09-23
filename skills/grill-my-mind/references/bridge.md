# Local agent bridge

All commands accept `--workspace <absolute repository path>`. Resolve scripts from the skill directory, including when installed in another project. Requires Node 20+. The server binds only `127.0.0.1`; credentials for model providers are neither requested nor stored.

```text
node scripts/server.mjs --workspace <repo> [--port 4317]
node scripts/cli.mjs status --workspace <repo>
node scripts/cli.mjs create --file <idea.json> --workspace <repo>
node scripts/cli.mjs next --wait 25 --worker codex --workspace <repo>
node scripts/cli.mjs result --job <job-id> --file <result.json> --workspace <repo>
node scripts/cli.mjs fail --job <job-id> --reason "What prevented completion" --workspace <repo>
node scripts/cli.mjs read --map <map-id> [--node <node-id>] --workspace <repo>
node scripts/cli.mjs act --map <map-id> --file <action.json> --workspace <repo>
```

Use JSON files for multiline text. Do not interpolate user content into a shell command. Keep claim files in `.grill-my-mind/claims`; the CLI saves and uses claim keys automatically. Never send runtime tokens to the user or include them in prompts. A `result` delivery retry is idempotent after success.

To create a map, the input file is `{ "title": "Short name", "idea": "The user's idea in their own terms" }`. Creating it queues an initial exploration because the user asked to explore that idea. Other branches only queue after user activation.

## Result format

```json
{
  "summary": "A concise account of this branch's current understanding.",
  "body": "Detailed findings, reasons, alternatives, and uncertainties in readable Markdown.",
  "questions": ["One question that genuinely needs the user's answer"],
  "suggestions": [
    {"title": "A direction worth exploring", "body": "Why it matters and what we would investigate", "kind": "research"}
  ],
  "sources": [
    {"title": "Source title", "url": "https://example.org/source", "note": "The specific claim this source supports or challenges"}
  ],
  "links": [
    {"to": "an-existing-node-id", "type": "depends_on"}
  ]
}
```

`summary` and `body` are required. Omit unused arrays. The example URL and ID are illustrative; real results require actual consulted sources and existing node IDs. Do not cite a source you have not read.

Limits: summary 800 characters; body 24,000; at most 5 questions, 8 suggestions, 20 sources, 12 links. Suggestion kinds: `research`, `question`, `decision`, `risk`, `idea`. Link types: `depends_on`, `supports`, `contradicts`, `related_to`. `contains` is created by the server for suggested children. All results remain unreviewed until the user accepts them.

## Mutations

An action carries `expectedRevision`, `nodeId`, and `type`. Use the current revision returned by `read`. On a conflict, re-read before deciding whether the action still applies; do not blindly overwrite.

- `activate`: queue a suggested/retry/further investigation. Only on the user's explicit request, normally via the UI.
- `answer`: `questionId`, `answer`. Supply only an actual user answer.
- `suggest`: `title`, `body`. Adds an inactive research direction.
- `revise`: `body`. Records a changed premise and marks dependent findings for review.
- `accept`: user accepts a current finding. Never self-accept a model conclusion.
- `cancel`: stops queued work or rejects subsequent results from the claimed run. The agent should also stop its actual investigation; this API cannot kill host-owned subagents.
- `position`: `x`, `y`. Presentation only.

`read` without a node is bounded to 40 node summaries. Reading a selected node returns its detail. For very large detail, use the generated Markdown file and targeted reads. No additional provider connection is required to open a saved map.

## Process lifetime

The server lives independently of a worker's research result. The browser polls only for changed map revisions; this does not call an LLM. `next` waits at most 25 seconds and returns a small idle response. The user can keep the app open after the agent session ends, but new research stays queued until an agent starts listening again.

On server restart, running jobs become interrupted and require an explicit retry. A running server's stale host-owned job can be stopped/retried from the UI. There is no automatic timeout-based paid retry.

During this MVP, individual UI activations within the selected map are executed serially by the main agent unless the host agent deliberately delegates bounded investigations. Parallel-result persistence is supported; a pool of autonomous provider workers is not implemented.
