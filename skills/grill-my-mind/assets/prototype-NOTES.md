# Skill tree interaction studies — throwaway

Question: does a dense, spatial constellation or an ordered set of research paths make a complex idea easier and more inviting to explore?

Historical study notes: the localhost variant selector has been retired by issue 08. The server now serves the real constellation workspace, including for old variant URLs. Use the [standalone snapshots](../../../prototypes/README.md) to revisit the archived study and original card design. The descriptions below record the study's behavior before integration.

## Visual plan

Palette: ink #09121c, slate #627080, paper #e8e9df, mint #87dac3, gold #edc784, blue #95b9ed. Georgia editorial headings with Segoe UI controls and monospace metadata. Small outlined symbols, delicate connecting lines, sparse labels. Gray suggestions; colored explored paths; gold question rings. State is also conveyed in accessible names and the inspector.

Constellation: wide free-form branching field, quiet star texture, central idea, six irregular domains, floating right inspector. Follow topology and light.

    title / legend                          reset / exit
    [           radial node field          ][inspector]
    [                     pan / zoom       ][question ]
                       [A / B switcher]

Research paths: six parallel vertical trees, domain headings, descending branches, a full-width detail dock. Compare depth and coverage across domains.

    title / legend                          reset / exit
    [experience][knowledge][agents][scope][trust][continuity]
    [      small branching nodes descending in lanes      ]
    [ selected idea | context / question | primary action ]
                       [A / B switcher]

## Boundaries

Both variants use the same illustrative Grill My Mind fixture (79 nodes), with only the saved map's title read from the existing API when a session hash is present. The read is optional; the study works without a saved map. All branch details and findings are explicitly simulated. Research, answers, reset, and new suggestions only change browser memory. No POST requests, job claims, model calls, or map writes. Reload resets the simulation. Switching variants retains it. Selected nodes expand in the inspector; activate → question → answer → lit result with two new gray suggestions. Unrelated branches never auto-activate.

## Feedback to collect

- Which structure helps you choose the next question?
- Do gray nodes feel available or mistakenly locked?
- Are small nodes and hover titles enough before opening details?
- Does the question interruption feel natural? Is the glow meaningful?
- Try 200+ real nodes, touch navigation, and dense cross-links later.

Decision recorded 2026-09-23: the user selected Constellation/version 1 for the next working prototype and rejected Research paths/version 2. Enhancements or a future change of direction remain possible. The original card map is retained for comparison. Standalone snapshots and static verification are recorded in [prototypes/README.md](../../../prototypes/README.md). Prototype selection is resolved; live integration is tracked separately in [issue 08](../../../.scratch/grill-my-mind/issues/08-live-constellation.md). Remove the rejected variant from the active UI during that integration, preserving the standalone snapshots. These current studies still simulate research.

## Light mode and movable nodes

The `theme=light` URL parameter and header toggle apply to both variants. Warm paper, graphite, and darker teal/blue/amber maintain contrast and distinguish gray suggestions from explored nodes. Theme changes leave graph and question state intact.

Pointer dragging uses a four-pixel threshold to distinguish clicks from moves, captures the pointer on the canvas, and converts screen deltas through the current zoom. Only the dragged node's per-layout offset changes; incident edges redraw from the resulting coordinates. Background dragging still pans. Alt + arrow keys move a focused node. Reset layout clears only the current variant's offsets; Reset preview clears both plus simulated progress. Fit includes moved nodes. Position edits remain in memory, consistent with the prototype boundary.

Verified in the browser: light/dark toggle, independent node dragging in both layouts, edge endpoints following, neighboring nodes and canvas transform remaining unchanged during a node drag, zoomed dragging, keyboard movement, positions retained across variant/theme changes, reset layout, and click-to-explore after dragging. Node syntax check passed.

## Verification

- Browser checked both layouts at 1280×720 and 390×844; narrow screens support panning and a scrolling detail dock.
- Exercised select → research → question → answer → explored, with the count changing from 79 to 81 nodes and new suggestions remaining gray.
- Verified variant switching retains completed progress, arrow keys inside the answer field do not switch variants, reset restores the fixture, and zoom works.
- Browser reported no warnings or errors. Node syntax check passed. All 16 existing store/server/CLI tests passed using the direct Node test command.
- The machine's npm shim points to a missing npm-cli.js; the documented direct Node commands work without npm.
- Saved map still has its original queued branch; the prototype does not consume it.
