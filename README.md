# Grill My Mind

A skill for exploring complex ideas through a persistent visual mind map, focused questions, and user-activated agent research.

Target environments: Codex, Claude Code, and GitHub Copilot. The first working trial uses the invoking Codex agent; Claude Code and Copilot live execution still need hands-on validation.

## Try the MVP

Requires Node.js 20 or later. No package installation or API key is needed for the local application.

```sh
node skills/grill-my-mind/scripts/server.mjs
```

Open the URL printed by the server, normally `http://127.0.0.1:4317`. Create an exploration or open a saved map. Select a node to read it; choose **Explore** to queue research. Drag a card's header to move it, drag the background to pan, and use the zoom controls to navigate.

Use [the Grill My Mind skill](skills/grill-my-mind/SKILL.md) in your coding agent and ask it to continue this workspace. The app shows when the agent is listening. **The browser does not run an LLM by itself:** research requires an active agent using the command bridge. If the agent has finished its turn, ask it to resume; queued work stays saved.

Maps live in `ideas/<map-id>/map.json`, with generated Markdown overviews and node documents alongside them. The JSON snapshot is authoritative. Reads are open; edits go through the app or its commands. A map survives browser/server restarts and does not depend on the originating chat. No Git operation happens automatically.

## Try the skill tree prototypes

With the same server running, compare [Constellation](http://127.0.0.1:4317/?variant=constellation) and [Research paths](http://127.0.0.1:4317/?variant=paths). The bottom switcher (or left/right arrow keys outside text fields) changes the layout. Select a gray node, explore it, and answer a question to see it light up and reveal new suggestions. Pan the background and use the zoom controls for details.

These are disposable interaction studies with 79 illustrative nodes and simulated research. Changes stay in browser memory; they do not save to your map or start agents. Reload or **Reset preview** starts over. Both layouts share progress while switching. See [prototype notes](skills/grill-my-mind/assets/prototype-NOTES.md) for the design question and boundaries.

Use **Light mode** in the header, or open [the light constellation](http://127.0.0.1:4317/?variant=constellation&theme=light). Drag individual nodes to rearrange them; their connections follow and other nodes stay put. Each layout remembers its own arrangement during the preview. **Reset layout** restores just that arrangement. Keyboard users can focus a node and use **Alt + arrow keys** to move it. Theme choice is carried in the URL; node positions reset on reload.

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
node --test tests/store.test.mjs tests/server.test.mjs tests/cli.test.mjs
```

Tests cover queue authorization, concurrent results, stale premises, cancellation, resumption, bounded context, HTTP/CLI operation, and packaging for all three discovery paths. Packaging tests do not establish live runtime compatibility with those hosts.

## Design and research

- [Product brief](docs/product-brief.md): confirmed requirements and open questions.
- [Research recommendation](docs/research/recommendation.md): proposed persistence, resumption, and integration design, with linked primary-source reports.
- [Domain vocabulary](CONTEXT.md): shared terms.
- [Wayfinder map](.scratch/grill-my-mind/map.md): research conclusions and open decision tickets.
- [MVP agreement](docs/mvp.md): accepted choices, implementation scope, and trial checks.
- [Verification](docs/verification.md): what was exercised and what remains to test.
