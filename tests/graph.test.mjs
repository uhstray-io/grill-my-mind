import test from 'node:test';
import assert from 'node:assert/strict';
import { constellationLayout, connectionPath, presentation, overviewView, focusedView } from '../skills/grill-my-mind/assets/graph.js';

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

test('overview contains every node even below five percent zoom, including saved outliers', () => {
  const positions = { root: { x: 0, y: 0 }, a: { x: -99000, y: 48000 }, b: { x: 92000, y: -72000 } };
  for (const viewport of [{ width: 867, height: 850 }, { width: 390, height: 220 }]) {
    const view = overviewView(positions, viewport);
    assert.ok(view.scale > 0 && view.scale < .05);
    for (const p of Object.values(positions)) {
      const x = p.x * view.scale + view.x, y = p.y * view.scale + view.y;
      assert.ok(x > 0 && x < viewport.width && y > 0 && y < viewport.height);
    }
    const focused = focusedView(positions.a, viewport, view.scale);
    assert.equal(focused.scale, 1);
    assert.equal(positions.a.x * focused.scale + focused.x, viewport.width / 2);
    assert.equal(positions.a.y * focused.scale + focused.y, viewport.height / 2);
  }
});

test('dense trees keep connected steps local and their neighborhood fits around the selected idea', () => {
  const nodes = Array.from({ length: 500 }, (_,index) => ({ id: `n${index}`, parentId: index ? `n${Math.floor((index - 1) / 4)}` : null }));
  const { positions } = constellationLayout({ rootId: 'n0', nodes });
  const distances = nodes.slice(1).map(node => Math.hypot(positions[node.id].x - positions[node.parentId].x, positions[node.id].y - positions[node.parentId].y)).sort((a,b) => a - b);
  assert.ok(distances[Math.floor(distances.length / 2)] < 180, 'Typical steps should remain local as the map grows');
  assert.ok(distances.at(-1) < 650, 'Dense branches must not stretch into multi-thousand-pixel connections');
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
    assert.ok(Math.hypot(positions[nodes[a].id].x - positions[nodes[b].id].x, positions[nodes[a].id].y - positions[nodes[b].id].y) > 50, 'Automatic circle nodes should not overlap');
  }
  for (const node of nodes) {
    const point = positions[node.id];
    const neighbors = nodes.filter(n => n.id === node.parentId || n.parentId === node.id).map(n => positions[n.id]);
    const view = focusedView(point, { width: 867, height: 486 }, 1, neighbors);
    assert.ok(Math.abs(point.x * view.scale + view.x - 433.5) < .001);
    assert.ok(Math.abs(point.y * view.scale + view.y - 243) < .001);
    for (const p of neighbors) {
      assert.ok(p.x * view.scale + view.x > 15 && p.x * view.scale + view.x < 852);
      assert.ok(p.y * view.scale + view.y > 15 && p.y * view.scale + view.y < 471);
    }
  }
});
