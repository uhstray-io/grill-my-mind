import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { startServer } from '../skills/grill-my-mind/scripts/server.mjs';

test('HTTP workspace runs the complete queue/question/result/restart loop', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'http-'));
  let app = await startServer({ workspace, port: 0 });
  try {
    const html = await (await fetch(app.address)).text(); assert.match(html, /constellation\.css/);
    assert.match(await (await fetch(app.address + '/graph.js')).text(), /export function constellationLayout/);
    assert.equal(await (await fetch(app.address + '/?variant=paths')).text(), html);
    assert.equal((await fetch(app.address + '/prototype.js')).status, 404);
    const { token } = await (await fetch(app.address + '/api/session')).json();
    const request = async (route, body) => {
      const res = await fetch(app.address + '/api' + route, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      assert.ok(res.ok, await res.clone().text()); return res.json();
    };
    let map = await request('/maps', { title: 'User-created idea', idea: 'A library of shared recipes.' });
    const first = await request('/next?worker=integration');
    assert.equal(first.selected.id, map.rootId);
    map = await request(`/maps/${map.id}`);
    map = await request(`/maps/${map.id}/action`, { expectedRevision: map.revision, nodeId: map.rootId, type: 'position', x: -48.5, y: 212 });
    const publicState = await request(`/maps/${map.id}`); assert.equal(publicState.jobs[0].claimKey, undefined);
    map = await request(`/maps/${map.id}/result`, { jobId: first.jobId, claimKey: first.claimKey, result: { summary: 'We need to understand the audience.', body: 'The target users shape recipe organization.', questions: ['Who is this for?'], suggestions: [{ title: 'Import recipes', body: 'Explore where existing recipes live.' }] } });
    assert.equal(map.nodes[1].status, 'suggested');
    assert.equal(map.jobs[0].stale, false, 'moving a node must not invalidate the running investigation');
    map = await request(`/maps/${map.id}/action`, { expectedRevision: map.revision, nodeId: map.rootId, type: 'answer', questionId: map.nodes[0].questions[0].id, answer: 'My family.' });
    const next = await request('/next?worker=integration'); assert.equal(next.selected.questions[0].answer, 'My family.');
    map = await request(`/maps/${map.id}/result`, { jobId: next.jobId, claimKey: next.claimKey, result: { summary: 'A family recipe library.', body: 'Prioritize easy sharing and inherited recipes.' } });
    await app.close(); app = await startServer({ workspace, port: 0 });
    const saved = await app.store.get(map.id); assert.equal(saved.nodes[0].questions[0].answer, 'My family.');
    assert.deepEqual(saved.view.positions[map.rootId], { x: -48.5, y: 212 });
    assert.equal(saved.nodes[1].status, 'suggested');
    assert.match(await readFile(path.join(workspace, 'ideas', map.id, 'nodes', `${map.rootId}.md`), 'utf8'), /My family/);
  } finally { await app.close(); }
});

test('one server owns a workspace at a time', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'ownership-')); const app = await startServer({ workspace, port: 0 });
  try { await assert.rejects(startServer({ workspace, port: 0 }), /already owns/); }
  finally { await app.close(); }
});

test('brief is authenticated, read-only, scoped, and does not expose worker claims', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'brief-http-'));
  const app = await startServer({ workspace, port: 0 });
  try {
    const map = await app.store.create({ title: 'Plan a community workshop', idea: 'Compare a hands-on workshop with a discussion group.' });
    const packet = await app.store.claim('test', map.id);
    await app.store.complete(map.id, packet.jobId, packet.claimKey, { summary: 'Choose the audience before the format.', body: 'The desired outcome shapes the format.',
      questions: ['Who should be able to participate?'], suggestions: [{ title: 'Accessible venue', body: 'Check transport and access requirements.', kind: 'risk' }] });
    const before = await app.store.get(map.id);
    const route = `${app.address}/api/maps/${map.id}/brief`;
    assert.equal((await fetch(route)).status, 401);
    const { token } = await (await fetch(app.address + '/api/session')).json();
    const headers = { Authorization: `Bearer ${token}` };
    const brief = await (await fetch(route, { headers })).json();
    assert.equal(brief.counts.awaitingAnswer, 1);
    assert.equal(brief.sections.find(s => s.id === 'directions').total, 1);
    assert.doesNotMatch(JSON.stringify(brief), new RegExp(packet.claimKey));
    assert.equal((await fetch(route, { headers: { ...headers, Origin: 'https://external.invalid' } })).status, 403);
    const child = before.nodes[1];
    const scoped = await (await fetch(route + `?node=${child.id}`, { headers })).json();
    assert.equal(scoped.counts.nodes, 1);
    assert.equal((await fetch(route + '?node=missing', { headers })).status, 404);
    assert.deepEqual(await app.store.get(map.id), before);
  } finally { await app.close(); }
});

test('HTTP saves preserve UTF-8 characters split across request chunks', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'unicode-http-'));
  const app = await startServer({ workspace, port: 0 });
  try {
    const { token } = await (await fetch(app.address + '/api/session')).json();
    const idea = 'Keep the café notes 🧠 intact.';
    const bytes = Buffer.from(JSON.stringify({ title: 'Unicode notes', idea }));
    const boundaries = [0, bytes.indexOf(Buffer.from('é')) + 1, bytes.indexOf(Buffer.from('🧠')) + 2, bytes.length];
    const response = await new Promise((resolve, reject) => {
      const request = http.request(app.address + '/api/maps', { method: 'POST', headers: {
        Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': bytes.length,
      } }, response => {
        response.setEncoding('utf8'); let raw = '';
        response.on('data', chunk => { raw += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(raw) }));
        response.on('error', reject);
      });
      request.on('error', reject);
      (async () => {
        for (let index = 0; index < boundaries.length - 1; index++) {
          request.write(bytes.subarray(boundaries[index], boundaries[index + 1]));
          await delay(25);
        }
        request.end();
      })().catch(reject);
    });
    assert.equal(response.status, 201);
    assert.equal(response.body.originalIdea, idea);
    assert.equal((await app.store.get(response.body.id)).nodes[0].prompt, idea);
  } finally { await app.close(); }
});
