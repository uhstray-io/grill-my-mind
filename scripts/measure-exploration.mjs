// Synthetic QA only. Never opens or changes the user's .grill-my-mind workspace.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { Store } from '../skills/grill-my-mind/scripts/store.mjs';
import { constellationLayout, overviewView } from '../skills/grill-my-mind/assets/graph.js';

await mkdir('.test-output', { recursive: true });
const directory = await mkdtemp(path.resolve('.test-output/issue09-'));
const store = new Store(path.join(directory, 'ideas'));
const round = value => Math.round(value * 100) / 100;
const packetMetrics = packet => ({
  characters: JSON.stringify(packet).length,
  utf8Bytes: Buffer.byteLength(JSON.stringify(packet)),
  omittedContext: packet.omittedContext,
  omittedQuestions: packet.omittedQuestions,
});
const report = {
  generatedAt: new Date().toISOString(), nodeVersion: process.version,
  fixtureDirectory: directory,
  method: 'Synthetic four-child trees and 20 fixture continuations. Single-run local timings include JSON and Markdown writes. Fit estimates use the current app formula on a hypothetical 1000x700 canvas; not browser measurements. Packet lengths include the claim field but reports never expose its value. No provider calls or real user answers.',
  sizes: [], rounds: [],
};

for (const count of [25, 100, 250, 500]) {
  const map = await store.create({ title: `QA synthetic ${count} nodes`, idea: 'Synthetic map scaling fixture; not research or an owner decision.' });
  for (let i = 1; i < count; i++) {
    const parent = map.nodes[Math.floor((i - 1) / 4)];
    const node = store.node(`QA direction ${i}`, 'Synthetic premise. '.repeat(100), 'research', parent.id);
    map.nodes.push(node);
    map.edges.push({ from: parent.id, to: node.id, type: 'contains' });
  }
  const started = performance.now();
  await store.save(map);
  const saveMs = performance.now() - started;
  const layoutStarted = performance.now();
  const { positions } = constellationLayout(map);
  const layoutMs = performance.now() - layoutStarted;
  assert.equal(Object.keys(positions).length, count);
  assert.ok(Object.values(positions).every(p => Number.isFinite(p.x) && Number.isFinite(p.y)));
  const xs = Object.values(positions).map(p => p.x), ys = Object.values(positions).map(p => p.y);
  const width = Math.max(...xs) - Math.min(...xs) + 230;
  const height = Math.max(...ys) - Math.min(...ys) + 170;
  const fitScale = overviewView(positions, { width: 1000, height: 700 }).scale;
  const job = { ...map.jobs[0], nodeId: map.nodes.at(-1).id };
  const treePacket = packetMetrics(store.packet(map, job));
  // Connect the selected branch to many relevant domains to exercise omission.
  for (const node of map.nodes.slice(1, -1)) map.edges.push({ from: job.nodeId, to: node.id, type: 'related_to' });
  const linkedPacket = packetMetrics(store.packet(map, job));
  report.sizes.push({ nodes: count, saveMs: round(saveMs), layoutMs: round(layoutMs),
    savedTreeJsonBytes: (await stat(store.file(map.id))).size,
    layoutWidth: round(width), layoutHeight: round(height),
    estimatedMinorNodePixels: round(40 * fitScale), estimatedFitClips: width * fitScale > 952 + .001 || height * fitScale > 660 + .001,
    treePacket, linkedPacket });
}

const map = await store.create({ title: 'QA synthetic 20 continuations', idea: 'Measure fixture continuation context; no actual research.' });
let cumulativeCharacters = 0;
for (let index = 1; index <= 20; index++) {
  const packet = await store.claim('synthetic-measurement', map.id);
  assert.equal(packet.selected.id, map.rootId);
  const metrics = packetMetrics(packet);
  cumulativeCharacters += metrics.characters;
  let saved = await store.complete(map.id, packet.jobId, packet.claimKey, {
    summary: `Synthetic round ${index}.`, body: 'Fixture finding, not evidence. '.repeat(180),
    questions: index < 20 ? [`Fixture question ${index}: ${'Example context. '.repeat(35)}`] : [],
    suggestions: [{ title: `Inactive fixture direction ${index}`, body: 'Must remain inactive; not a real recommendation.' }],
  });
  if (index < 20) {
    saved = await store.action(map.id, { type: 'answer', nodeId: map.rootId, expectedRevision: saved.revision,
      questionId: saved.nodes[0].questions.at(-1).id, answer: 'Simulated QA answer, not an owner decision. '.repeat(30) });
  }
  assert.ok(saved.nodes.slice(1).every(node => node.status === 'suggested'));
  report.rounds.push({ round: index, ...metrics, cumulativeCharacters,
    savedJsonBytes: (await stat(store.file(map.id))).size, savedQuestions: saved.nodes[0].questions.length,
    jobs: saved.jobs.length, historyEvents: saved.history.length });
}
const reopened = await new Store(store.directory).get(map.id);
assert.equal(reopened.nodes[0].questions.filter(q => q.answer).length, 19);
assert.equal(reopened.nodes[0].status, 'explored');
assert.equal(await store.claim('synthetic-measurement', map.id), null);
const nodeDoc = await readFile(path.join(store.directory, map.id, 'nodes', `${map.rootId}.md`), 'utf8');
assert.ok(nodeDoc.includes('Fixture question 1:') && nodeDoc.includes('Fixture question 19:'));
report.checks = { retainedAll19AnswersAfterReopen: true, retainedQuestionsInMarkdown: true, all20SuggestionsInactive: true, noContinuationPending: true };
await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
