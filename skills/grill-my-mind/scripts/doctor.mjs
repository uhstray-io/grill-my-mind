import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, readdir, stat, access } from 'node:fs/promises';

const skillDirectory = fileURLToPath(new URL('../', import.meta.url));
const runtimePath = workspace => path.join(workspace, '.grill-my-mind');

// Never send the local bearer token to an address supplied by an unchecked file.
export async function readConnection(workspace) {
  let value;
  try { value = JSON.parse(await readFile(path.join(runtimePath(workspace), 'connection.json'), 'utf8')); }
  catch (error) {
    const problem = new Error(error.code === 'ENOENT' ? 'No connection for this workspace. Run doctor, then start server.mjs with this --workspace.' : 'Cannot read this workspace connection file. Run doctor for recovery guidance.');
    problem.code = error.code === 'ENOENT' ? 'missing' : 'invalid';
    throw problem;
  }
  let address;
  try { address = new URL(value.address); } catch { /* The safe validation error below replaces raw input. */ }
  if (!address || address.protocol !== 'http:' || address.hostname !== '127.0.0.1' || !address.port || address.username || address.password || address.search || address.hash || address.pathname !== '/' || typeof value.token !== 'string' || !/^[a-f0-9]{64}$/.test(value.token) || typeof value.workspace !== 'string' || !path.isAbsolute(value.workspace)) {
    throw Object.assign(new Error('Invalid local connection settings. Run doctor; connection credentials were not sent.'), { code: 'invalid' });
  }
  const recordedWorkspace = path.resolve(value.workspace);
  const currentWorkspace = path.resolve(workspace);
  const sameWorkspace = process.platform === 'win32' ? recordedWorkspace.toLowerCase() === currentWorkspace.toLowerCase() : recordedWorkspace === currentWorkspace;
  if (!sameWorkspace) throw Object.assign(new Error('This connection belongs to another workspace location. Start the server from the current workspace; copied runtime files cannot reconnect it.'), { code: 'workspace-mismatch' });
  return { ...value, address: address.origin };
}

async function inspectLock(workspace) {
  try {
    const lock = JSON.parse(await readFile(path.join(runtimePath(workspace), 'server.lock'), 'utf8'));
    if (!Number.isInteger(lock.pid) || lock.pid <= 0) return { state: 'invalid' };
    try { process.kill(lock.pid, 0); return { state: 'process-present', pid: lock.pid }; }
    catch (error) { return { state: error.code === 'ESRCH' ? 'process-absent' : 'unknown', pid: lock.pid }; }
  } catch (error) { return { state: error.code === 'ENOENT' ? 'absent' : 'invalid' }; }
}

