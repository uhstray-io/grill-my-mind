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

test('targeted reads label superseded questions and keep actual earlier answers', () => {
  const map = fixture();
  const at = '2026-10-29T12:00:00.000Z';
  map.nodes[0].questions = [{ id: 'answered', text: 'Who owns the data?', answer: 'The participants.', supersededAt: at },
    { id: 'superseded', text: 'How do offline conflicts merge?', answer: null, supersededAt: at },
    { id: 'current', text: 'Who can join?', answer: null }];
  const oldAnswer = contextExcerpt(map, 'node-test', { section: 'questions', question: 'answered' });
  assert.match(oldAnswer.excerpt, /Answer: The participants\./);
  assert.match(oldAnswer.excerpt, /Superseded: 2026-10-29/);
  const oldQuestion = contextExcerpt(map, 'node-test', { section: 'questions', question: 'superseded' });
  assert.match(oldQuestion.excerpt, /no answer recorded/);
  assert.doesNotMatch(oldQuestion.excerpt, /Awaiting answer/);
  assert.match(contextExcerpt(map, 'node-test', { section: 'questions', question: 'current' }).excerpt, /Awaiting answer/);
});

test('findings pages expose saved provenance and stale state without altering the text', () => {
  const map = fixture(), node = map.nodes[0];
  node.status = 'interrupted'; node.stale = true;
  map.jobs.push({ nodeId: node.id, status: 'completed', result: { summary: node.summary, body: node.body } });
  let page = contextExcerpt(map, node.id, { section: 'findings', limit: 6000 });
  assert.equal(page.contentKind, 'findings');
  assert.equal(page.stale, true);
  assert.equal(page.status, 'interrupted');
  assert.equal(page.reviewState, 'unreviewed');
  assert.equal(page.excerpt, node.body.slice(0, 6000));
  node.prompt = node.body = node.summary = 'A new user premise.'; node.stale = false;
  page = contextExcerpt(map, node.id, { section: 'findings' });
  assert.equal(page.contentKind, 'premise');
  assert.equal(page.stale, false);
  assert.equal(page.excerpt, 'A new user premise.');
});
