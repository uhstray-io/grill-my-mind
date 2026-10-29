import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : path.join(directory, entry.name)))).flat();
}
const files = (await Promise.all(['scripts', 'tests', 'skills/grill-my-mind'].map(dir => walk(path.join(root, dir))))).flat();
for (const file of files.filter(file => /\.(mjs|js)$/.test(file))) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
const skillFile = path.join(root, 'skills/grill-my-mind/SKILL.md');
const skill = await readFile(skillFile, 'utf8');
if (!/^---\r?\nname: grill-my-mind\r?\ndescription: [^\r\n]+\r?\n---/.test(skill)) throw new Error('Skill requires the supported plain name and description frontmatter.');
for (const match of skill.matchAll(/\]\((references\/[^)]+)\)/g)) await access(path.join(path.dirname(skillFile), match[1]));
console.log('JavaScript syntax, skill metadata, and entrypoint reference paths passed.');