export async function diagnose({ workspace = process.cwd(), timeout = 2500 } = {}) {
  workspace = path.resolve(workspace);
  const checks = [];
  const add = (name, status, message) => checks.push({ name, status, message });
  const nodeSupported = Number(process.versions.node.split('.')[0]) >= 20;
  add('node', nodeSupported ? 'ok' : 'error', `Node ${process.versions.node}; Node 20+ is required.`);
  let workspaceExists = false;
  try { workspaceExists = (await stat(workspace)).isDirectory(); } catch { /* Report missing/inaccessible without raw errors. */ }
  add('workspace', workspaceExists ? 'ok' : 'error', workspaceExists ? 'Workspace directory is accessible.' : 'Use an existing, accessible workspace directory.');
  const files = ['SKILL.md', 'scripts/server.mjs', 'scripts/store.mjs', 'scripts/context.mjs', 'scripts/brief.mjs', 'scripts/cli.mjs', 'scripts/doctor.mjs', 'references/bridge.md', 'references/exploration.md', 'references/format.md', 'assets/index.html', 'assets/app.js', 'assets/graph.js', 'assets/history.js', 'assets/workspace-view.js', 'assets/style.css', 'assets/constellation.css'];
  const missing = [];
  for (const file of files) try { await access(path.join(skillDirectory, file)); } catch { missing.push(file); }
  add('package', missing.length ? 'error' : 'ok', missing.length ? `Restore the complete skill package; missing: ${missing.join(', ')}.` : 'Skill scripts, references, and browser assets are accessible.');
  let savedMaps = 0;
  try { savedMaps = (await readdir(path.join(workspace, 'ideas'), { withFileTypes: true })).filter(entry => entry.isDirectory() && /^map-[a-f0-9]{8}$/.test(entry.name)).length; }
  catch (error) { if (error.code !== 'ENOENT') add('maps', 'warning', 'Saved-map directory could not be inspected.'); }
  const lock = await inspectLock(workspace);
  const result = { ready: false, state: 'not-started', workspace, skillDirectory, savedMaps, lock, checks,
    start: { executable: process.execPath, args: [path.join(skillDirectory, 'scripts/server.mjs'), '--workspace', workspace, '--port', '0'] },
    note: 'Read-only diagnostics. No server was started, files changed, or model/provider connection tested.' };
  let connection;
  try { connection = await readConnection(workspace); }
  catch (error) {
    result.state = error.code === 'missing' ? 'not-started' : error.code;
    add('connection', error.code === 'missing' ? 'info' : 'error', error.message);
    result.nextStep = error.code === 'missing' ? 'Start the server with the start arguments in a persistent process, then rerun doctor.' : 'Use the current workspace path. If its runtime files were copied or became invalid, stop the owning workspace server and resolve those local runtime files before restarting; saved ideas do not need replacement.';
  }
  if (connection) {
    result.address = connection.address;
    try {
      const response = await fetch(`${connection.address}/api/maps`, { headers: { Authorization: `Bearer ${connection.token}` }, redirect: 'error', signal: AbortSignal.timeout(timeout) });
      if (response.status === 401 || response.status === 403) {
        result.state = 'unauthorized';
        add('connection', 'error', 'The running server rejected the saved connection. Credentials were not printed.');
        result.nextStep = 'Restart the workspace server through its owning session, then rerun doctor.';
      } else if (!response.ok) {
        result.state = 'server-error';
        add('connection', 'error', `The local server returned HTTP ${response.status}.`);
        result.nextStep = 'Inspect the owning server terminal, resolve the reported failure, and rerun doctor.';
      } else {
        const value = await response.json();
        if (!Array.isArray(value.maps) || !value.bridge || typeof value.bridge.listening !== 'boolean') throw new Error('Unexpected server response.');
        result.state = 'ready';
        result.ready = nodeSupported && workspaceExists && !missing.length;
        result.savedMaps = value.maps.length;
        result.bridge = { listening: value.bridge.listening };
        add('connection', 'ok', 'The authenticated local bridge responds.');
        result.nextStep = value.bridge.listening ? 'Open the address or select a saved map with the maps command.' : 'Open the address, select a saved map if needed, and use next to listen for activated work.';
      }
    } catch {
      result.state = 'unreachable';
      add('connection', 'error', 'The saved local server did not return a valid bridge response.');
      result.nextStep = 'Check the owning server process. If it has stopped, start it with this workspace and rerun doctor; do not kill an unrelated process based only on a reused PID.';
    }
  }
  if (lock.state === 'invalid' || (!result.ready && ['process-present', 'unknown'].includes(lock.state))) {
    add('lock', 'warning', 'A local lock needs inspection before another server starts. Doctor does not remove locks or stop processes.');
  }
  if (!nodeSupported || !workspaceExists || missing.length) result.nextStep = 'Resolve the node, workspace, or package errors above before starting or resuming.';
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--workspace');
  const workspace = index < 0 ? process.cwd() : process.argv[index + 1];
  if (index >= 0 && (!workspace || workspace.startsWith('--'))) { console.error('--workspace requires a path.'); process.exitCode = 1; }
  else console.log(JSON.stringify(await diagnose({ workspace }), null, 2));
}
