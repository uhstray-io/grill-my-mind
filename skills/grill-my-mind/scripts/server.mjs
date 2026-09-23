import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir, open, unlink } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { Store, Problem, publicMap, atomicJson } from './store.mjs';

const assets = fileURLToPath(new URL('../assets/', import.meta.url));
export async function startServer({ workspace = process.cwd(), port = 4317, dataDirectory } = {}) {
  workspace = path.resolve(workspace);
  const runtime = path.join(workspace, '.grill-my-mind');
  await mkdir(runtime, { recursive: true });
  const lockPath = path.join(runtime, 'server.lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = JSON.parse(await readFile(lockPath, 'utf8'));
    if (!Number.isInteger(existing.pid) || existing.pid <= 0) throw new Error('Invalid server lock. Inspect .grill-my-mind/server.lock before starting another server.');
    try { process.kill(existing.pid, 0); throw new Error('A server already owns this workspace. Use the existing URL shown by the CLI status command.'); }
    catch (probe) {
      if (probe.code !== 'ESRCH') throw probe;
      await unlink(lockPath); // The recorded process no longer exists.
      lock = await open(lockPath, 'wx');
    }
  }
  await lock.writeFile(JSON.stringify({ pid: process.pid })); await lock.close();
  const connectionPath = path.join(runtime, 'connection.json');
  const token = randomBytes(32).toString('hex');
  const store = new Store(dataDirectory || path.join(workspace, 'ideas'));
  let address, lastSeen = 0, worker = '', closing = false;
  try { await store.recover(); } catch (error) { await unlink(lockPath); throw error; }
  const send = (res, status, data) => {
    if (!res.writableEnded) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      if (req.headers.host !== new URL(address).host) throw new Problem('Unexpected host.', 403);
      if (req.headers.origin && req.headers.origin !== address) throw new Problem('Cross-origin requests are not allowed.', 403);
      if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) throw new Problem('Cross-site requests are not allowed.', 403);
      const url = new URL(req.url, address);
      if (req.method === 'GET' && url.pathname === '/api/session') return send(res, 200, { token, workspace: path.basename(workspace), workspacePath: workspace, skillPath: fileURLToPath(new URL('../SKILL.md', import.meta.url)), dataDirectory: store.directory });
      if (url.pathname.startsWith('/api/')) {
        if (req.headers.authorization !== `Bearer ${token}`) throw new Problem('Open the workspace again to reconnect.', 401);
        if (req.method === 'GET' && url.pathname === '/api/maps') return send(res, 200, { maps: await store.list(), bridge: { listening: Date.now() - lastSeen < 40000, worker } });
        const match = url.pathname.match(/^\/api\/maps\/([a-z0-9-]+)(?:\/(action|result|fail))?$/);
        if (req.method === 'GET' && match && !match[2]) return send(res, 200, publicMap(await store.get(match[1])));
        if (req.method === 'GET' && url.pathname === '/api/next') {
          worker = (url.searchParams.get('worker') || 'agent').slice(0, 100);
          const wait = Math.max(0, Math.min(25, Number(url.searchParams.get('wait')) || 0));
          const deadline = Date.now() + wait * 1000;
          do {
            if (res.destroyed || closing) return;
            lastSeen = Date.now();
            const packet = await store.claim(worker, url.searchParams.get('map') || undefined);
            if (packet) return send(res, 200, packet);
            if (Date.now() >= deadline) break;
            await new Promise(resolve => setTimeout(resolve, 500));
          } while (!closing);
          return send(res, 200, { idle: true, message: 'No activated branches. Do not analyze the map again while waiting.' });
        }
        if (req.method !== 'POST') throw new Problem('Route not found.', 404);
        if (!req.headers['content-type']?.startsWith('application/json')) throw new Problem('Use application/json.', 415);
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 180000) throw new Problem('Request is too large.', 413); }
        let body; try { body = JSON.parse(raw); } catch { throw new Problem('Invalid JSON.'); }
        if (url.pathname === '/api/maps') return send(res, 201, publicMap(await store.create(body)));
        if (url.pathname === '/api/demo') return send(res, 201, publicMap(await store.demo()));
        if (match?.[2] === 'action') return send(res, 200, publicMap(await store.action(match[1], body)));
        if (match?.[2] === 'result') return send(res, 200, publicMap(await store.complete(match[1], body.jobId, body.claimKey, body.result)));
        if (match?.[2] === 'fail') return send(res, 200, publicMap(await store.fail(match[1], body.jobId, body.claimKey, body.reason)));
        throw new Problem('Route not found.', 404);
      }
      const names = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css', '/favicon.svg': 'favicon.svg' };
      if (process.env.NODE_ENV !== 'production') {
        if (['constellation', 'paths'].includes(url.searchParams.get('variant'))) names['/'] = 'prototype.html';
        names['/prototype.js'] = 'prototype.js';
        names['/prototype.css'] = 'prototype.css';
      }
      if (req.method !== 'GET' || !names[url.pathname]) throw new Problem('Page not found.', 404);
      const file = names[url.pathname];
      const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml' };
      res.writeHead(200, { 'Content-Type': `${types[file.split('.').pop()]}; charset=utf-8`, 'Cache-Control': 'no-cache' });
      res.end(await readFile(path.join(assets, file)));
    } catch (error) { send(res, error.status || 500, { error: error.message }); }
  });
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
    address = `http://127.0.0.1:${server.address().port}`;
    await atomicJson(connectionPath, { address, token, pid: process.pid, workspace, dataDirectory: store.directory });
  } catch (error) { server.close(); await unlink(lockPath); throw error; }
  async function close() {
    if (closing) return; closing = true;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    await store.tail;
    await unlink(connectionPath); await unlink(lockPath);
  }
  return { address, store, close };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : args[i + 1]; };
  if (args.includes('--help')) {
    console.log('node server.mjs [--workspace PATH] [--port 4317]\nStarts a local workspace. Keep this process running.');
  } else {
    try {
      const app = await startServer({ workspace: option('--workspace', process.cwd()), port: Number(option('--port', 4317)) });
      console.log(`Grill My Mind is ready at ${app.address}\nSaved maps: ${app.store.directory}\nAgent bridge: waiting for the invoking agent. No model runs automatically.`);
      for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => app.close().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); }));
    } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
