# Grill My Mind

A skill for exploring complex ideas through a persistent visual mind map, focused questions, and user-activated agent research.

Target environments: Codex, Claude Code, and GitHub Copilot. The first working trial uses the invoking Codex agent; Claude Code and Copilot live execution still need hands-on validation.

## Try the MVP

Requires Node.js 20 or later. No package installation or API key is needed for the local application.

```sh
node skills/grill-my-mind/scripts/server.mjs
```

Open the URL printed by the server, normally `http://127.0.0.1:4317`. Use **Maps** to create an exploration or open a saved session. Select a constellation node to read it; choose **Explore this branch** to queue research. Drag individual nodes to move them, drag the background to pan, and use the zoom controls to navigate. Positions save to the map and survive restarts. Focus a node and use **Alt + arrow keys** for keyboard movement. The **Dark mode** toggle switches between light and dark themes and remembers your preference.

Use [the Grill My Mind skill](skills/grill-my-mind/SKILL.md) in your coding agent and ask it to continue this workspace. The app shows when the agent is listening. **The browser does not run an LLM by itself:** research requires an active agent using the command bridge. If the agent has finished its turn, ask it to resume; queued work stays saved.

Maps open around the starting idea. Automatic placement keeps connected branches close, with an irregular layout; saved manual positions take precedence. Clicking a node centers it and frames its parent and children. **Nearby ideas** also lets you step between parent and child branches. Dragging moves the node without recentering the camera.

For larger maps, use **Find an idea** to search titles and bring a node into focus. Press Enter to select the first result, or Arrow Down and Tab to navigate results. **Focus selected idea** returns to the current node; **Fit map** shows the entire constellation. Navigation does not queue research.

Maps live in `ideas/<map-id>/map.json`, with generated Markdown overviews and node documents alongside them. The JSON snapshot is authoritative. Reads are open; edits go through the app or its commands. A map survives browser/server restarts and does not depend on the originating chat. No Git operation happens automatically.

Explored branches stay complete. Use **Add a direction** to grow a new branch. **Explore a changed premise** creates an inactive investigation and flags affected findings for review while preserving the original content. The new branch runs only after you choose to explore it. Questions and retries still continue unfinished work.

Agents can retrieve individual sections or old answers with `read --node ID --section questions --query "constraint"` (also pass `--map ID` and `--workspace PATH`). Reads are paged instead of loading full node histories. `usage --map ID` reports recorded CLI output sizes, not total conversation context or model tokens; see [the bridge reference](skills/grill-my-mind/references/bridge.md).

## Saved design prototypes

**Constellation/version 1 is now the live UI.** It renders real saved sessions and uses the existing agent bridge; there are no simulated research timers in the working app. Suggested nodes remain gray until activated. Queued, researching, unanswered, explored, accepted, and stale states remain distinct. Findings and available sources appear in the inspector.

[Two standalone HTML snapshots](prototypes/README.md) preserve the earlier Constellation study and original card map for comparison. Those files simulate research and reset on reload; their hashes are unchanged. Version 2 is no longer an active choice. Old `?variant=` links open the live workspace. [Issue 08](.scratch/grill-my-mind/issues/08-live-constellation.md) records integration and verification.

## Install in another project

The complete portable package is `skills/grill-my-mind/`. From this repository:

```sh
node skills/grill-my-mind/scripts/install.mjs --host codex --project /path/to/project
node skills/grill-my-mind/scripts/install.mjs --host claude --project /path/to/project
node skills/grill-my-mind/scripts/install.mjs --host copilot --project /path/to/project
```

Choose the host you use. These copy to `.agents/skills`, `.claude/skills`, or `.github/skills` respectively and refuse to overwrite an existing installation. Quote paths containing spaces. Reload the host's skill discovery if necessary. The host must support local shell commands and a persistent server process; a cloud agent's localhost is not your workstation.

The local `.grill-my-mind/` runtime directory contains connection information and claim files; keep it out of version control. Add `.grill-my-mind/` to the target project's ignore file when installing. Maps may contain private ideas and answers; choose deliberately whether to track/share `ideas/`.

## Check the build

```sh
node --test tests/*.test.mjs
```

Tests cover queue authorization, concurrent results, stale premises, cancellation, resumption, bounded context, HTTP/CLI operation, constellation layout and status presentation, saved coordinates, and packaging for all three discovery paths. Packaging tests do not establish live runtime compatibility with those hosts.

## Design and research

- [Product brief](docs/product-brief.md): confirmed requirements and open questions.
- [Research recommendation](docs/research/recommendation.md): proposed persistence, resumption, and integration design, with linked primary-source reports.
- [Domain vocabulary](CONTEXT.md): shared terms.
- [Wayfinder map](.scratch/grill-my-mind/map.md): research conclusions and open decision tickets.
- [MVP agreement](docs/mvp.md): accepted choices, implementation scope, and trial checks.
- [Verification](docs/verification.md): what was exercised and what remains to test.
