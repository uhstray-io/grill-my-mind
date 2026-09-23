import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
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
