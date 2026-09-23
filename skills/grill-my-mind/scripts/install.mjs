import { cp, access, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1]; };
const hosts = { codex: '.agents/skills', claude: '.claude/skills', copilot: '.github/skills' };
try {
  if (args.includes('--help')) console.log('node install.mjs --host codex|claude|copilot --project PATH\nCopies this complete skill to a project discovery folder. Refuses to overwrite an existing installation.');
  else {
    const host = option('host'), project = option('project');
    if (!hosts[host] || !project) throw new Error('Provide --host codex|claude|copilot and --project PATH.');
    const source = fileURLToPath(new URL('../', import.meta.url));
    const target = path.resolve(project, hosts[host], 'grill-my-mind');
    if (target === path.resolve(source) || target.startsWith(path.resolve(source) + path.sep)) throw new Error('The installation destination cannot be inside the source skill.');
    try { await access(target); throw new Error(`An installation already exists at ${target}. Review it before updating.`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { recursive: true, errorOnExist: true, force: false });
    console.log(`Installed Grill My Mind for ${host}: ${target}\nReload your agent's skill discovery if necessary. Requires Node.js 20+.`);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
