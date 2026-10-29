import test from 'node:test';
import assert from 'node:assert/strict';
import { mapBrief } from '../skills/grill-my-mind/scripts/brief.mjs';

const node = (id, extras = {}) => ({ id, title: id, parentId: null, prompt: 'Consider a choice.', summary: 'A provisional observation.',
  body: 'Detailed evidence.', status: 'explored', reviewState: 'unreviewed', questions: [], sources: [], ...extras });
const fixture = () => ({ id: 'map-test', title: 'A project', rootId: 'root', originalIdea: 'An idea', revision: 6,
  nodes: [node('root'), node('accepted', { parentId: 'root', reviewState: 'accepted' }), node('stale', { parentId: 'root', reviewState: 'accepted', stale: true }),
    node('question', { parentId: 'root', status: 'awaiting-answer', questions: [{ id: 'q1', text: 'Who decides?', answer: null }, { id: 'q0', text: 'Budget?', answer: 'Under $50.' }] }),
    node('suggestion', { parentId: 'question', status: 'suggested', kind: 'risk' })],
  edges: [{ from: 'accepted', to: 'stale', type: 'contradicts' }], jobs: [{ claimKey: 'do-not-export' },
    { nodeId: 'question', status: 'completed', result: { body: 'Detailed evidence.', summary: 'A provisional observation.' } }], view: {} });

test('brief separates accepted, stale, provisional and unanswered material without changing the map', () => {
  const map = fixture(), before = structuredClone(map), brief = mapBrief(map);
  const section = id => brief.sections.find(s => s.id === id);
  assert.equal(brief.counts.accepted, 1);
  assert.deepEqual(section('accepted').items.map(n => n.nodeId), ['accepted']);
  assert.deepEqual(section('stale').items.map(n => n.nodeId), ['stale']);
  assert.deepEqual(section('findings').items.map(n => n.nodeId), ['root', 'question']);
  assert.equal(section('questions').items[0].questionId, 'q1');
  assert.match(section('answers').items[0].text, /Under \$50/);
  assert.equal(section('relationships').items[0].relation, 'contradicts');
  assert.doesNotMatch(JSON.stringify(brief), /do-not-export/);
  assert.deepEqual(map, before);
});

test('branch briefs include descendants and preserve external semantic relationships', () => {
  const brief = mapBrief(fixture(), 'question');
  assert.equal(brief.counts.nodes, 2);
  assert.equal(brief.sections.find(s => s.id === 'accepted').total, 0);
  assert.equal(brief.sections.find(s => s.id === 'directions').items[0].nodeId, 'suggestion');
  assert.equal(mapBrief(fixture(), 'accepted').sections.find(s => s.id === 'relationships').total, 1);
  assert.throws(() => mapBrief(fixture(), 'missing'), /Node not found/);
});

test('large escaped briefs remain bounded and expose omissions, including late questions', () => {
  const map = fixture();
  map.nodes = Array.from({ length: 1000 }, (_, i) => node(`node-${i}`, { title: '<\\"\n'.repeat(25), summary: '<\\"\n'.repeat(200),
    kind: 'risk', status: 'awaiting-answer', questions: [{ id: `q-${i}`, text: '<\\"\n'.repeat(200), answer: null }] }));
  const brief = mapBrief(map);
  assert.ok(JSON.stringify(brief, null, 2).length <= 24000);
  const questions = brief.sections.find(s => s.id === 'questions');
  assert.equal(questions.total, 1000);
  assert.equal(questions.items.length + questions.omitted, 1000);
  assert.match(brief.markdown, /more records omitted/);
});

test('exported map text is literal Markdown data rather than executable HTML or image links', () => {
  const map = fixture();
  map.originalIdea = '<img src="https://example.invalid/pixel">\n![tracking](https://example.invalid/image)';
  const brief = mapBrief(map);
  assert.ok(brief.markdown.includes('\\<img'));
  assert.ok(brief.markdown.includes('!\\[tracking\\]'));
  assert.equal(brief.originalIdea, map.originalIdea);
});

test('partial findings survive question pauses and continuation; long questions cannot swallow answers', () => {
  const map = fixture();
  const partial = map.nodes.find(n => n.id === 'question');
  partial.questions[1].text = 'A long clarification. '.repeat(70);
  partial.questions[1].answer = 'Keep the observations on the device until explicit export.';
  let brief = mapBrief(map);
  assert.equal(brief.sections.find(s => s.id === 'answers').items[0].text, partial.questions[1].answer);
  assert.match(brief.markdown, /Keep the observations on the device/);
  for (const status of ['queued', 'running', 'interrupted']) {
    partial.status = status;
    map.jobs.push({ nodeId: partial.id, status: 'completed', result: { body: partial.body, summary: partial.summary } });
    brief = mapBrief(map);
    assert.ok(brief.sections.find(s => s.id === 'findings').items.some(n => n.nodeId === partial.id));
  }
  partial.prompt = partial.body = partial.summary = 'A revised premise, not findings.';
  assert.ok(!mapBrief(map).sections.find(s => s.id === 'findings').items.some(n => n.nodeId === partial.id));
});

test('a revised paused premise remains visible without being presented as current findings', () => {
  const map = fixture();
  const paused = map.nodes.find(n => n.id === 'question');
  paused.prompt = paused.body = paused.summary = 'Instead, explore a neighborhood library.';
  const brief = mapBrief(map);
  assert.ok(!brief.sections.find(s => s.id === 'findings').items.some(n => n.nodeId === paused.id));
  const premise = brief.sections.find(s => s.id === 'premises').items.find(n => n.nodeId === paused.id);
  assert.equal(premise.text, paused.prompt);
  assert.equal(premise.status, 'awaiting-answer');
  assert.match(brief.markdown, /Current premises — not findings/);
  assert.match(brief.markdown, /Instead, explore a neighborhood library/);
});

test('superseded questions remain retrievable without asking the user to answer them again', () => {
  const map = fixture();
  const paused = map.nodes.find(n => n.id === 'question');
  paused.questions[0].supersededAt = '2026-10-29T12:00:00.000Z';
  paused.questions.push({ id: 'q2', text: 'What does the new premise need?', answer: null });
  const brief = mapBrief(map);
  assert.deepEqual(brief.sections.find(s => s.id === 'questions').items.map(q => q.questionId), ['q2']);
  const old = brief.sections.find(s => s.id === 'superseded').items[0];
  assert.equal(old.questionId, 'q1');
  assert.equal(old.question, 'Who decides?');
  assert.equal(old.text, 'No answer was recorded.');
  assert.equal(old.supersededAt, paused.questions[0].supersededAt);
  assert.match(brief.markdown, /Earlier questions and answers — previous premises/);
  assert.equal(brief.sections.find(s => s.id === 'answers').items[0].text, 'Under $50.');
});

test('answers from a changed premise retain their actual wording with historical context', () => {
  const map = fixture();
  const paused = map.nodes.find(n => n.id === 'question');
  const answer = paused.questions.find(q => q.answer);
  answer.supersededAt = '2026-10-29T12:00:00.000Z';
  const brief = mapBrief(map);
  assert.equal(brief.sections.find(s => s.id === 'answers').total, 0);
  const historical = brief.sections.find(s => s.id === 'superseded').items[0];
  assert.equal(historical.questionId, answer.id);
  assert.equal(historical.question, answer.text);
  assert.equal(historical.text, answer.answer);
  assert.equal(historical.supersededAt, answer.supersededAt);
});
