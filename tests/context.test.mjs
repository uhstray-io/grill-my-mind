import test from 'node:test';
import assert from 'node:assert/strict';
import { contextExcerpt } from '../skills/grill-my-mind/scripts/context.mjs';

function fixture() {
  return { id: 'map-test', revision: 17, jobs: [], edges: [], nodes: [{ id: 'node-test', title: 'Context fixture', status: 'explored', reviewState: 'unreviewed', prompt: 'Offline notes.', summary: 'A concise finding.', body: 'Long findings. '.repeat(2000), sources: [],
    questions: Array.from({ length: 30 }, (_, i) => ({ id: `q-${i}`, text: i ? `Later question ${i}` : 'Original privacy constraint?', answer: i ? 'Unrelated answer. '.repeat(100) : 'The fixture must never upload private notes.' })) }] };
}

test('targeted question retrieval finds early constraints without loading later history', () => {
  const map = fixture();
  const page = contextExcerpt(map, 'node-test', { section: 'questions', query: 'privacy constraint' });
  assert.equal(page.totalRecords, 30); assert.equal(page.matchingRecords, 1);
  assert.match(page.excerpt, /never upload private notes/); assert.doesNotMatch(page.excerpt, /Later question/);
  assert.equal(page.nextOffset, null); assert.ok(JSON.stringify(page).length < 800);
  assert.equal(contextExcerpt(map, 'node-test', { section: 'questions', question: 'q-0' }).excerpt, page.excerpt);
  assert.equal(contextExcerpt(map, 'node-test', { section: 'sources', query: 'absent' }).matchingRecords, 0);
});

test('pages reconstruct long evidence exactly and reject stale or invalid continuation', () => {
  const map = fixture();
  map.nodes[0].body = 'Unicode 🧠 and escaped text: "\\\n'.repeat(1200);
  let offset = 0, combined = '', calls = 0;
  do {
    const page = contextExcerpt(map, 'node-test', { section: 'findings', offset, revision: map.revision, limit: 6000 });
    assert.ok(JSON.stringify(page, null, 2).length <= 8000);
    combined += page.excerpt; offset = page.nextOffset; calls++;
  } while (offset !== null);
  assert.equal(combined, map.nodes[0].body); assert.ok(calls > 1);
  for (const options of [{ offset: 2 }, { revision: 16 }, { limit: 7000 }, { offset: -1 }, { section: 'secrets' }]) {
    assert.throws(() => contextExcerpt(map, 'node-test', options));
  }
  const before = structuredClone(map);
  contextExcerpt(map, 'node-test', { section: 'questions', query: 'privacy' });
  assert.deepEqual(map, before);
});
