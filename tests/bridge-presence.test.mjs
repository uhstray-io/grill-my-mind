import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { startServer } from '../skills/grill-my-mind/scripts/server.mjs';
import { diagnose } from '../skills/grill-my-mind/scripts/doctor.mjs';

async function fixture() {
  const root = path.resolve('.test-output');
  await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'bridge-presence-'));
  const app = await startServer({ workspace, port: 0 });
  let session;
  try { session = await (await fetch(`${app.address}/api/session`)).json(); }
  catch (error) { await app.close(); throw error; }
  const headers = { Authorization: `Bearer ${session.token}` };
  const get = async route => {
    const response = await fetch(`${app.address}/api${route}`, { headers });
    assert.equal(response.status, 200);
    return response.json();
  };
  return { app, workspace, get };
}

test('bridge presence identifies covered maps and preserves unscoped listeners', async () => {
  const { app, workspace, get } = await fixture();
  try {
    const a = await app.store.create({ title: 'Map A', idea: 'Explore map A.' });
    const b = await app.store.create({ title: 'Map B', idea: 'Explore map B.' });
    await get(`/next?map=${a.id}&worker=worker-a`);
    let result = await get('/maps');
    assert.equal(result.bridge.listening, true);
    assert.deepEqual(result.bridge.scopes, [{ mapId: a.id, worker: 'worker-a', listening: true }]);
    assert.equal(result.maps.find(map => map.id === b.id).pending, 1, 'a scoped listener leaves another map queued');
    const doctor = await diagnose({ workspace });
    assert.deepEqual(doctor.bridge.scopes, result.bridge.scopes);
    await get(`/next?map=${b.id}&worker=worker-b`);
    result = await get('/maps');
    assert.deepEqual(new Set(result.bridge.scopes.map(scope => scope.mapId)), new Set([a.id, b.id]));
    await get('/next?worker=all-maps');
    result = await get('/maps');
    assert.ok(result.bridge.scopes.some(scope => scope.mapId === null && scope.worker === 'all-maps'));
    assert.equal(result.bridge.worker, 'all-maps');
  } finally { await app.close(); }
});

test('expired listener scopes stop advertising coverage', async t => {
  const { app, get } = await fixture();
  try {
    await get('/next?worker=idle-worker');
    assert.equal((await get('/maps')).bridge.listening, true);
    const expired = Date.now() + 41000;
    t.mock.method(Date, 'now', () => expired);
    const { bridge } = await get('/maps');
    assert.equal(bridge.listening, false);
    assert.deepEqual(bridge.scopes, []);
  } finally { await app.close(); }
});

test('concurrent map waits keep their own worker identity', async () => {
  const { app, get } = await fixture();
  try {
    let a = await app.store.create({ title: 'Map A', idea: 'Explore map A.' });
    const initial = await app.store.claim('setup', a.id);
    a = await app.store.complete(a.id, initial.jobId, initial.claimKey, {
      summary: 'The initial framing is complete.', body: 'A separate direction remains available.',
      suggestions: [{ title: 'A next direction', body: 'Investigate when the user chooses it.' }],
    });
    const b = await app.store.create({ title: 'Map B', idea: 'Explore map B.' });
    const waiting = get(`/next?map=${a.id}&worker=worker-a&wait=2`);
    const deadline = Date.now() + 2000;
    while (!(await get('/maps')).bridge.scopes.some(scope => scope.mapId === a.id)) {
      assert.ok(Date.now() < deadline, 'the first worker should register its wait');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    await get(`/next?map=${b.id}&worker=worker-b`);
    await app.store.action(a.id, { type: 'activate', nodeId: a.nodes[1].id, expectedRevision: a.revision });
    const claimed = await waiting;
    assert.equal(claimed.mapId, a.id);
    const saved = await app.store.get(a.id);
    assert.equal(saved.jobs.find(job => job.id === claimed.jobId).worker, 'worker-a');
  } finally { await app.close(); }
});
