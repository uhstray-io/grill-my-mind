import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Store } from '../skills/grill-my-mind/scripts/store.mjs';

async function fixture() {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const dir = await mkdtemp(path.join(root, 'store-'));
  const store = new Store(path.join(dir, 'ideas'));
  const map = await store.create({ title: 'Field notebook', idea: 'Shared notes must work offline.' });
  return { store, map };
}
const result = overrides => ({ summary: 'A focused finding.', body: 'A useful explanation of what was found, with its limits.', ...overrides });
async function action(store, mapId, nodeId, type, extra = {}) {
  const map = await store.get(mapId);
  return store.action(mapId, { nodeId, type, expectedRevision: map.revision, ...extra });
}

test('root exploration preserves original idea; suggestions do not activate', async () => {
  const { store, map } = await fixture();
  const job = await store.claim('test');
  const saved = await store.complete(map.id, job.jobId, job.claimKey, result({ suggestions: [{ title: 'Conflict resolution', body: 'Compare merge approaches.' }] }));
  assert.equal(saved.originalIdea, 'Shared notes must work offline.');
  assert.equal(saved.nodes[0].prompt, saved.originalIdea);
  assert.equal(saved.nodes[1].status, 'suggested');
  assert.equal(await store.claim('test'), null);
  const doc = await readFile(path.join(store.directory, map.id, 'README.md'), 'utf8');
  assert.match(doc, /Shared notes must work offline/);
  const repeated = await store.complete(map.id, job.jobId, job.claimKey, result({ suggestions: [{ title: 'Duplicate', body: 'Should never appear.' }] }));
  assert.equal(repeated.revision, saved.revision);
  assert.equal(repeated.nodes.length, 2);
});

test('one activation is claimed once and answering questions continues only that branch', async () => {
  const { store, map } = await fixture();
  const claims = await Promise.all([store.claim('one'), store.claim('two')]);
  assert.equal(claims.filter(Boolean).length, 1);
  const job = claims.find(Boolean);
  let saved = await store.complete(map.id, job.jobId, job.claimKey, result({ questions: ['Who resolves conflicting edits?', 'Are attachments required?'], suggestions: [{ title: 'Other direction', body: 'Keep this inactive.' }] }));
  await action(store, map.id, map.rootId, 'answer', { questionId: saved.nodes[0].questions[0].id, answer: 'The owner.' });
  assert.equal(await store.claim('one'), null);
  saved = await action(store, map.id, map.rootId, 'answer', { questionId: saved.nodes[0].questions[1].id, answer: 'Yes.' });
  assert.equal(saved.jobs.filter(j => j.status === 'queued').length, 1);
  const followup = await store.claim('one');
  assert.equal(followup.selected.id, map.rootId);
  assert.equal(followup.selected.questions[0].answer, 'The owner.');
  assert.equal(saved.nodes[1].status, 'suggested');
});

test('duplicate activations create only one job; stale revisions reject before writing', async () => {
  const { store, map } = await fixture();
  const saved = await action(store, map.id, map.rootId, 'activate');
  assert.equal(saved.jobs.length, 1);
  await assert.rejects(store.action(map.id, { expectedRevision: map.revision, nodeId: map.rootId, type: 'suggest', title: 'Stale', body: 'Stale' }), error => error.status === 409);
  assert.equal((await store.get(map.id)).nodes.length, 1);
});

test('late results preserve changed premises and remain available for review', async () => {
  const { store, map } = await fixture(); const job = await store.claim('one');
  await action(store, map.id, map.rootId, 'revise', { body: 'Only online use is required now.' });
  const saved = await store.complete(map.id, job.jobId, job.claimKey, result({ suggestions: [{ title: 'Old direction', body: 'Must not silently apply.' }] }));
  assert.equal(saved.nodes[0].body, 'Only online use is required now.');
  assert.equal(saved.nodes.length, 1); assert.equal(saved.jobs[0].stale, true);
  assert.equal(saved.nodes[0].status, 'interrupted');
  assert.ok(saved.jobs[0].result.body);
});

