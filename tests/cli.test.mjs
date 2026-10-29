import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { startServer } from '../skills/grill-my-mind/scripts/server.mjs';
import { mapBrief } from '../skills/grill-my-mind/scripts/brief.mjs';

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
    const excerpt = await cli(['read', '--map', created.mapId, '--node', created.rootId, '--section', 'findings']);
    assert.match(excerpt.excerpt, /explicit ownership/); assert.equal(excerpt.nextOffset, null);
    const actionFile = path.join(workspace, 'action.json');
    await writeFile(actionFile, JSON.stringify({ expectedRevision: read.revision, nodeId: created.rootId, type: 'activate' }));
    await assert.rejects(cli(['act', '--map', created.mapId, '--file', actionFile]), /branch is complete/);
    await writeFile(actionFile, JSON.stringify({ expectedRevision: read.revision, nodeId: created.rootId, type: 'fork-revision', body: 'New scope to investigate separately.' }));
    await cli(['act', '--map', created.mapId, '--file', actionFile]);
    const branches = await cli(['read', '--map', created.mapId]);
    assert.equal(branches.nodes[0].summary, 'Scope clarified.'); assert.equal(branches.nodes[1].status, 'suggested');
    const usage = await cli(['usage', '--map', created.mapId]);
    const records = (await readFile(path.join(workspace, '.grill-my-mind/context-usage.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse).filter(e => e.mapId === created.mapId);
    assert.equal(usage.characters, records.reduce((n,e) => n + e.characters, 0));
    assert.equal(usage.commands, records.length); assert.equal(usage.byCommand.read.calls, 3);
    assert.ok(records.every(e => !('claimKey' in e) && !('excerpt' in e)));
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
    await access(path.join(installed, 'references/exploration.md'));
    const diagnosis = JSON.parse((await exec(process.execPath, [path.join(installed, 'scripts/cli.mjs'), 'doctor', '--workspace', project], { cwd: path.dirname(project) })).stdout);
    assert.equal(diagnosis.skillDirectory, installed + path.sep);
    assert.equal(diagnosis.workspace, project); assert.equal(diagnosis.state, 'not-started');
    assert.ok(diagnosis.checks.every(check => check.status !== 'error'));
  }
});

