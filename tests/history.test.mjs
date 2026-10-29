import test from 'node:test';
import assert from 'node:assert/strict';
import { growthTimeline, mapAtGrowthStep } from '../skills/grill-my-mind/assets/history.js';

const first = '2026-10-01T12:00:00.000Z', later = '2026-10-02T12:00:00.000Z';
const edge = (from, to, type = 'contains', extra = {}) => ({ from, to, type, ...extra });
const node = (id, createdAt, extra = {}) => ({ id, createdAt, title: id, status: 'explored', body: 'Current finding', ...extra });
const batch = (sequence, at, nodeIds, edges = []) => ({ sequence, at, nodeIds, edges });
const map = (nodes = [], edges = [], batches) => ({ rootId: nodes[0]?.id, nodes, edges, jobs: [], history: [],
  view: { positions: {} }, ...(batches ? { growth: { version: 1, batches } } : {}) });

test('recorded transactions preserve sequence despite equal or regressing clocks', () => {
  const contains = edge('root', 'child'), supports = edge('child', 'root', 'supports');
  const original = map([node('root', first), node('child', first)], [contains, supports], [
    batch(3, '2026-09-01T12:00:00.000Z', [], [supports]),
    batch(1, first, ['root']), batch(2, first, ['child'], [contains]),
  ]);
  const timeline = growthTimeline(original);
  assert.equal(timeline.incomplete, false);
  assert.equal(timeline.latestStep, 2);
  assert.deepEqual(timeline.steps.map(step => [step.nodeCount, step.edgeCount, step.at]), [
    [1, 0, first], [2, 1, first], [2, 2, '2026-09-01T12:00:00.000Z'],
  ]);
  assert.deepEqual(timeline.steps[2].addedNodeIds, []);
  assert.equal(timeline.steps[2].addedEdgeCount, 1);
  assert.deepEqual(mapAtGrowthStep(original, 1).edges, [contains]);
  assert.deepEqual(growthTimeline(JSON.parse(JSON.stringify(original))), timeline);
});

test('legacy node dates batch together; undated connections are never backdated to their endpoints', () => {
  const original = map([node('root', first), node('a', later), node('b', later)], [edge('root', 'a'), edge('a', 'b')]);
  const before = JSON.stringify(original);
  const timeline = growthTimeline(original);
  assert.deepEqual(timeline.steps.map(step => [step.kind, step.at, step.nodeCount, step.edgeCount]), [
    ['dated', first, 1, 0], ['dated', later, 3, 0], ['unknown', null, 3, 2],
  ]);
  assert.equal(timeline.incomplete, true);
  assert.equal(timeline.unknownNodeCount, 0);
  assert.equal(timeline.unknownEdgeCount, 2);
  assert.deepEqual(mapAtGrowthStep(original, 1).edges, []);
  assert.deepEqual(mapAtGrowthStep(original, timeline.latestStep), original);
  assert.equal(JSON.stringify(original), before);
});

test('unknown and invalid node dates remain unknown without inventing a baseline date', () => {
  const original = map([node('root'), node('dated', later), node('invalid', '2026-02-30T12:00:00Z')], [edge('root', 'dated')]);
  const timeline = growthTimeline(original);
  assert.deepEqual(timeline.steps[0].nodeIds, ['dated']);
  assert.deepEqual(timeline.steps[1].addedNodeIds, ['root', 'invalid']);
  assert.equal(timeline.steps[1].at, null);
  assert.equal(timeline.unknownNodeCount, 2);
  assert.deepEqual(mapAtGrowthStep(original, 0).edges, []);
  assert.deepEqual(mapAtGrowthStep(original, 1).nodes, original.nodes);
});

test('an inconsistent edge date cannot reveal a connection before an endpoint exists', () => {
  const original = map([node('root', first), node('child', later)], [edge('root', 'child', 'contains', { createdAt: first })]);
  const timeline = growthTimeline(original);
  assert.equal(timeline.unknownEdgeCount, 1);
  assert.equal(timeline.steps.at(-1).kind, 'unknown');
  for (const step of timeline.steps) {
    const snapshot = mapAtGrowthStep(original, step.index);
    const ids = new Set(snapshot.nodes.map(node => node.id));
    assert.ok(snapshot.edges.every(edge => ids.has(edge.from) && ids.has(edge.to)));
  }
  assert.deepEqual(mapAtGrowthStep(original, 1).edges, []);
});

