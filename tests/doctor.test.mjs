import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../skills/grill-my-mind/scripts/server.mjs';

const exec = promisify(execFile);
const cli = path.resolve('skills/grill-my-mind/scripts/cli.mjs');
const run = (workspace, args = ['doctor']) => exec(process.execPath, [cli, ...args, '--workspace', workspace]);
const temporary = async prefix => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  return mkdtemp(path.join(root, prefix));
};
const saveConnection = async (workspace, connection) => {
  await mkdir(path.join(workspace, '.grill-my-mind'), { recursive: true });
  await writeFile(path.join(workspace, '.grill-my-mind/connection.json'), JSON.stringify(connection));
};

test('doctor and usage work in a fresh path with spaces without creating runtime files', async () => {
  const workspace = await temporary('fresh workspace ü-');
  const result = JSON.parse((await run(workspace)).stdout);
  assert.equal(result.state, 'not-started'); assert.equal(result.ready, false);
  assert.equal(result.workspace, workspace); assert.equal(result.savedMaps, 0);
  assert.ok(result.checks.every(check => check.status !== 'error'));
  assert.deepEqual(result.start.args.slice(-4), ['--workspace', workspace, '--port', '0']);
  assert.equal(JSON.parse((await run(workspace, ['usage'])).stdout).commands, 0);
  assert.deepEqual(await readdir(workspace), []);
});

test('doctor reconnects to a live bridge and diagnoses a stopped bridge without exposing secrets', async () => {
  const workspace = await temporary('doctor-live-');
  const app = await startServer({ workspace, port: 0 });
  let connection;
  try {
    connection = JSON.parse(await readFile(path.join(workspace, '.grill-my-mind/connection.json'), 'utf8'));
    const response = await run(workspace);
    const result = JSON.parse(response.stdout);
    assert.equal(result.ready, true); assert.equal(result.state, 'ready'); assert.equal(result.bridge.listening, false);
    assert.ok(!response.stdout.includes(connection.token)); assert.ok(!response.stdout.includes('"token"'));
    assert.deepEqual((await readdir(path.join(workspace, '.grill-my-mind'))).sort(), ['connection.json', 'server.lock']);
  } finally { await app.close(); }
  await saveConnection(workspace, connection);
  const result = JSON.parse((await run(workspace)).stdout);
  assert.equal(result.ready, false); assert.equal(result.state, 'unreachable');
  assert.ok((await readFile(path.join(workspace, '.grill-my-mind/connection.json'), 'utf8')).includes(connection.token));
  assert.equal(JSON.parse((await run(workspace, ['usage'])).stdout).commands, 0);
});

test('doctor and CLI reject copied or remote connection settings before authenticating', async () => {
  const workspace = await temporary('doctor-invalid-');
  const token = 'c'.repeat(64);
  let requests = 0;
  const server = http.createServer((req, res) => { requests++; res.end('{}'); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    const address = `http://127.0.0.1:${server.address().port}`;
    await saveConnection(workspace, { address, token, workspace: path.join(workspace, 'former-location') });
    const copied = JSON.parse((await run(workspace)).stdout);
    assert.equal(copied.state, 'workspace-mismatch');
    await assert.rejects(run(workspace, ['status']), /another workspace location/);
    assert.equal(requests, 0);
    for (const invalidAddress of ['https://example.com', `${address}/?token=${token}`, `http://user:${token}@127.0.0.1:${server.address().port}`]) {
      await saveConnection(workspace, { address: invalidAddress, token, workspace });
      const response = await run(workspace);
      assert.equal(JSON.parse(response.stdout).state, 'invalid');
      assert.ok(!response.stdout.includes(token));
      await assert.rejects(run(workspace, ['status']), /Invalid local connection/);
    }
    assert.equal(requests, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('doctor never follows an authenticated redirect or echoes a rejected credential', async () => {
  const workspace = await temporary('doctor-auth-');
  const token = 'e'.repeat(64);
  let mode = 'unauthorized', destinationRequests = 0;
  const server = http.createServer((req, res) => {
    if (req.url === '/destination') { destinationRequests++; res.end('{}'); return; }
    if (mode === 'redirect') { res.writeHead(302, { Location: '/destination' }); res.end(); return; }
    res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: `Rejected ${token}` }));
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  try {
    await saveConnection(workspace, { address: `http://127.0.0.1:${server.address().port}`, token, workspace });
    const rejected = await run(workspace);
    assert.equal(JSON.parse(rejected.stdout).state, 'unauthorized'); assert.ok(!rejected.stdout.includes(token));
    await assert.rejects(run(workspace, ['status']), error => !error.stderr.includes(token) && error.stderr.includes('[redacted]'));
    mode = 'redirect';
    assert.equal(JSON.parse((await run(workspace)).stdout).state, 'unreachable');
    await assert.rejects(run(workspace, ['status']));
    assert.equal(destinationRequests, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