test('CLI resumes a nontechnical exploration from a real saved answer without activating suggestions', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'workshop-'));
  const app = await startServer({ workspace, port: 0 });
  const run = args => exec(process.execPath, [path.join(skill, 'scripts/cli.mjs'), ...args, '--workspace', workspace]);
  const cli = async args => JSON.parse((await run(args)).stdout);
  const input = path.join(workspace, 'input.json');
  try {
    await writeFile(input, JSON.stringify({ title: 'Neighborhood workshop', idea: 'Explore a low-cost workshop that fits one evening of preparation.' }));
    const map = await cli(['create', '--file', input]);
    const first = await cli(['next', '--map', map.mapId, '--worker', 'fixture']);
    await writeFile(input, JSON.stringify({ summary: 'A trial could test interest; available tools remain unknown.', body: 'User constraint: one evening of preparation. Interpretation: a small trial may fit. Unknown: whether equipment is supplied.', questions: ['Will participants bring tools or should the organizer supply them?'], suggestions: [{ title: 'Who would attend a trial?', body: 'Compare likely attendance with the available preparation time.', kind: 'research' }] }));
    await cli(['result', '--job', first.jobId, '--file', input]);
    assert.equal((await cli(['next', '--map', map.mapId])).idle, true);
    const paused = await app.store.get(map.mapId);
    assert.equal(paused.nodes[0].status, 'awaiting-answer'); assert.equal(paused.nodes[1].status, 'suggested');
    await writeFile(input, JSON.stringify({ type: 'answer', expectedRevision: paused.revision, nodeId: map.rootId, questionId: paused.nodes[0].questions[0].id, answer: 'Participants will bring tools; I will lend two spare sets.' }));
    await cli(['act', '--map', map.mapId, '--file', input]);
    const resumed = await cli(['next', '--map', map.mapId, '--worker', 'fixture']);
    assert.equal(resumed.selected.questions[0].answer, 'Participants will bring tools; I will lend two spare sets.');
    await writeFile(input, JSON.stringify({ summary: 'A trial can use participant tools plus two spare sets.', body: 'User preference: participants bring tools; two sets can be lent. Interpretation: attendance may depend on access to tools. That remains untested.' }));
    await cli(['result', '--job', resumed.jobId, '--file', input]);
    const brief = await cli(['brief', '--map', map.mapId]);
    assert.equal(brief.mapId, map.mapId); assert.equal(brief.counts.explored, 1); assert.equal(brief.counts.accepted, 0);
    assert.ok(JSON.stringify(brief).includes('two spare sets'));
    const rendered = (await run(['brief', '--map', map.mapId, '--format', 'markdown'])).stdout;
    assert.equal(brief.markdown, undefined, 'JSON output does not duplicate itself in Markdown');
    assert.equal(rendered, mapBrief(await app.store.get(map.mapId)).markdown + '\n');
    const records = (await readFile(path.join(workspace, '.grill-my-mind/context-usage.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(records.at(-1).characters, rendered.length); assert.equal(records.at(-1).utf8Bytes, Buffer.byteLength(rendered));
    const finalMap = await app.store.get(map.mapId);
    assert.equal(finalMap.nodes[1].status, 'suggested'); assert.equal(finalMap.nodes[0].reviewState, 'unreviewed');
    assert.equal((await cli(['next', '--map', map.mapId])).idle, true);
  } finally { await app.close(); }
});

test('CLI discovers nodes beyond forty with bounded pages, full-text matching, and revision checks', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'discovery-'));
  const app = await startServer({ workspace, port: 0 });
  const cli = async args => JSON.parse((await exec(process.execPath, [path.join(skill, 'scripts/cli.mjs'), ...args, '--workspace', workspace])).stdout);
  try {
    const fixture = await app.store.create({ title: 'Forty-five distinct checks', idea: 'An isolated large map for retrieval.' });
    for (let index = 1; index <= 45; index++) {
      const node = app.store.node(`Check ${index}`, 'A bounded fixture premise.', 'research', fixture.rootId);
      node.body = index === 45 ? 'A hidden discriminator: accessibility after sunset.' : 'Ordinary fixture evidence.';
      fixture.nodes.push(node); fixture.edges.push({ from: fixture.rootId, to: node.id, type: 'contains' });
    }
    await app.store.save(fixture);
    const first = await cli(['read', '--map', fixture.id]);
    assert.equal(first.nodes.length, 20); assert.equal(first.total, 46); assert.equal(first.nextOffset, 20);
    const second = await cli(['read', '--map', fixture.id, '--offset', String(first.nextOffset), '--revision', String(first.revision)]);
    const third = await cli(['read', '--map', fixture.id, '--offset', String(second.nextOffset), '--revision', String(second.revision)]);
    assert.equal(third.nodes.length, 6); assert.equal(third.nextOffset, null);
    assert.equal(new Set([...first.nodes, ...second.nodes, ...third.nodes].map(n => n.id)).size, 46);
    const match = await cli(['read', '--map', fixture.id, '--query', 'ACCESSIBILITY AFTER SUNSET']);
    assert.equal(match.matching, 1); assert.equal(match.nodes[0].title, 'Check 45');
    assert.equal((await cli(['read', '--map', fixture.id, '--query', 'no-such-fixture'])).matching, 0);
    await assert.rejects(cli(['read', '--map', fixture.id, '--offset', '20']), /requires --revision/);
    await assert.rejects(cli(['read', '--map', fixture.id, '--limit', '41']), /integer from 1 to 40/);
    await app.store.action(fixture.id, { type: 'suggest', expectedRevision: fixture.revision, nodeId: fixture.rootId, title: 'New direction', body: 'Changes the page revision.' });
    await assert.rejects(cli(['read', '--map', fixture.id, '--offset', '20', '--revision', String(first.revision)]), /list changed/);
  } finally { await app.close(); }
});

test('CLI discovers a large saved-map catalog and invalidates changed catalog pages', async () => {
  const root = path.resolve('.test-output'); await mkdir(root, { recursive: true });
  const workspace = await mkdtemp(path.join(root, 'catalog-'));
  const app = await startServer({ workspace, port: 0 });
  const cli = async args => JSON.parse((await exec(process.execPath, [path.join(skill, 'scripts/cli.mjs'), ...args, '--workspace', workspace])).stdout);
  try {
    for (let index = 0; index < 43; index++) await app.store.create({ title: `Archived workshop ${index}`, idea: 'A synthetic catalog fixture.' });
    const first = await cli(['maps', '--limit', '40']);
    assert.equal(first.maps.length, 40); assert.equal(first.total, 43); assert.equal(first.nextOffset, 40);
    const last = await cli(['maps', '--offset', '40', '--revision', first.revision]);
    assert.equal(last.maps.length, 3); assert.equal(last.nextOffset, null);
    assert.equal(new Set([...first.maps, ...last.maps].map(m => m.id)).size, 43);
    const found = await cli(['maps', '--query', 'WORKSHOP 42']); assert.equal(found.matching, 1);
    await app.store.create({ title: 'Newest fixture', idea: 'Invalidates the catalog revision.' });
    await assert.rejects(cli(['maps', '--offset', '40', '--revision', first.revision]), /list changed/);
    assert.equal((await cli(['status'])).maps.length, 20);
  } finally { await app.close(); }
});