test('a batch with an unknown legacy endpoint defers its connection to the undated step', () => {
  const connection = edge('legacy', 'new');
  const original = map([node('legacy'), node('new', later)], [connection], [batch(1, later, ['new'], [connection])]);
  const timeline = growthTimeline(original);
  assert.deepEqual(timeline.steps.map(step => [step.kind, step.nodeCount, step.edgeCount]), [['recorded', 1, 0], ['unknown', 2, 1]]);
  assert.equal(timeline.unknownNodeCount, 1);
  assert.equal(timeline.unknownEdgeCount, 1);
});

test('duplicate ledger references do not duplicate steps or additions', () => {
  const connection = edge('root', 'child');
  const original = map([node('root', first), node('child', later)], [connection], [
    batch(1, first, ['root', 'root']), batch(2, later, ['child'], [connection, connection]),
    batch(3, later, ['root', 'child'], [connection]),
  ]);
  const timeline = growthTimeline(original);
  assert.equal(timeline.steps.length, 2);
  assert.deepEqual(timeline.steps[1].nodeIds, ['root', 'child']);
  assert.equal(timeline.steps[1].edgeCount, 1);
});

test('history projections are detached, use current findings and positions, and never alter jobs or canonical data', () => {
  const original = map([node('root', first), node('child', later)], [edge('root', 'child')]);
  original.nodes[0].questions = [{ text: 'Current question', answer: 'Current answer' }];
  original.jobs = [{ id: 'job', status: 'queued' }];
  original.history = [{ type: 'activated' }];
  original.view.positions.root = { x: 80, y: 40 };
  const before = structuredClone(original);
  const snapshot = mapAtGrowthStep(original, 0);
  assert.equal(snapshot.nodes[0].body, 'Current finding');
  assert.equal(snapshot.nodes[0].status, 'explored');
  assert.deepEqual(snapshot.view, original.view);
  assert.deepEqual(snapshot.jobs, original.jobs);
  snapshot.nodes[0].questions[0].answer = 'Changed locally';
  snapshot.jobs[0].status = 'running';
  snapshot.view.positions.root.x = 0;
  snapshot.history.push({ type: 'local' });
  const timeline = growthTimeline(original);
  timeline.steps[0].nodeIds.push('local');
  assert.deepEqual(original, before);
  assert.equal(mapAtGrowthStep(original, 0).nodes[0].questions[0].answer, 'Current answer');
});

test('bounds and empty maps return deterministic projections', () => {
  const empty = map();
  assert.deepEqual(growthTimeline(empty), { steps: [], latestStep: -1, incomplete: false, unknownNodeCount: 0, unknownEdgeCount: 0 });
  assert.deepEqual(mapAtGrowthStep(empty, 0), empty);
  const original = map([node('root', first), node('child', later)]);
  assert.deepEqual(mapAtGrowthStep(original, -5).nodes.map(node => node.id), ['root']);
  assert.deepEqual(mapAtGrowthStep(original, 100), original);
  assert.deepEqual(mapAtGrowthStep(original), original);
});

test('a 500-node exploration replays 250 atomic additions without missing endpoints or mutating work', () => {
  const nodes = Array.from({ length: 500 }, (_, i) => node(`node-${i}`, first));
  const edges = nodes.slice(1).map((n, index) => edge(`node-${Math.floor(index / 3)}`, n.id));
  const original = map(nodes, edges);
  original.jobs = [{ id: 'queued-fixture', status: 'queued' }];
  original.growth = { version: 1, batches: Array.from({ length: 250 }, (_, i) => {
    const nodeIds = nodes.slice(i * 2, i * 2 + 2).map(n => n.id);
    return { sequence: i + 1, at: first, nodeIds, edges: edges.filter(e => nodeIds.includes(e.to)) };
  }) };
  const before = JSON.stringify(original), timeline = growthTimeline(original);
  assert.equal(timeline.steps.length, 250);
  assert.equal(timeline.incomplete, false);
  for (const step of [0, 25, 100, 249]) {
    const snapshot = mapAtGrowthStep(original, step);
    assert.equal(snapshot.nodes.length, (step + 1) * 2);
    assert.equal(snapshot.edges.length, snapshot.nodes.length - 1);
    const ids = new Set(snapshot.nodes.map(n => n.id));
    assert.ok(snapshot.edges.every(e => ids.has(e.from) && ids.has(e.to)));
    assert.deepEqual(snapshot.jobs, original.jobs);
  }
  assert.equal(JSON.stringify(original), before);
});
