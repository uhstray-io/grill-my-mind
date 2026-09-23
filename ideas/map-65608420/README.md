# QA — Live constellation

Generated view of map revision 14. Canonical source: [map.json](map.json).

> Read this overview, then only relevant node documents. Node files are generated; use the application or CLI to make changes.

## Original idea

QA validation only for issue 08. Verify that the real constellation supports agent questions, answers, inactive suggestions, saved node movement and reopening. Test answers and acceptance in this map are fixtures, not user product decisions.

## Exploration

- [QA — Live constellation](nodes/node-d9b28cb6.md): explored; accepted. The QA answer continued the same root investigation, and the dragged branch retained its coordinates after a page reload.
- [Verify saved positions](nodes/node-cd3ce286.md): explored; unreviewed. Pointer and keyboard movement save presentation coordinates without changing branch authorization or invalidating a running investigation.
- [Review dense maps later](nodes/node-04b88d8c.md): suggested; unreviewed. A future trial should examine navigation with hundreds of real branches. This QA suggestion stays inactive.
- [Measure dense graph navigation](nodes/node-f0acedf9.md): suggested; unreviewed. Future QA: evaluate readability and selection with hundreds of real nodes, varied title lengths, and cross-links. Do not run automatically.
