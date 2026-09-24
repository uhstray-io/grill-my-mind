# Larger-map and continuation baseline

Issue: [09 — Validate larger maps and longer exploration sessions](../.scratch/grill-my-mind/issues/09-large-map-trial.md), resolved after owner review and the navigation refinements recorded below. Longer real-session context measurement continues in issue 11.

Measured 2026-09-23 with Node v24.15.0 using `node scripts/measure-exploration.mjs`. The harness creates new isolated directories under `.test-output/issue09-*` and emits a credential-free `report.json`. It makes no provider calls and never opens the user's working maps. All findings, questions, and answers in these fixtures are simulated QA content.

## Map-size baseline before navigation fixes

Fixtures are trees with up to four children per parent, using repeated synthetic premises. The packet targets the last node. A second packet measurement adds semantic connections to every other non-root node in memory to exercise retrieval omissions; those additional links are not included in the saved JSON sizes or save timings below.

| Nodes | Saved JSON bytes | Save milliseconds | Tree packet characters | Connected packet characters / omitted context nodes | Estimated small-node width |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 25 | 118,994 | 9.33 | 6,583 | 15,183 / 15 | 24.91 px |
| 100 | 486,346 | 31.37 | 8,019 | 15,185 / 90 | 5.11 px |
| 250 | 1,221,196 | 107.54 | 8,021 | 15,187 / 240 | 2.00 px, clipped |
| 500 | 2,445,946 | 225.93 | 9,455 | 15,187 / 490 | 2.00 px, clipped |

Node-width estimates apply the current fit calculation to a hypothetical 1000×700 canvas and a 40-pixel node. They are not browser measurements. At 250 and 500 nodes, the minimum zoom prevents the full layout fitting inside the available bounds. This identifies dense-map navigation as the first usability concern to confirm in the browser. Layout calculations themselves took 0.23–1.11 milliseconds; this excludes rendering and interaction.

Save timings are single-run local observations including canonical JSON and all generated Markdown writes. The existing test suite ran concurrently, so these are rough baseline observations, not stable performance benchmarks or latency guarantees. The harness uses synthetic text, not a representative corpus; its ASCII content produces equal character and UTF-8 byte counts. Counts can vary slightly with generated identifiers and paths.

## Twenty continuation rounds

One branch received 20 simulated results, with a question and simulated answer after each of the first 19. Each result also suggested a new inactive direction.

- Individual serialized packets ranged from 965 to 15,349 characters.
- Round 20 contained 7,984 characters and omitted 16 older questions from the packet. Those questions and answers remained in canonical JSON and the linked node Markdown.
- Cumulative delivered packet content was 171,008 characters. This is a sum across packets, not a measurement of the active model context, vendor token usage, or total conversation size. Agent replies, tool output, extra reads, and host compaction are not measured.
- Final canonical JSON was 216,650 bytes, with 20 jobs, 79 history events, 19 answered questions, and 20 inactive suggestions.
- Reopening through a fresh Store instance retained all 19 answers. Markdown retained the first and last questions. No continuation remained queued after the last result.

The packet cap limits each retrieval, but older information falls out of the packet. A real fresh-agent trial must establish whether the agent follows the linked documents when necessary and retains important constraints. This fixture does not establish research quality or context-window safety.

## Verification and next work

The measurement harness completed its persistence and activation assertions. All 19 existing automated tests passed. Both preserved HTML snapshots passed static checks and retained their recorded SHA-256 hashes.

The remaining work at this checkpoint was browser validation and fresh-agent resumption. Both are now covered below. Issue 09 remains in progress for owner-led usability feedback and long-session host context observations.

## Browser validation and fixes

The isolated workspace `.test-output/issue09-MKZIp8` was served by the actual application on port 4318. The 500-node map is `map-4279d1d6`; no owner branches were activated or answered by this trial.

- Confirmed the original bug: on an 867-pixel-wide canvas, 479 of 500 node bounds were outside the fitted view; minor nodes were 2 pixels wide at the 5% minimum zoom.
- Removed the fixed minimum from full-map fitting and derived the zoom-out limit from the map extent. All 500 node bounds fit afterward, including the dragged outlier. Observed scales varied with viewport: 1.8% in the initial desktop view, 1.3% at the final 1280×900 breakpoint, and 0.7% in the mobile view.
- Added title search with a bounded result list, work status, no-match feedback, Enter/Arrow Down/Tab interaction, and Escape dismissal. Selecting `QA direction 499` centered it at 100% zoom with a 40-pixel node and opened its inspector. Added **Focus selected idea** for returning from the overview. Neither operation activated a branch.
- Kept connections visible while zooming by compensating stroke width for the outer HTML transform. SVG `vector-effect` alone did not preserve screen-space width under that transform; a final screenshot verified visible overview edges after compensation.
- Dragged `node-087f6973` by approximately 80×50 screen pixels at 100%. Its SVG endpoint followed. Saved position x=21633.71953416676, y=-8601.250594131196 survived reload and search-to-focus. All 499 non-root fixture nodes remained suggested.
- Exercised keyboard search, empty results, Escape, refocusing, light/dark search results, and a 390×844 mobile breakpoint. Fixed Escape reopening the native search results and controls overlapping the inspector. Final mobile checks found neither horizontal overflow nor control/inspector overlap. Reset the temporary viewport override.
- Replaced repeated node lookup while drawing edges with a lookup map, so dragging does not search the node array once per edge.

