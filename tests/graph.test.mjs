import test from 'node:test';
import assert from 'node:assert/strict';
import { constellationLayout, connectionPath, presentation } from '../skills/grill-my-mind/assets/graph.js';

test('saved maps lay out deterministically without moving saved nodes or modifying research', () => {
  const map = { rootId: 'root', nodes: [{ id: 'root', status: 'explored' }, { id: 'a', parentId: 'root', status: 'suggested' }, { id: 'b', parentId: 'root', status: 'queued' }], view: { positions: { a: { x: -123.5, y: 410 } } }, jobs: [{ nodeId: 'b', status: 'queued' }] };
  const before = JSON.stringify(map), graph = constellationLayout(map);
  assert.deepEqual(graph.positions.a, { x: -123.5, y: 410 });
  assert.deepEqual(constellationLayout(map), graph);
  assert.equal(JSON.stringify(map), before);
  map.nodes.push({ id: 'c', parentId: 'a', status: 'suggested' });
  const extended = constellationLayout(map);
  assert.deepEqual(extended.positions.a, graph.positions.a);
  assert.equal(extended.domains.c, extended.domains.a);
  assert.equal(Object.keys(extended.positions).length, 4);
});

test('all node centers and relation endpoints remain finite for deep and disconnected maps', () => {
  const nodes = [{ id: 'root' }];
  for (let i = 0; i < 250; i++) nodes.push({ id: `n${i}`, parentId: i ? `n${i - 1}` : 'root' });
  nodes.push({ id: 'orphan', parentId: 'missing' });
  const graph = constellationLayout({ rootId: 'root', nodes });
  assert.equal(Object.keys(graph.positions).length, nodes.length);
  for (const point of Object.values(graph.positions)) assert(Number.isFinite(point.x) && Number.isFinite(point.y));
  const from = graph.positions.root, to = { x: -55, y: 102 };
  assert.equal(connectionPath(from, to), 'M 0 0 L -55 102');
  assert.equal(connectionPath(to, from), 'M -55 102 L 0 0');
});

test('research completion, acceptance, stale conclusions and active work remain distinct', () => {
  assert.equal(presentation({ status: 'explored', reviewState: 'unreviewed' }).label, 'Explored');
  assert.equal(presentation({ status: 'explored', reviewState: 'accepted' }).label, 'Explored · accepted');
  assert.deepEqual(presentation({ status: 'explored', reviewState: 'accepted', stale: true }), { label: 'Explored · needs review', lit: false });
  for (const status of ['suggested', 'queued', 'running', 'awaiting-answer', 'interrupted']) assert.equal(presentation({ status }).lit, false);
  assert.equal(presentation({ status: 'queued', reviewState: 'accepted' }).label, 'Queued · accepted');
});