test('two independent branches can finish without lost updates', async () => {
  const { store, map } = await fixture(); const rootJob = await store.claim('one');
  let saved = await store.complete(map.id, rootJob.jobId, rootJob.claimKey, result({ suggestions: [{ title: 'Storage', body: 'Storage constraints.' }, { title: 'Access', body: 'Access constraints.' }] }));
  const children = saved.nodes.slice(1);
  for (const child of children) await action(store, map.id, child.id, 'activate');
  const a = await store.claim('a'), b = await store.claim('b');
  await Promise.all([store.complete(map.id, a.jobId, a.claimKey, result({ summary: 'Storage result' })), store.complete(map.id, b.jobId, b.claimKey, result({ summary: 'Access result' }))]);
  saved = await store.get(map.id);
  assert.equal(saved.nodes.filter(n => n.status === 'explored').length, 3);
  assert.equal(saved.jobs.filter(j => j.stale).length, 0);
});

test('cancelled work rejects a late result and can be explicitly retried', async () => {
  const { store, map } = await fixture(); const job = await store.claim('one');
  await action(store, map.id, map.rootId, 'cancel');
  await assert.rejects(store.complete(map.id, job.jobId, job.claimKey, result()), error => error.status === 409);
  await action(store, map.id, map.rootId, 'activate');
  assert.notEqual((await store.claim('two')).jobId, job.jobId);
});

test('invalid results cannot partly mutate a map', async () => {
  const { store, map } = await fixture(); const job = await store.claim('one');
  const before = await store.get(map.id);
  await assert.rejects(store.complete(map.id, job.jobId, job.claimKey, result({ suggestions: [{ title: '', body: 'Bad' }] })));
  assert.deepEqual(await store.get(map.id), before);
});

test('restart preserves answers, regenerates readable views, and marks active work interrupted', async () => {
  const { store, map } = await fixture(); await store.claim('one');
  await unlink(path.join(store.directory, map.id, 'README.md'));
  const restarted = new Store(store.directory); await restarted.recover();
  const saved = await restarted.get(map.id);
  assert.equal(saved.jobs[0].status, 'interrupted');
  assert.equal(saved.nodes[0].status, 'interrupted');
  assert.equal(await restarted.claim('two'), null);
  assert.match(await readFile(path.join(store.directory, map.id, 'README.md'), 'utf8'), /interrupted/);
});

test('context stays bounded as irrelevant branches grow', async () => {
  const { store, map } = await fixture(); const saved = await store.get(map.id);
  for (let i = 0; i < 400; i++) saved.nodes.push(store.node(`Unrelated ${i}`, 'x'.repeat(3000), 'research', map.rootId));
  await store.save(saved);
  const job = await store.claim('test');
  assert.equal(job.context.length, 0);
  assert.ok(JSON.stringify(job).length < 16000);
  assert.ok(job.contextCharacters < 5000);
  assert.equal(job.selected.premise, 'Shared notes must work offline.');
});

test('unsupported schema fails without rewriting the original file', async () => {
  const { store, map } = await fixture(); const file = store.file(map.id);
  const source = JSON.stringify({ ...map, schemaVersion: 22 }); await writeFile(file, source);
  await assert.rejects(store.get(map.id), error => error.status === 409);
  assert.equal(await readFile(file, 'utf8'), source);
});

test('an interrupted temporary snapshot cannot replace the acknowledged map', async () => {
  const { store, map } = await fixture();
  await writeFile(store.file(map.id) + '.interrupted.tmp', '{"schemaVersion":1,"nodes":[');
  const reopened = new Store(store.directory);
  assert.equal((await reopened.get(map.id)).originalIdea, 'Shared notes must work offline.');
  assert.equal((await reopened.get(map.id)).revision, map.revision);
});

test('large relevant content is bounded and reports omissions', async () => {
  const { store, map } = await fixture(); const saved = await store.get(map.id); const n = saved.nodes[0];
  n.prompt = 'p'.repeat(16000); n.body = 'b'.repeat(24000); n.summary = 's'.repeat(800);
  n.questions = Array.from({ length: 12 }, (_, i) => ({ id: `q-${i}`, text: 'q'.repeat(1600), answer: 'a'.repeat(12000) }));
  n.sources = Array.from({ length: 20 }, () => ({ title: 'Evidence', url: 'https://example.org', note: 'n'.repeat(1500), retrievedAt: new Date().toISOString() }));
  await store.save(saved);
  const packet = await store.claim('test');
  assert.ok(JSON.stringify(packet).length < 16000);
  assert.ok(packet.omittedQuestions > 0); assert.ok(packet.omittedSources > 0);
  assert.match(packet.selected.premise, /Shortened/);
});
