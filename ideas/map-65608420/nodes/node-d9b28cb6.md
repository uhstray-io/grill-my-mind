# QA — Live constellation

Node: node-d9b28cb6 | Kind: idea | Work: explored | Review: accepted
Generated from map revision 14. Edit through Grill My Mind.

## Premise

QA validation only for issue 08. Verify that the real constellation supports agent questions, answers, inactive suggestions, saved node movement and reopening. Test answers and acceptance in this map are fixtures, not user product decisions.

## Findings

The QA answer continued the same root investigation, and the dragged branch retained its coordinates after a page reload.

Observed in the live browser: the QA answer returned the root to Queued. The public CLI then claimed the same root with that answer in its context. Dragging Verify saved positions stored x=104.34782608695654 and y=-219.37391304347824. After reloading, the node had those exact coordinates and its SVG connection ended at the same point. Both suggested branches remained Unexplored. Dark mode also survived the reload.

This is a real Codex validation result based on local code, automated checks, CLI responses, and browser observations. The answer itself is explicitly a QA fixture. It is not a user product decision.

Further trial work: explicitly activate a suggested branch, check cancel/retry and acceptance presentation, then return to the owner's original map.

## Questions and answers

### QA fixture: which persistence behavior should this trial check after moving a node?

QA fixture answer: keep the moved node coordinates and attached connections after reloading; leave every unactivated suggestion inactive.

## Evidence

- [Local QA workspace observation](http://127.0.0.1:4317/#map-65608420) (retrieved 2026-09-23T04:28:36.689Z): This live local page was inspected during the test. It demonstrated the queued/running/question flow, restored node coordinates, and connected SVG endpoints. It is a local validation reference, not independent external research.

## Relationships
- node-d9b28cb6 contains node-cd3ce286
- node-d9b28cb6 contains node-04b88d8c
