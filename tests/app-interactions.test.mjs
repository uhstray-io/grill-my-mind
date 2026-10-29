import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const app = await readFile(new URL('../skills/grill-my-mind/assets/app.js', import.meta.url), 'utf8');
function between(start, end) {
  const from = app.indexOf(start), to = app.indexOf(end, from);
  assert.ok(from >= 0 && to > from, 'The actual UI callback boundaries must remain available.');
  return app.slice(from, to);
}
const callbacks = between('function renderDetail(', '\nfunction act(') + '\n' +
  between("$('#detail').addEventListener('submit'", "\n$('#zoom-in')");

// Execute the real callbacks with DOM/API boundaries replaced. This verifies control
// replacement decisions, not browser-native undo or IME behavior itself.
function harness() {
  const node = id => ({ id, kind: 'research', title: id, summary: 'Saved premise', body: 'Saved premise',
    status: 'suggested', reviewState: 'unreviewed', questions: [], sources: [] });
  const state = { map: { id: 'map-a' }, selected: 'node-a', historyStep: null,
    visibleMap: { nodes: [node('node-a'), node('node-b')], edges: [], jobs: [] },
    editors: {}, drafts: { 'node-a-title': 'Submitted title', 'node-a-branch': 'Submitted body' }, bridge: {} };
  const document = { activeElement: null };
  let writes = 0, submit, complete;
  const detail = { dataset: { nodeId: 'node-a', history: 'false' }, scrollTop: 0,
    contains: element => !!element && element.owner === detail,
    querySelectorAll: () => [],
    addEventListener: (event, callback) => { if (event === 'submit') submit = callback; },
    set innerHTML(value) { writes++; document.activeElement = null; } };
  const focusDraft = (key, value) => {
    state.drafts[key] = value;
    const field = { owner: detail, dataset: { draft: key }, selectionStart: 2, selectionEnd: 2 };
    document.activeElement = field;
    return field;
  };
  focusDraft('node-a-title', 'Submitted title');
  const pending = new Promise(resolve => { complete = resolve; });
  const context = vm.createContext({ state, document, $: () => detail,
    glyphs: { research: 'x' }, esc: String, prose: String, presentation: () => ({ label: 'Unexplored' }),
    act: () => pending, toast: () => {}, FormData: class {
      constructor(form) { this.entries = form.entries; }
      [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
    } });
  vm.runInContext(callbacks, context);
  const button = { disabled: false };
  const form = { id: 'suggest-form', dataset: { nodeId: 'node-a' },
    entries: [['title', 'Submitted title'], ['body', 'Submitted body']],
    querySelectorAll: () => ['node-a-title', 'node-a-branch'].map(key => ({ dataset: { draft: key } })) };
  return { state, document, detail, button, complete, focusDraft, render: context.renderDetail,
    writes: () => writes, submit: () => submit({ preventDefault() {}, target: form, submitter: button }) };
}

test('polling preserves an active draft control and renders deferred detail after focus leaves', () => {
  const h = harness(), field = h.document.activeElement;
  h.render();
  assert.equal(h.writes(), 0);
  assert.equal(h.document.activeElement, field);
  assert.equal(h.state.detailDeferred, true);
  h.document.activeElement = null;
  h.render();
  assert.equal(h.writes(), 1);
  assert.equal(h.state.detailDeferred, false);
});

test('selection and history changes bypass draft rendering deferral', () => {
  for (const change of [h => { h.state.selected = 'node-b'; }, h => { h.state.historyStep = 0; }]) {
    const h = harness();
    change(h); h.render();
    assert.equal(h.writes(), 1);
    assert.equal(h.state.detailDeferred, false);
    assert.equal(h.detail.dataset.history, String(h.state.historyStep !== null));
  }
});

test('a successful submission clears its drafts and forces detail cleanup on the same node', async () => {
  const h = harness(), saving = h.submit();
  assert.equal(h.button.disabled, true);
  h.complete(true); await saving;
  assert.equal(h.state.drafts['node-a-title'], undefined);
  assert.equal(h.state.drafts['node-a-branch'], undefined);
  assert.equal(h.writes(), 1);
  assert.equal(h.button.disabled, false);
});

test('a pending submission cannot replace the active draft after node or map navigation', async () => {
  for (const differentMap of [false, true]) {
    const h = harness(), saving = h.submit();
    // Keeping the same selected ID across maps independently exercises the map guard.
    if (differentMap) h.state.map = { id: 'map-b' };
    else h.state.selected = 'node-b';
    h.detail.dataset.nodeId = h.state.selected;
    const key = `${h.state.selected}-revision`, field = h.focusDraft(key, 'New unsaved draft');
    h.complete(true); await saving;
    assert.equal(h.writes(), 0);
    assert.equal(h.document.activeElement, field);
    assert.equal(h.state.drafts[key], 'New unsaved draft');
    assert.equal(h.button.disabled, false);
  }
});

test('a pending submission can finish after navigation to the welcome screen', async () => {
  const h = harness(), saving = h.submit();
  h.state.map = null; h.state.visibleMap = null; h.state.selected = null;
  h.document.activeElement = null;
  h.complete(true); await saving;
  assert.equal(h.writes(), 0);
  assert.equal(h.state.drafts['node-a-title'], undefined);
  assert.equal(h.button.disabled, false);
});

test('failed submissions keep the active draft and do not force rendering', async () => {
  const h = harness(), field = h.document.activeElement, saving = h.submit();
  h.complete(false); await saving;
  assert.equal(h.writes(), 0);
  assert.equal(h.document.activeElement, field);
  assert.equal(h.state.drafts['node-a-title'], 'Submitted title');
  assert.equal(h.button.disabled, false);
});
