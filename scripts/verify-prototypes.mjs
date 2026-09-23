// Static checks for the two saved HTML snapshots. Does not execute their scripts.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const files = ['01-constellation.html', '02-original-map.html'];
const results = [];
for (const file of files) {
  const html = await readFile(new URL(`../prototypes/${file}`, import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];
  const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)];
  assert.equal(scripts.length, 1, `${file}: expected one bundled script`);
  assert.equal(styles.length, 1, `${file}: expected one bundled stylesheet`);
  assert(!/\bsrc\s*=/i.test(scripts[0][1]), `${file}: external script`);
  new vm.Script(scripts[0][2], { filename: file });

  const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  assert(/<!doctype html>/i.test(markup), `${file}: missing HTML doctype`);
  assert(/<meta\b[^>]*charset="utf-8"/i.test(markup), `${file}: missing UTF-8 declaration`);
  assert(/connect-src 'none'/.test(markup), `${file}: network connections are not disabled`);
  assert(!/<(?:iframe|object|embed)\b/i.test(markup), `${file}: embedded external content`);
  assert(!/\bsrcset\s*=|http-equiv="refresh"/i.test(markup), `${file}: indirect resource loading`);
  for (const ref of markup.matchAll(/\b(?:src|href|action|poster|data)\s*=\s*(["'])(.*?)\1/gi)) {
    assert(/^(?:#|data:)/.test(ref[2]), `${file}: non-inline resource reference ${ref[2]}`);
  }
  const css = styles[0][1];
  assert(!/@import\b/i.test(css), `${file}: stylesheet import`);
  for (const ref of css.matchAll(/url\(\s*["']?([^)'"\s]+)/gi)) {
    assert(/^(?:#|data:)/.test(ref[1]), `${file}: external CSS resource ${ref[1]}`);
  }
  const js = scripts[0][2];
  assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|importScripts|require|sendBeacon)\s*\(/.test(js), `${file}: network or external-code API`);
  assert(!/\bimport\s*(?:\(|["'{*])|\bimport\s+\w+\s+from\b/.test(js), `${file}: JavaScript import`);
  assert(!/\b(?:localStorage|sessionStorage|indexedDB|serviceWorker)\b/.test(js), `${file}: persistent browser storage dependency`);
  assert(!/\b(?:eval|Function)\s*\(/.test(js), `${file}: dynamic code evaluation`);

  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate static HTML IDs`);
  const declaredIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const selector of js.matchAll(/\$\('#([a-zA-Z][\w-]*)'\)/g)) {
    assert(declaredIds.has(selector[1]), `${file}: missing element #${selector[1]}`);
  }
  if (file.startsWith('01-')) {
    assert(/variant = 'constellation'/.test(js), `${file}: constellation is not fixed`);
    assert(!/\bswitchVariant\b/.test(js), `${file}: rejected variant remains selectable`);
  }
  results.push({ file, bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex'), result: 'PASS' });
}
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), node: process.version, command: `node ${fileURLToPath(import.meta.url)}`, scope: 'Static JavaScript compilation and known resource/dependency patterns; no browser execution, rendering, or CSS syntax validation.', results }, null, 2));
