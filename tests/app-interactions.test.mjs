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
const callbacks = between('function agentListening(', '\nfunction connectionView(') + '\n' +
  between('function detailFocusKey(', '\nfunction act(') + '\n' +
  between("$('#detail').addEventListener('submit'", "\n$('#zoom-in')");

// Execute the real callbacks with DOM/API boundaries replaced. This verifies control
// replacement decisions, not browser-native undo or IME behavior itself.
function harness({ question = false } = {}) {
  const node = id => ({ id, kind: 'research', title: id, summary: 'Saved premise', body: 'Saved premise',
    status: 'suggested', reviewState: 'unreviewed', questions: [], sources: [] });
  const state = { map: { id: 'map-a' }, selected: 'node-a', historyStep: null,
    visibleMap: { nodes: [node('node-a'), node('node-b')], edges: [], jobs: [] },
    editors: {}, drafts: { 'node-a-title': 'Submitted title', 'node-a-branch': 'Submitted body' }, bridge: {} };
  const document = { activeElement: null };
  let writes = 0, submit, complete, markup = '';
  const fields = new Map(), controlSpecs = [];
  let controls = [];
  const field = (key, value, name) => ({ owner: detail, dataset: { draft: key }, value, name,
    readOnly: false, selectionStart: 2, selectionEnd: 2,
    focus() { document.activeElement = this; }, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; } });
  const control = spec => ({ owner: detail, dataset: {}, ...spec,
    getAttribute(name) { return this[name] ?? null; },
    closest(selector) { return selector === 'form' ? this.form : this.editor; },
    focus() { document.activeElement = this; } });
  const detail = { dataset: { nodeId: 'node-a', history: 'false' }, scrollTop: 0,
    contains: element => !!element && element.owner === detail,
    querySelectorAll: selector => selector === '[data-draft]' ? [...fields.values()] : selector === 'button, a[href], summary' ? controls : [],
    addEventListener: (event, callback) => { if (event === 'submit') submit = callback; },
    focus() { document.activeElement = this; },
    set innerHTML(value) {
      writes++; markup = value; document.activeElement = null;
      for (const [key, previous] of fields) fields.set(key, field(key, state.drafts[key] ?? '', previous.name));
      controls = controlSpecs.map(control);
    } };
  const focusDraft = (key, value) => {
    state.drafts[key] = value;
    if (!fields.has(key)) fields.set(key, field(key, value));
    const current = fields.get(key); current.value = value; current.focus();
    return current;
  };
  fields.set('node-a-title', field('node-a-title', 'Submitted title', 'title'));
  fields.set('node-a-branch', field('node-a-branch', 'Submitted body', 'body'));
  focusDraft('node-a-title', 'Submitted title');
  const pending = new Promise(resolve => { complete = resolve; });
  const context = vm.createContext({ state, document, $: () => detail,
    glyphs: { research: 'x' }, esc: String, prose: String, presentation: () => ({ label: 'Unexplored' }),
    act: () => pending, toast: () => {}, FormData: class {
      constructor(form) { this.entries = form.querySelectorAll().map(field => [field.name, field.value]); }
      [Symbol.iterator]() { return this.entries[Symbol.iterator](); }
    } });
  vm.runInContext(callbacks, context);
  const button = { disabled: false };
  const submittedFields = question ? [field('question-a', 'Submitted answer', 'answer')] : [...fields.values()];
  if (question) { fields.set('question-a', submittedFields[0]); focusDraft('question-a', 'Submitted answer'); }
  const form = { id: 'suggest-form', dataset: { nodeId: 'node-a' },
    querySelectorAll: () => submittedFields };
  if (question) { form.id = ''; form.dataset.question = 'question-a'; }
  const focusControl = spec => { controlSpecs.push(spec); const current = control(spec); controls.push(current); current.focus(); return current; };
  return { state, document, detail, button, complete, focusDraft, focusControl, render: context.renderDetail,
    clearControls: () => { controlSpecs.length = 0; }, markup: () => markup,
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

test('edits made while a save is pending remain in their original focused control', async () => {
  const h = harness(), saving = h.submit();
  const current = h.focusDraft('node-a-title', 'A newer direction');
  h.complete(true); await saving;
  assert.equal(h.state.drafts['node-a-title'], 'A newer direction');
  assert.equal(h.state.drafts['node-a-branch'], undefined);
  assert.equal(h.document.activeElement, current);
  assert.equal(h.writes(), 0);
  h.document.activeElement = null; h.render();
  assert.match(h.markup(), /value="A newer direction"/);
});

test('finishing one form does not replace an active draft in another form on the same node', async () => {
  const h = harness(), saving = h.submit();
  const current = h.focusDraft('node-a-revision', 'A newly changed premise');
  h.complete(true); await saving;
  assert.equal(h.state.drafts['node-a-title'], undefined);
  assert.equal(h.state.drafts['node-a-revision'], 'A newly changed premise');
  assert.equal(h.document.activeElement, current);
  assert.equal(h.writes(), 0);
});

test('an answer cannot be edited while saving and becomes editable again on failure', async () => {
  const h = harness({ question: true }), current = h.document.activeElement, saving = h.submit();
  assert.equal(current.readOnly, true);
  h.complete(false); await saving;
  assert.equal(current.readOnly, false);
  assert.equal(h.state.drafts['question-a'], 'Submitted answer');
});

test('refresh restores keyboard focus to the same detail action, submit button, summary, or source', () => {
  const specs = [
    { tagName: 'BUTTON', dataset: { explore: 'node-a' } },
    { tagName: 'BUTTON', form: { id: 'suggest-form', dataset: {} } },
    { tagName: 'SUMMARY', editor: { dataset: { editor: 'suggest' } } },
    { tagName: 'A', href: 'https://example.test/evidence' },
  ];
  for (const spec of specs) {
    const h = harness(); h.render();
    const before = h.focusControl(spec);
    h.render();
    assert.equal(h.writes(), 1);
    assert.notEqual(h.document.activeElement, before, 'The refreshed DOM uses a new control.');
    assert.equal(h.document.activeElement?.tagName, spec.tagName);
    assert.deepEqual(h.document.activeElement?.dataset, spec.dataset || {});
    assert.equal(h.state.detailDeferred, false);
  }
});

test('a removed detail action returns keyboard focus to its panel, not an unrelated action', () => {
  const h = harness();
  h.focusControl({ tagName: 'BUTTON', dataset: { accept: 'node-a' } });
  h.clearControls(); h.render();
  assert.equal(h.document.activeElement, h.detail);
  assert.equal(h.detail.tabIndex, -1);
});

test('superseded questions stay readable without an answer control', () => {
  const h = harness();
  h.state.visibleMap.nodes[0].status = 'interrupted';
  h.state.visibleMap.nodes[0].questions = [{ id: 'old-question', text: 'The earlier question', answer: null, supersededAt: '2026-10-29T12:00:00Z' }];
  h.document.activeElement = null; h.render();
  assert.match(h.markup(), /The earlier question/);
  assert.match(h.markup(), /Superseded by a changed premise; no answer is needed/);
  assert.doesNotMatch(h.markup(), /data-question="old-question"|data-draft="old-question"/);
  h.state.visibleMap.nodes[0].questions[0].answer = 'The original user answer';
  h.render();
  assert.match(h.markup(), /Answer from an earlier premise/);
  assert.match(h.markup(), /The original user answer/);
  assert.doesNotMatch(h.markup(), /data-question="old-question"|data-draft="old-question"/);
});

test('queued branches promise pickup only when a listener covers their map', () => {
  const cases = [
    [{ listening: true }, true],
    [{ listening: true, scopes: [{ mapId: 'map-b', listening: true }] }, false],
    [{ listening: true, scopes: [{ mapId: 'map-a', listening: true }] }, true],
    [{ listening: true, scopes: [{ mapId: null, listening: true }] }, true],
    [{ listening: false, scopes: [{ mapId: 'map-a', listening: true }] }, false],
  ];
  for (const [bridge, connected] of cases) {
    const h = harness(); h.state.bridge = bridge;
    h.state.visibleMap.nodes[0].status = 'queued';
    h.document.activeElement = null; h.render();
    assert.equal(h.markup().includes('Your agent will pick up this branch next.'), connected);
    assert.equal(h.markup().includes('Saved in the queue. Connect your agent to start this investigation.'), !connected);
  }
});

test('agent coverage changes refresh queued guidance even without a map revision', async () => {
  for (const [before, after, expectedRenders] of [[false, true, 1], [true, false, 1], [false, false, 0]]) {
    const bridge = covered => ({ listening: true, scopes: [{ mapId: covered ? 'map-a' : 'map-b', listening: true }] });
    const state = { map: { id: 'map-a', revision: 2 }, bridge: bridge(before) };
    let renders = 0;
    const context = vm.createContext({ state, document: { hidden: false }, openVersion: 0, gesture: null,
      api: async () => ({ maps: [{ id: 'map-a', revision: 2 }], bridge: bridge(after) }),
      renderRail() {}, connectionView() {}, renderDetail() { renders++; } });
    vm.runInContext(between('function agentListening(', '\nfunction connectionView(') + '\n' + between('async function refresh(', '\nasync function openMap('), context);
    await context.refresh();
    assert.equal(renders, expectedRenders);
  }
});

function createHarness() {
  const requests = [], opened = [], messages = [];
  let submit, resets = 0, refreshes = 0;
  const button = { disabled: false }, error = { textContent: '' };
  const idea = { value: 'Submitted idea', focus() {} }, title = { value: 'Submitted title' };
  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  const form = { querySelector: () => button, reset() { resets++; idea.value = ''; title.value = ''; },
    addEventListener(event, callback) { if (event === 'submit') submit = callback; } };
  const elements = { '#create-form': form, '#create-dialog': dialog, '#create-error': error, '#idea': idea, '#title': title };
  const context = vm.createContext({ $: selector => elements[selector], openVersion: 0,
    api: async () => new Promise((resolve, reject) => requests.push({ resolve, reject })),
    refresh: async () => { refreshes++; }, openMap: async id => { opened.push(id); context.openVersion++; },
    toast: message => messages.push(message), FormData: class {
      constructor() { this.values = { idea: idea.value, title: title.value }; }
      get(key) { return this.values[key]; }
    } });
  vm.runInContext('let createVersion = 0;\n' + between('function showCreate(', '\nfunction showWelcome(') + '\n' +
    between("$('#create-form').addEventListener('submit'", "\n$('#open-example')"), context);
  context.showCreate();
  return { dialog, idea, title, error, button, requests, opened, messages, open: context.showCreate,
    resets: () => resets, refreshes: () => refreshes, navigate: () => { context.openVersion++; },
    submit: () => submit({ preventDefault() {}, target: form, submitter: button }) };
}

test('creating an unchanged exploration closes the dialog and opens the saved map', async () => {
  const h = createHarness(), saving = h.submit();
  h.requests[0].resolve({ id: 'created-a', title: 'Submitted title' }); await saving;
  assert.equal(h.dialog.open, false);
  assert.equal(h.resets(), 1);
  assert.deepEqual(h.opened, ['created-a']);
  assert.equal(h.refreshes(), 1);
  assert.equal(h.button.disabled, false);
});

test('a delayed creation preserves an edited or reopened dialog without changing navigation', async () => {
  for (const change of [h => { h.idea.value = 'Newer idea'; }, h => { h.dialog.close(); h.open(); }, h => { h.dialog.close(); h.open(); h.idea.value = 'Newer idea'; }]) {
    const h = createHarness(), saving = h.submit();
    change(h); const newerIdea = h.idea.value;
    h.requests[0].resolve({ id: 'created-a', title: 'Submitted title' }); await saving;
    assert.equal(h.dialog.open, true);
    assert.equal(h.idea.value, newerIdea);
    assert.equal(h.resets(), 0);
    assert.deepEqual(h.opened, []);
    assert.equal(h.refreshes(), 1, 'The saved exploration still refreshes the map list.');
    assert.equal(h.button.disabled, false);
    assert.match(h.messages.at(-1), /saved/);
  }
});

test('closing creation or navigating while it saves prevents a later navigation takeover', async () => {
  for (const change of [h => h.dialog.close(), h => h.navigate()]) {
    const h = createHarness(), saving = h.submit();
    change(h);
    h.requests[0].resolve({ id: 'created-a', title: 'Submitted title' }); await saving;
    assert.deepEqual(h.opened, []);
    assert.equal(h.resets(), 0);
    assert.equal(h.refreshes(), 1);
  }
});

test('an older creation cannot enable a newer pending submission', async () => {
  const h = createHarness(), earlier = h.submit();
  h.dialog.close(); h.open(); h.idea.value = 'Newer idea';
  assert.equal(h.button.disabled, false);
  const newer = h.submit();
  h.requests[0].resolve({ id: 'created-a', title: 'Submitted title' }); await earlier;
  assert.equal(h.button.disabled, true);
  assert.equal(h.dialog.open, true);
  h.requests[1].resolve({ id: 'created-b', title: 'Newer title' }); await newer;
  assert.deepEqual(h.opened, ['created-b']);
  assert.equal(h.button.disabled, false);
});

test('creation errors attach only to the unchanged submitted dialog', async () => {
  for (const newerDraft of [false, true]) {
    const h = createHarness(), saving = h.submit();
    if (newerDraft) { h.dialog.close(); h.open(); h.idea.value = 'Newer idea'; }
    h.requests[0].reject(new Error('Disk unavailable')); await saving;
    assert.equal(h.error.textContent, newerDraft ? '' : 'Disk unavailable');
    assert.equal(h.dialog.open, true);
    assert.equal(h.resets(), 0);
    assert.equal(h.button.disabled, false);
    if (newerDraft) assert.match(h.messages.at(-1), /Disk unavailable/);
  }
});
