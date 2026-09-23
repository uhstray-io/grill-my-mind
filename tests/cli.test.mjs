import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../skills/grill-my-mind/scripts/server.mjs';

const exec = promisify(execFile);
const skill = path.resolve('skills/grill-my-mind');
test('the public CLI claims work, delivers results, and gives compact idle output', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'cli-'));
  const app = await startServer({ workspace, port: 0 });
  const cli = async args => JSON.parse((await exec(process.execPath, [path.join(skill, 'scripts/cli.mjs'), ...args, '--workspace', workspace])).stdout);
  try {
    const idea = path.join(workspace, 'idea.json'); await writeFile(idea, JSON.stringify({ title: 'CLI flow', idea: 'Investigate shared notes.' }));
    const created = await cli(['create', '--file', idea]);
    const job = await cli(['next', '--worker', 'test']);
    assert.equal(job.mapId, created.mapId); assert.equal(job.claimKey, undefined);
    const resultFile = path.join(workspace, 'result.json'); await writeFile(resultFile, JSON.stringify({ summary: 'Scope clarified.', body: 'Shared notes need explicit ownership.' }));
    const saved = await cli(['result', '--job', job.jobId, '--file', resultFile]); assert.equal(saved.saved, true);
    const idle = await cli(['next', '--wait', '0']); assert.equal(idle.idle, true); assert.ok(JSON.stringify(idle).length < 200);
    const read = await cli(['read', '--map', created.mapId]); assert.equal(read.nodes[0].summary, 'Scope clarified.');
  } finally { await app.close(); }
});

test('all three project installation paths receive a complete portable package', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const project = await mkdtemp(path.join(root, 'install-'));
  for (const [host, folder] of [['codex', '.agents'], ['claude', '.claude'], ['copilot', '.github']]) {
    await exec(process.execPath, [path.join(skill, 'scripts/install.mjs'), '--host', host, '--project', project]);
    const installed = path.join(project, folder, 'skills/grill-my-mind');
    assert.equal(await readFile(path.join(installed, 'SKILL.md'), 'utf8'), await readFile(path.join(skill, 'SKILL.md'), 'utf8'));
    await access(path.join(installed, 'assets/app.js')); await access(path.join(installed, 'scripts/server.mjs'));
  }
});
