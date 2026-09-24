import path from 'node:path';
import { readFile, mkdir, appendFile } from 'node:fs/promises';
import { atomicJson } from './store.mjs';

const args = process.argv.slice(2);
const command = args[0] || 'help';
const option = (name, fallback) => { const i = args.indexOf(`--${name}`); return i < 0 ? fallback : args[i + 1]; };
const required = name => { const value = option(name); if (!value) throw new Error(`--${name} is required.`); return value; };
const workspace = path.resolve(option('workspace', process.cwd()));
const runtime = path.join(workspace, '.grill-my-mind');
const usage = `Grill My Mind agent bridge (Node 20+)\n\nCommands:\n  status\n  create --file idea.json                 {title, idea}\n  next --wait 25 --worker codex [--map ID]\n  result --job ID --file findings.json     {summary, body, questions?, suggestions?, sources?, links?}\n  fail --job ID --reason "..."\n  read --map ID [--node ID --section summary|premise|findings|questions|sources|relationships]\n       [--query TEXT | --question ID] [--offset N --revision N] [--limit 4000]\n  usage [--map ID]                       Recorded CLI output sizes, not model tokens\n  act --map ID --file action.json         Requires expectedRevision\n\nAll commands accept --workspace PATH. Active server required.\nOnly user-activated jobs are returned. Claims are saved locally for result delivery.\nread returns an overview or a bounded section excerpt. Continue with nextOffset and revision.`;
try {
  if (command === 'help' || args.includes('--help')) { console.log(usage); }
  else {
    let connection;
    try { connection = JSON.parse(await readFile(path.join(runtime, 'connection.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') throw new Error('Start server.mjs for this workspace first.'); throw error; }
    async function api(route, data) {
      const response = await fetch(connection.address + route, { method: data ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${connection.token}`, ...(data ? { 'Content-Type': 'application/json' } : {}) },
        ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(35000) });
      const value = await response.json(); if (!response.ok) throw new Error(value.error); return value;
    }
    const input = async () => JSON.parse(await readFile(path.resolve(required('file')), 'utf8'));
    const claimPath = jobId => {
      if (!/^job-[a-f0-9]{8}$/.test(jobId)) throw new Error('Invalid job identifier.');
      return path.join(runtime, 'claims', `${jobId}.json`);
    };
    let output;
    switch (command) {
      case 'status': output = { address: connection.address, ...(await api('/api/maps')) }; break;
      case 'create': { const m = await api('/api/maps', await input()); output = { mapId: m.id, rootId: m.rootId, revision: m.revision }; break; }
      case 'next': {
        const query = new URLSearchParams({ wait: option('wait', '0'), worker: option('worker', 'agent') });
        if (option('map')) query.set('map', option('map'));
        output = await api(`/api/next?${query}`);
        if (output.jobId) {
          await mkdir(path.join(runtime, 'claims'), { recursive: true });
          await atomicJson(claimPath(output.jobId), { mapId: output.mapId, jobId: output.jobId, claimKey: output.claimKey });
          delete output.claimKey; // The agent does not need to carry this in its context.
        }
        break;
      }
      case 'result': case 'fail': {
        const claim = JSON.parse(await readFile(claimPath(required('job')), 'utf8'));
        const payload = command === 'result' ? { ...claim, result: await input() } : { ...claim, reason: required('reason') };
        const m = await api(`/api/maps/${claim.mapId}/${command}`, payload);
        output = { saved: true, mapId: m.id, revision: m.revision, job: m.jobs.find(j => j.id === claim.jobId)?.status,
          stale: m.jobs.find(j => j.id === claim.jobId)?.stale || false };
        break;
      }
      case 'read': {
        if (option('node')) {
          const query = new URLSearchParams({ node: option('node') });
          for (const name of ['section', 'query', 'question', 'offset', 'limit', 'revision']) if (option(name) !== undefined) query.set(name, option(name));
          output = await api(`/api/maps/${required('map')}/context?${query}`);
          break;
        }
        const m = await api(`/api/maps/${required('map')}`);
        output = { mapId: m.id, title: m.title, revision: m.revision, nodes: m.nodes.slice(0, 40).map(n => ({ id: n.id, title: n.title, status: n.status, reviewState: n.reviewState, summary: n.summary.slice(0, 200) })), omittedNodes: Math.max(0, m.nodes.length - 40) };
        break;
      }
      case 'usage': {
        let log = '';
        try { log = await readFile(path.join(runtime, 'context-usage.jsonl'), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        const entries = log.trim() ? log.trim().split('\n').map(line => JSON.parse(line)) : [];
        const matching = option('map') ? entries.filter(e => e.mapId === option('map')) : entries;
        output = { scope: 'Recorded CLI stdout only; not vendor tokens or active context. Excludes direct file reads, browser observations, research tools, model replies, failed commands, and host compaction.',
          commands: matching.length, characters: matching.reduce((n,e) => n + e.characters, 0), utf8Bytes: matching.reduce((n,e) => n + e.utf8Bytes, 0),
          byCommand: Object.fromEntries([...new Set(matching.map(e => e.command))].map(command => [command, { calls: matching.filter(e => e.command === command).length, characters: matching.filter(e => e.command === command).reduce((n,e) => n + e.characters, 0) }])) };
        break;
      }
      case 'act': { const m = await api(`/api/maps/${required('map')}/action`, await input()); output = { saved: true, mapId: m.id, revision: m.revision }; break; }
      default: throw new Error(usage);
    }
    const rendered = JSON.stringify(output, null, 2);
    if (command !== 'usage') await appendFile(path.join(runtime, 'context-usage.jsonl'), JSON.stringify({ at: new Date().toISOString(), command, mapId: output.mapId || option('map') || null,
      characters: rendered.length + 1, utf8Bytes: Buffer.byteLength(rendered + '\n') }) + '\n');
    console.log(rendered);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
