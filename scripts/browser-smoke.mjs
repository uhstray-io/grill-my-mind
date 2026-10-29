// Optional real-browser checks. Playwright is a development tool, not a skill dependency.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { startServer } from '../skills/grill-my-mind/scripts/server.mjs';

const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
if (!option('--playwright') || !option('--browser-executable')) {
  console.error('Usage: node scripts/browser-smoke.mjs --playwright <absolute Playwright index.mjs> --browser-executable <absolute browser executable>');
  process.exit(1);
}
const { chromium } = await import(pathToFileURL(path.resolve(option('--playwright'))).href);
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(path.join(root, '.test-output'), { recursive: true });
const workspace = await mkdtemp(path.join(root, '.test-output', 'browser-'));
const app = await startServer({ workspace, port: 0 });
let browser;
const passed = [], errors = [];
try {
  let map = await app.store.create({ title: 'Browser review — field observations', idea: 'Illustrative browser test: capture field observations without connectivity.' });
  const packet = await app.store.claim('browser-fixture', map.id);
  map = await app.store.complete(map.id, packet.jobId, packet.claimKey, {
    summary: 'The sharing boundary needs a decision.', body: 'Fixture analysis: privacy affects backup and sharing.',
    questions: ['Which observations may leave a device?'],
    suggestions: [{ title: 'Lost-device recovery', body: 'Determine acceptable loss.', kind: 'risk' }, { title: 'A small pilot', body: 'Try manual export with two volunteers.', kind: 'research' }],
  });
  const rootId = map.rootId, childId = map.nodes[1].id;
  browser = await chromium.launch({ executablePath: option('--browser-executable'), headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const check = async (name, run) => { await run(); passed.push(name); console.log(`PASS ${name}`); };
  const current = () => app.store.get(map.id);
  const waitRevision = revision => page.waitForResponse(response => response.url().endsWith(`/api/maps/${map.id}`) && response.request().method() === 'GET').then(async response => {
    assert.ok((await response.json()).revision >= revision); await page.waitForTimeout(50);
  });
  await page.goto(`${app.address}/#${map.id}`);
  await page.locator('#nodes .node').first().waitFor();
  await check('desktop layout, theme, and nearby navigation', async () => {
    assert.equal(await page.locator('#nodes .node').count(), 3);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(workspace, 'desktop-light.png') });
    await page.locator('#theme-toggle').click(); await page.waitForTimeout(200); // Let the button color transition settle for screenshots.
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.screenshot({ path: path.join(workspace, 'desktop-dark.png') });
    await page.locator('#theme-toggle').click();
    const before = await current();
    await page.locator('#find-node').fill('Lost-device');
    await page.locator('#find-node').press('Enter');
    assert.match(await page.locator('#detail h2').innerText(), /Lost-device/);
    assert.deepEqual(await current(), before, 'search and selection must not activate work');
    await page.locator(`[data-select="${rootId}"]`).click();
  });
  await check('polling preserves the actual input, selection, and native undo', async () => {
    const field = page.locator('textarea[name="answer"]');
    await field.click(); await field.pressSequentially('Private field draft');
    await field.evaluate(element => { window.reviewDraft = element; element.setSelectionRange(3, 8); });
    const before = await current(), updated = await app.store.action(map.id, { type: 'position', nodeId: childId, x: 240, y: 90, expectedRevision: before.revision });
    await waitRevision(updated.revision);
    assert.equal(await field.evaluate(element => element === window.reviewDraft), true);
    assert.deepEqual(await field.evaluate(element => [element.selectionStart, element.selectionEnd]), [3, 8]);
    await field.press('Control+z');
    assert.equal(await field.inputValue(), '', 'native undo must survive polling');
    await field.fill('Only explicit exports may leave the device.');
  });
  await check('history scrubbing is read-only and returning to live preserves drafts', async () => {
    const before = await current();
    await page.locator('#show-history').click();
    await page.locator('#history-slider').focus(); await page.locator('#history-slider').press('Home');
    assert.equal(await page.locator('#nodes .node').count(), 1);
    assert.equal(await page.locator('#detail form').count(), 0);
    await page.locator('#nodes .node').press('Alt+ArrowRight');
    assert.deepEqual(await current(), before);
    await page.screenshot({ path: path.join(workspace, 'history.png') });
    await page.locator('#return-live').click();
    assert.equal(await page.locator('textarea[name="answer"]').inputValue(), 'Only explicit exports may leave the device.');
  });
  await check('brief download and agent prompt scope', async () => {
    await page.locator('#show-brief').click();
    await page.locator('#download-brief:enabled').waitFor();
    assert.match(await page.locator('#brief-content').innerText(), /Which observations may leave a device/);
    const downloadEvent = page.waitForEvent('download'); await page.locator('#download-brief').click();
    const download = await downloadEvent;
    const downloaded = path.join(workspace, 'downloaded-brief.md'); await download.saveAs(downloaded);
    const markdown = await readFile(downloaded, 'utf8');
    assert.ok(markdown.includes(map.id)); assert.match(markdown, /Working findings/);
    await page.locator('#brief-dialog .close-dialog').click();
    await page.locator('#bridge-status').click();
    assert.ok((await page.locator('#agent-prompt').inputValue()).includes(map.id));
    await page.locator('#help-dialog .close-dialog').click();
  });
  const holdAction = async type => {
    let release, seen;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { seen = resolve; });
    const handler = async route => {
      if (route.request().method() === 'POST' && route.request().postDataJSON().type === type) { seen(); await gate; }
      await route.continue();
    };
    const pattern = `**/api/maps/${map.id}/action`;
    await page.route(pattern, handler);
    return { started, release, remove: () => page.unroute(pattern, handler) };
  };
  await check('a slow direction save preserves text entered for the next direction', async () => {
    await page.locator('details[data-editor="suggest"] summary').click();
    await page.locator('#branch-title').fill('First saved direction');
    await page.locator('#branch-body').fill('First context');
    const pending = await holdAction('suggest');
    try {
      await page.getByRole('button', { name: 'Add suggested branch', exact: true }).click(); await pending.started;
      await page.locator('#branch-title').fill('Next unsaved direction');
      await page.locator('#branch-body').fill('Keep this newer draft');
      const savedResponse = page.waitForResponse(response => response.url().endsWith(`/api/maps/${map.id}/action`) && response.request().postDataJSON()?.type === 'suggest');
      pending.release(); await savedResponse; await page.waitForTimeout(50);
      assert.equal(await page.locator('#branch-title').inputValue(), 'Next unsaved direction');
      assert.equal(await page.locator('#branch-body').inputValue(), 'Keep this newer draft');
      assert.equal((await current()).nodes.filter(node => node.title === 'First saved direction').length, 1);
      assert.equal((await current()).nodes.filter(node => node.title === 'Next unsaved direction').length, 0);
    } finally { pending.release(); await pending.remove(); }
  });
  await check('polling preserves keyboard focus on form buttons and disclosures', async () => {
    for (const selector of ['#suggest-form button', 'details[data-editor="revise"] summary']) {
      await page.locator(selector).focus();
      const before = await current(), updated = await app.store.action(map.id, { type: 'position', nodeId: childId, x: before.view.positions[childId].x + 1, y: 90, expectedRevision: before.revision });
      await waitRevision(updated.revision);
      assert.equal(await page.locator(selector).evaluate(element => document.activeElement === element), true);
    }
  });
  await check('user answer queues continuation while suggestions remain inactive', async () => {
    const pending = await holdAction('answer');
    try {
      await page.getByRole('button', { name: 'Save answer & continue' }).click(); await pending.started;
      assert.equal(await page.locator('textarea[name="answer"]').evaluate(element => element.readOnly), true, 'submitted answers cannot accumulate unsavable changes');
    } finally { pending.release(); }
    await page.locator('#detail .status-label').filter({ hasText: 'Queued' }).waitFor();
    await pending.remove();
    const saved = await current();
    assert.equal(saved.nodes[0].questions[0].answer, 'Only explicit exports may leave the device.');
    assert.equal(saved.nodes.find(node => node.id === childId).status, 'suggested');
  });
  await check('drag and keyboard positioning retain connections and survive reload', async () => {
    const node = page.locator(`[data-node="${rootId}"]`);
    const before = await node.evaluate(element => ({ x: parseFloat(element.style.left), y: parseFloat(element.style.top) }));
    const edges = await page.locator('#edges').innerHTML(), box = await node.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2 - 35, { steps: 8 }); await page.mouse.up();
    await page.locator('#saved-state').filter({ hasText: 'Saved locally' }).waitFor();
    const saved = (await current()).view.positions[rootId];
    assert.ok(saved.x > before.x && saved.y < before.y);
    assert.notEqual(await page.locator('#edges').innerHTML(), edges);
    await node.focus(); await node.press('Alt+ArrowRight');
    await page.waitForFunction(({ id, x }) => parseFloat(document.querySelector(`[data-node="${id}"]`).style.left) === x, { id: rootId, x: saved.x + 24 });
    await page.reload(); await page.locator('#nodes .node').first().waitFor();
    assert.equal(await node.evaluate(element => parseFloat(element.style.left)), saved.x + 24);
  });
  await check('completed findings remain complete and changed premises start inactive', async () => {
    const continuation = await app.store.claim('browser-fixture', map.id);
    assert.equal(continuation.selected.id, rootId);
    const complete = await app.store.complete(map.id, continuation.jobId, continuation.claimKey, { summary: 'Test a device-only pilot with deliberate exports.', body: 'Illustrative completion based on the recorded sharing preference.' });
    await waitRevision(complete.revision);
    assert.equal(await page.locator('#detail [data-explore]').count(), 0);
    await page.getByRole('button', { name: 'Accept finding', exact: true }).click();
    await page.locator('#detail .status-label').filter({ hasText: 'accepted' }).waitFor();
    await page.locator('details[data-editor="revise"] summary').click();
    await page.locator('#revised-body').fill('What if field observations must be shared with a second team?');
    await page.getByRole('button', { name: 'Add changed-premise branch', exact: true }).click();
    await page.locator('#detail .state-note.warning').waitFor();
    const saved = await current(), fork = saved.nodes.find(node => node.revises === rootId);
    assert.equal(fork.status, 'suggested');
    assert.equal(saved.nodes[0].status, 'explored'); assert.equal(saved.nodes[0].stale, true);
    assert.equal(saved.nodes[0].questions[0].answer, 'Only explicit exports may leave the device.');
    assert.equal(await page.locator('#detail [data-explore]').count(), 0);
  });
  await check('tablet and phone layouts, modal access, and history controls', async () => {
    for (const width of [1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 }); await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `horizontal overflow at ${width}`);
      await page.screenshot({ path: path.join(workspace, `layout-${width}.png`), fullPage: true });
      await page.locator('#show-history').click(); await page.locator('#history-slider').press('Home');
      assert.equal(await page.locator('#nodes .node').count(), 1);
      await page.screenshot({ path: path.join(workspace, `history-${width}.png`), fullPage: true });
      await page.locator('#return-live').click();
      await page.locator('#show-brief').click(); await page.locator('#download-brief:enabled').waitFor();
      await page.locator('#brief-dialog .close-dialog').click();
    }
  });
  await check('new-map examples create one queued root', async () => {
    await page.locator('#maps-toggle').click(); await page.locator('#new-map').click();
    await page.getByRole('button', { name: 'Personal decision', exact: true }).click();
    assert.ok((await page.locator('#idea').inputValue()).length > 30);
    await page.getByRole('button', { name: 'Create exploration', exact: true }).click();
    await page.waitForFunction(id => location.hash !== `#${id}`, map.id);
    await page.locator('#nodes .node').waitFor();
    assert.equal(await page.locator('#nodes .node').count(), 1);
    const created = await app.store.get(new URL(page.url()).hash.slice(1));
    assert.equal(created.jobs.filter(job => job.status === 'queued').length, 1);
  });
  await check('a listener for another map does not hide queued work or overflow a phone layout', async () => {
    const { token } = await (await fetch(`${app.address}/api/session`)).json();
    const response = await fetch(`${app.address}/api/next?map=${map.id}&worker=browser-scoped-fixture`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await response.json()).idle, true);
    await page.locator('#bridge-status').filter({ hasText: 'Agent on another map' }).waitFor();
    assert.equal(await page.locator('#bridge-status').evaluate(element => element.classList.contains('connected')), false);
    assert.equal(await page.locator('#empty-hint').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(workspace, 'phone-map-scope.png'), fullPage: true });
  });
  await check('reopening creation during a slow save keeps the new draft and current map', async () => {
    const originalUrl = page.url(), beforeCount = (await app.store.list()).length;
    await page.locator('#maps-toggle').click(); await page.locator('#new-map').click();
    await page.locator('#title').fill('Delayed first exploration');
    await page.locator('#idea').fill('This illustrative idea is submitted before reopening the dialog.');
    let release, seen;
    const gate = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { seen = resolve; });
    const handler = async route => { if (route.request().method() === 'POST') { seen(); await gate; } await route.continue(); };
    await page.route('**/api/maps', handler);
    try {
      await page.getByRole('button', { name: 'Create exploration', exact: true }).click(); await started;
      await page.locator('#create-dialog .close-dialog').click();
      await page.locator('#new-map').click();
      await page.locator('#title').fill('New draft still being considered');
      await page.locator('#idea').fill('Preserve this different draft; it has not been submitted.');
      const response = page.waitForResponse(response => response.url().endsWith('/api/maps') && response.request().method() === 'POST');
      release(); await response;
      await page.waitForFunction(() => !document.querySelector('#create-form button[type="submit"]').disabled);
      assert.equal(await page.locator('#create-dialog').evaluate(element => element.open), true);
      assert.equal(await page.locator('#title').inputValue(), 'New draft still being considered');
      assert.equal(await page.locator('#idea').inputValue(), 'Preserve this different draft; it has not been submitted.');
      assert.equal(page.url(), originalUrl, 'a late save must not navigate away from newer work');
      assert.equal((await app.store.list()).length, beforeCount + 1);
      await page.locator('#create-dialog .close-dialog').click();
    } finally { release(); await page.unroute('**/api/maps', handler); }
  });
  assert.deepEqual(errors, [], 'browser console and page errors');
  const report = { at: new Date().toISOString(), browser: await browser.version(), executable: option('--browser-executable'), passed, errors, workspace, mode: 'headless; illustrative fixtures; no model invoked' };
  await writeFile(path.join(workspace, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Browser checks passed. Screenshots and report: ${workspace}`);
} catch (error) {
  console.error(`Browser checks failed. Evidence: ${workspace}`); throw error;
} finally { await browser?.close(); await app.close(); }