The updated harness now uses the same overview helper as the app and records layout extent. After-fix estimates on the hypothetical 1000×700 canvas were 24.91, 5.11, 1.77, and 0.79 pixels for minor nodes at 25/100/250/500 nodes respectively; no fixture clipped. These small overview sizes are deliberate for fitting the whole map; search/focus provides readable inspection. This does not establish that users can understand a dense graph comfortably.

## Actual investigation and independent resumption

Created `map-f5aa2374`, **Validation — navigating a large constellation**, in the isolated workspace through the public CLI. Codex claimed the root, investigated the implementation and browser evidence, and delivered actual findings through the CLI. This result is distinct from the synthetic 20-round fixture. It remains unreviewed, with two inactive suggestions; no owner answers or acceptance were fabricated.

With the owner's explicit authorization, a fresh subagent received only two sanitized read-only context packets and permission to read their linked node documents. It received none of the originating conversation, repository plans, full snapshots, or runtime credentials. No new job or descendant was activated for the read-only test.

The agent reconstructed the findings, preservation constraints, uncertainties, and a reasonable next step from the actual investigation packet. It correctly reported that saved claims were not independently verified browser evidence. The packet was captured before the final mobile check, so its report correctly retained that then-pending item; the later browser check above resolved it.

For the synthetic continuation, the agent noticed 16 omitted questions and read the linked node Markdown to recover question 1 and its answer. It explicitly recognized the repeated answer as simulated QA data, not an owner preference.

| File read by the fresh agent | Raw characters | UTF-8 bytes |
| --- | ---: | ---: |
| `resume-packet.json` | 4,255 | 4,259 |
| `omitted-packet.json` | 8,151 | 8,151 |
| `ideas/map-0913cdc5/nodes/node-a5a4ad97.md` | 43,563 | 43,563 |
| Total | 55,969 | 55,973 |

All paths are relative to `.test-output/issue09-MKZIp8`. Counts are raw files read once each; formatted JSON files differ from compact packet serialization, and neither count is vendor token usage. The fresh agent needed no original conversation. It identified missing reproduction steps/current diffs, which matter if it must independently verify a finding rather than resume planning.

This also exposed a retrieval limitation: a linked node document can be much larger than the packet. Follow-up work should measure targeted question/section reads, ranking of omitted relevant context, and actual host conversation growth. The packet limit alone cannot bound these additional reads.

## Result before owner review

All 20 automated tests passed, including the new overview/focus geometry regression test. Syntax checks passed, and the two standalone prototype hashes remain unchanged. Browser checks and the independent resumption check are complete for the cases above.

The remaining acceptance item is an owner-led trial with a real idea: whether finding, focusing, inspecting, and moving ideas feels useful, and whether relevant context stays understandable across a longer conversation. Actual host token/context use has not been measured. This requires owner feedback; it is not an unresolved permission or technical blocker. Broader graph shapes and live Claude Code/Copilot behavior remain outside the evidence established here.

## Owner review and compact navigation

The owner reported that everything generally worked and accepted continuing, with specific feedback: the layout should be less symmetric, neighboring directions should be close enough to navigate at a useful zoom, and clicking a node should center it. The owner also clarified that explored branches should remain complete; further work should grow new branches. That lifecycle change is tracked in [issue 10](../.scratch/grill-my-mind/issues/10-completed-branches.md), not claimed as delivered here.

Replaced leaf-count-dependent radial spacing with deterministic local placement, short-edge relaxation, and circle separation. The browser caches automatic geometry until topology changes; moving one node uses its saved override without recalculating the others. Manual coordinates remain authoritative, so earlier manually positioned outliers can still lie far away. No saved arrangement was reset.

For the 500-node four-child fixture without manual overrides, the median connection measured 146.30 pixels, the longest 476.25 pixels, and the minimum center separation 58 pixels. Automatic layout width was approximately 1,901 pixels, versus over 45,000 before this change. One local measurement took about 162 milliseconds, including distance checks; this is not a performance guarantee. A regression test now covers local edge lengths, circle separation, and centered parent/child framing across this fixture.

Maps now open around the starting node instead of fitting the full graph. Clicking or keyboard-activating a node centers it and frames its immediate parent and children. The inspector's **Nearby ideas** offers direct parent/child navigation. **Fit map** remains an explicit overview action. Neighbor framing may reduce zoom on a narrow screen or when manual positions are far apart; large fan-outs remain a limitation.

Browser verification on the existing 500-node QA map:

- Opened at 100%, centered on the root, with its four direct branches available nearby.
- Clicked direction 1: center error below 0.02 pixels; its parent and four children all lay inside the canvas at 100%.
- Followed **Nearby ideas** to direction 5, dragged it by approximately 40×30 pixels, and confirmed the camera transform stayed unchanged. The moved position persisted after reload and search.
- At the settled 390×844 mobile breakpoint, direction 5's parent and all four children fit in the canvas at 36%, with no horizontal page overflow. Restored the viewport afterward.
- All 21 automated tests, syntax checks, and static prototype verification passed. The standalone snapshot hashes remain unchanged.

Issue 09 is resolved on the basis of these checks and the owner's review. A long owner-led real-idea conversation and host token/context usage remain unmeasured; [issue 11](../.scratch/grill-my-mind/issues/11-context-growth.md) explicitly retains those tasks. The review is not substituted for those measurements.
