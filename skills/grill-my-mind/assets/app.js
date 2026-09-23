import { constellationLayout, connectionPath, presentation, workLabels } from './graph.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { token: '', map: null, maps: [], selected: null, bridge: {}, scale: 1, x: 0, y: 0, positions: {}, drafts: {}, refreshing: false };
const labels = workLabels;
const glyphs = { idea: '✳', research: '◇', question: '?', decision: '✓', risk: '△' };
let toastTimer, gesture, suppressClick = false, openVersion = 0, actionTail = Promise.resolve();
const accents = ['var(--teal)', 'var(--blue)', 'var(--orange)'];
function navigation(open) { document.body.classList.toggle('rail-open', open); $('#map-navigation').inert = !open; $('#maps-toggle').setAttribute('aria-expanded', String(open)); }
$('#maps-toggle').onclick = () => navigation(!document.body.classList.contains('rail-open'));
document.addEventListener('keydown', event => { if (event.key === 'Escape') navigation(false); });
const themeQuery = new URL(location.href).searchParams.get('theme');
let dark = (themeQuery || localStorage.getItem('grill-my-mind-theme') || 'light') === 'dark';
function theme() { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('#theme-toggle').setAttribute('aria-pressed', String(dark)); localStorage.setItem('grill-my-mind-theme', dark ? 'dark' : 'light'); }
$('#theme-toggle').onclick = () => { dark = !dark; theme(); }; theme();
// Legacy prototype links now open the real workspace; theme is a preference, not a route.
const currentUrl = new URL(location.href); currentUrl.searchParams.delete('variant'); currentUrl.searchParams.delete('theme'); history.replaceState(null, '', currentUrl);
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 6500); }
async function api(route, body) {
  const response = await fetch(`/api${route}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${state.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'The request could not be saved.'); return data;
}
function prose(value) {
  return String(value || '').split(/\n\s*\n/).map(block => {
    if (/^#{1,4} /.test(block)) return `<h3>${esc(block.replace(/^#{1,4} /, ''))}</h3>`;
    if (/^[-*] /.test(block)) return `<ul>${block.split('\n').map(line => `<li>${esc(line.replace(/^[-*] /, ''))}</li>`).join('')}</ul>`;
    return `<p>${esc(block)}</p>`;
  }).join('');
}
function connectionView(offline = false) {
  const connected = state.bridge.listening && !offline;
  $('#bridge-status').classList.toggle('connected', connected);
  $('#bridge-status span').textContent = offline ? 'Server disconnected' : connected ? 'Agent is listening' : 'Agent is away';
  const hint = $('#empty-hint');
  hint.classList.toggle('hidden', !state.map || connected || !state.map.jobs.some(j => j.status === 'queued'));
  hint.textContent = 'Your branch is queued. Connect your agent to continue exploring.';
}
function renderRail() {
  const html = state.maps.length ? state.maps.map(m => `<button class="map-link ${state.map?.id === m.id ? 'current' : ''}" data-map="${m.id}" ${state.map?.id === m.id ? 'aria-current="page"' : ''}><span class="map-icon" aria-hidden="true">⌘</span><span><strong>${esc(m.title)}</strong><small>${m.demo ? 'Example map' : `${m.count} ${m.count === 1 ? 'idea' : 'ideas'}`}${m.pending ? ` · ${m.pending} queued` : ''}</small></span></button>`).join('') : '<p class="empty-list">Your ideas will find a home here.</p>';
  if ($('#map-list').innerHTML !== html) $('#map-list').innerHTML = html;
}
async function refresh() {
  if (state.refreshing || state.mutating || gesture || document.hidden) return;
  state.refreshing = true;
  const version = openVersion;
  try {
    const data = await api('/maps'); state.maps = data.maps; state.bridge = data.bridge; renderRail(); connectionView();
    if (state.map && data.maps.find(m => m.id === state.map.id)?.revision !== state.map.revision) {
      const mapId = state.map.id, map = await api(`/maps/${mapId}`);
      if (version === openVersion && state.map?.id === mapId && !state.mutating && !gesture && map.revision >= state.map.revision) { state.map = map; renderMap(); }
    }
  } catch { connectionView(true); }
  finally { state.refreshing = false; }
}
async function openMap(id) {
  const version = ++openVersion;
  try {
    const map = await api(`/maps/${id}`); if (version !== openVersion) return;
    state.map = map; state.selected = state.map.rootId; navigation(false);
    localStorage.setItem('grill-my-mind-map', id); location.hash = id;
    renderMap(true); renderRail();
  } catch (error) { toast(error.message); }
}
function layout() {
  const result = constellationLayout(state.map); state.positions = result.positions; state.domains = result.domains;
}
function renderEdges() {
  $('#edges').innerHTML = state.map.edges.map(e => {
    const a = state.positions[e.from], b = state.positions[e.to]; if (!a || !b) return '';
    const target = state.map.nodes.find(n => n.id === e.to);
    return `<path class="edge ${e.type === 'contains' ? '' : 'semantic'} ${presentation(target).lit ? 'lit' : ''}" style="--accent:${accents[state.domains[e.to] % accents.length]}" d="${connectionPath(a, b)}"><title>${esc(e.type.replaceAll('_', ' '))}</title></path>`;
  }).join('');
}
function renderMap(fit = false) {
  if (!state.map || gesture) return;
  const topologyChanged = state.layoutMap !== state.map.id || state.layoutCount !== state.map.nodes.length;
  state.layoutMap = state.map.id; state.layoutCount = state.map.nodes.length;
  $('#welcome').classList.add('hidden'); $('#workspace').classList.remove('hidden');
  $('#map-title').textContent = state.map.title; $('#canvas-title').textContent = state.map.title;
  $('#canvas-subtitle').textContent = state.map.demo ? 'Example content · selected branches use your real agent.' : 'A field of possibilities. You choose which ones to explore.';
  $('#saved-state').textContent = 'Saved locally';
  layout();
  $('#nodes').innerHTML = state.map.nodes.map(n => {
    const pos = state.positions[n.id];
    const root = n.id === state.map.rootId, status = presentation(n), major = root || n.parentId === state.map.rootId;
    return `<button class="node ${n.kind} ${n.status} ${root ? 'root' : ''} ${major ? 'major' : ''} ${status.lit ? 'lit' : ''} ${n.stale ? 'stale' : ''} ${n.reviewState === 'accepted' ? 'accepted' : ''} ${n.id === state.selected ? 'selected' : ''}" data-node="${n.id}" style="left:${pos.x}px;top:${pos.y}px;--accent:${accents[state.domains[n.id] % accents.length]}" aria-label="${esc(n.title)}, ${esc(status.label)}" aria-pressed="${n.id === state.selected}"><span class="node-symbol" aria-hidden="true">${glyphs[n.kind]}</span><span class="node-badge" aria-hidden="true">${n.stale ? '!' : n.status === 'awaiting-answer' ? '?' : n.reviewState === 'accepted' ? '✓' : ''}</span><span class="node-tooltip">${esc(n.title)} · ${esc(status.label)}</span>${major ? `<span class="node-caption">${esc(n.title)}</span>` : ''}</button>`;
  }).join('');
  renderEdges();
  if (!$('#detail').contains(document.activeElement) || !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) renderDetail();
  connectionView(); if (fit || topologyChanged) requestAnimationFrame(fitMap); else transform();
}
function transform() { $('#world').style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`; $('#zoom-value').textContent = `${Math.round(state.scale * 100)}%`; }
function fitMap() {
  if (!state.map) return;
  const p = Object.values(state.positions); const minX = Math.min(...p.map(p => p.x)) - 115, minY = Math.min(...p.map(p => p.y)) - 60;
  const width = Math.max(...p.map(p => p.x)) + 115 - minX, height = Math.max(...p.map(p => p.y)) + 110 - minY;
  const canvas = $('#canvas'); state.scale = Math.max(.05, Math.min(1.15, (canvas.clientWidth - 48) / width, (canvas.clientHeight - 40) / height));
  state.x = (canvas.clientWidth - width * state.scale) / 2 - minX * state.scale;
  state.y = (canvas.clientHeight - height * state.scale) / 2 - minY * state.scale;
  transform();
}
function zoom(factor, cx = $('#canvas').clientWidth / 2, cy = $('#canvas').clientHeight / 2) {
  const next = Math.max(.05, Math.min(3, state.scale * factor)); const ratio = next / state.scale;
  state.x = cx - (cx - state.x) * ratio; state.y = cy - (cy - state.y) * ratio; state.scale = next; transform();
}
function selectNode(nodeId) {
  state.selected = nodeId;
  for (const card of document.querySelectorAll('.node')) { card.classList.toggle('selected', card.dataset.node === nodeId); card.setAttribute('aria-pressed', String(card.dataset.node === nodeId)); }
  renderDetail();
}
function renderDetail() {
  const n = state.map.nodes.find(n => n.id === state.selected);
  if (!n) { $('#detail').innerHTML = '<div class="detail-empty"><span>◇</span>Select an idea to look closer.</div>'; return; }
  const pending = ['suggested', 'queued', 'running', 'awaiting-answer', 'interrupted'].includes(n.status);
  const job = state.map.jobs.filter(j => j.nodeId === n.id).at(-1);
  const related = state.map.edges.filter(e => e.type !== 'contains' && (e.from === n.id || e.to === n.id));
  const questionHtml = n.questions.map(q => q.answer ? `<div class="answer"><strong>${esc(q.text)}</strong>${esc(q.answer)}</div>` : `<form class="question-box" data-question="${q.id}" data-node-id="${n.id}"><div class="question-label">A question for you</div><p id="question-label-${q.id}">${esc(q.text)}</p><textarea name="answer" aria-labelledby="question-label-${q.id}" placeholder="What do you think?" maxlength="12000" data-draft="${q.id}" required>${esc(state.drafts[q.id] || '')}</textarea><button type="submit" class="primary">Save answer & continue</button></form>`).join('');
  $('#detail').innerHTML = `<div class="detail-kind"><span class="kind-tag"><b aria-hidden="true">${glyphs[n.kind]}</b>${n.kind.charAt(0).toUpperCase() + n.kind.slice(1)}</span><span class="status-label ${pending ? 'pending' : ''}">${esc(presentation(n).label)}</span></div><h2>${esc(n.title)}</h2><p class="detail-summary">${esc(n.summary)}</p>
    ${n.stale ? '<p class="state-note warning">An earlier premise changed. These findings need another look before you rely on them.</p>' : ''}
    ${n.status === 'suggested' ? '<p class="state-note">A possible direction. Nothing runs until you choose to explore it.</p>' : ''}
    ${n.status === 'queued' ? `<p class="state-note">${state.bridge.listening ? 'Your agent will pick up this branch next.' : 'Saved in the queue. Connect your agent to start this investigation.'}</p>` : ''}
    ${n.status === 'running' ? '<p class="state-note">Your agent is exploring this direction. New questions and findings will appear here.</p>' : ''}
    ${job?.error ? `<p class="state-note warning">${esc(job.error)}</p>` : ''}
    <div class="detail-actions">${['suggested', 'interrupted', 'explored'].includes(n.status) ? `<button class="primary" data-explore="${n.id}">${n.status === 'suggested' ? 'Explore this branch' : n.status === 'interrupted' ? 'Retry exploration' : 'Explore further'}</button>` : ''}${['queued', 'running'].includes(n.status) ? `<button class="secondary" data-cancel="${n.id}">Stop exploration</button>` : ''}${n.status === 'explored' && n.reviewState !== 'accepted' && !n.stale ? `<button class="secondary" data-accept="${n.id}">Accept finding</button>` : ''}</div>
    ${questionHtml}
    ${n.body && n.body !== n.summary ? `<h3 class="section-label">${n.status === 'suggested' ? 'What to explore' : 'Notes & findings'}</h3><div class="prose">${prose(n.body)}</div>` : ''}
    ${job?.stale && job.result ? `<h3 class="section-label">Result from the earlier premise</h3><div class="prose">${prose(job.result.body)}</div>` : ''}
    ${n.sources.length ? `<h3 class="section-label">Sources & evidence</h3>${n.sources.map(s => `<a class="evidence-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} <span aria-hidden="true">↗</span><small>${esc(s.note)}</small></a>`).join('')}` : ''}
    ${related.length ? `<h3 class="section-label">Connected thinking</h3>${related.map(e => { const target = state.map.nodes.find(node => node.id === (e.from === n.id ? e.to : e.from)); return `<button class="relationship" data-select="${target.id}">${esc(e.type.replaceAll('_', ' '))}<strong>${esc(target.title)}</strong></button>`; }).join('')}` : ''}
    <details><summary>Add a direction</summary><form id="suggest-form" data-node-id="${n.id}"><label for="branch-title">What's worth exploring?</label><input id="branch-title" name="title" maxlength="100" data-draft="${n.id}-title" value="${esc(state.drafts[`${n.id}-title`] || '')}" required><label for="branch-body">A little context</label><textarea id="branch-body" name="body" rows="3" maxlength="4000" data-draft="${n.id}-branch">${esc(state.drafts[`${n.id}-branch`] || '')}</textarea><button type="submit" class="secondary">Add suggested branch</button></form></details>
    <details><summary>Revise this premise</summary><form id="revise-form" data-node-id="${n.id}"><label for="revised-body">What changed?</label><textarea id="revised-body" name="body" rows="5" maxlength="16000" required data-draft="${n.id}-revision">${esc(state.drafts[`${n.id}-revision`] || n.prompt || n.body)}</textarea><p class="form-note">Dependent findings will be marked for review. Research won't restart automatically.</p><button type="submit" class="secondary">Save revised premise</button></form></details>
    ${job?.contextCharacters ? `<p class="run-note">Last investigation used ${job.contextCharacters.toLocaleString()} characters of map context. Only relevant context is sent.</p>` : ''}`;
}
function act(nodeId, type, extra = {}) {
  const mapId = state.map.id;
  const execute = async () => {
    if (state.map?.id !== mapId) return false;
    state.mutating = true;
    try {
      const result = await api(`/maps/${mapId}/action`, { nodeId, type, expectedRevision: state.map.revision, ...extra });
      if (state.map?.id === mapId) { state.map = result; renderMap(); }
      return true;
    } catch (error) {
      toast(error.message);
      // Reload acknowledged coordinates after a conflict instead of displaying an unsaved move.
      try { const current = await api(`/maps/${mapId}`); if (state.map?.id === mapId) { state.map = current; renderMap(); } } catch { connectionView(true); }
      return false;
    } finally { state.mutating = false; }
  };
  const result = actionTail.then(execute); actionTail = result.catch(() => {}); return result;
}
function showCreate() { $('#create-error').textContent = ''; $('#create-dialog').showModal(); $('#idea').focus(); }
function showWelcome() {
  openVersion++; state.map = null; state.selected = null; localStorage.removeItem('grill-my-mind-map'); navigation(false);
  $('#welcome').classList.remove('hidden'); $('#workspace').classList.add('hidden'); $('#map-title').textContent = 'A place to think'; renderRail();
}
$('.brand').addEventListener('click', event => { event.preventDefault(); showWelcome(); location.hash = ''; });
$('#new-map').addEventListener('click', showCreate); $('#start-exploration').addEventListener('click', showCreate);
for (const button of document.querySelectorAll('.close-dialog')) button.addEventListener('click', () => button.closest('dialog').close());
function showHelp() { $('#help-dialog').showModal(); }
$('#bridge-help').addEventListener('click', showHelp); $('#bridge-status').addEventListener('click', showHelp);
$('#copy-prompt').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#agent-prompt').value); toast('Prompt copied. Paste it into your coding agent.'); } catch { $('#agent-prompt').select(); toast('Select and copy the prompt above.'); } });
$('#create-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true;
  const data = new FormData(event.target); const idea = data.get('idea').trim(); const title = data.get('title').trim() || idea.split(/\s+/).slice(0, 7).join(' ').slice(0, 100);
  try { const map = await api('/maps', { title, idea }); $('#create-dialog').close(); event.target.reset(); await refresh(); await openMap(map.id); toast('Your idea is saved. Its first exploration is queued.'); }
  catch (error) { $('#create-error').textContent = error.message; }
  finally { button.disabled = false; }
});
$('#open-example').addEventListener('click', async event => {
  event.target.disabled = true;
  try { const existing = state.maps.find(m => m.demo); const map = existing || await api('/demo', {}); await refresh(); await openMap(map.id); }
  catch (error) { toast(error.message); } finally { event.target.disabled = false; }
});
document.addEventListener('click', async event => {
  if (suppressClick) { suppressClick = false; return; }
  const map = event.target.closest('[data-map]'); if (map) return openMap(map.dataset.map);
  const select = event.target.closest('[data-select]'); if (select) return selectNode(select.dataset.select);
  for (const [attribute, action, message] of [['explore', 'activate', 'Exploration queued.'], ['cancel', 'cancel', 'Cancelled. An active agent may finish its current step.'], ['accept', 'accept', 'Finding accepted.']]) {
    const button = event.target.closest(`[data-${attribute}]`);
    if (button) { button.disabled = true; if (await act(button.dataset[attribute], action)) toast(message); button.disabled = false; return; }
  }
  const card = event.target.closest('.node'); if (card) selectNode(card.dataset.node);
});
$('#detail').addEventListener('input', event => { if (event.target.dataset.draft) state.drafts[event.target.dataset.draft] = event.target.value; });
$('#detail').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target; const button = event.submitter; button.disabled = true;
  const data = Object.fromEntries(new FormData(form)); const node = form.dataset.nodeId;
  let success = false;
  if (form.dataset.question) success = await act(node, 'answer', { questionId: form.dataset.question, answer: data.answer });
  if (form.id === 'suggest-form') success = await act(node, 'suggest', { title: data.title, body: data.body.trim() || data.title });
  if (form.id === 'revise-form') success = await act(node, 'revise', data);
  if (success) { for (const field of form.querySelectorAll('[data-draft]')) delete state.drafts[field.dataset.draft]; renderDetail(); toast(form.dataset.question ? 'Answer saved. Your branch will continue.' : 'Saved to your map.'); }
  button.disabled = false;
});
$('#zoom-in').addEventListener('click', () => zoom(1.2)); $('#zoom-out').addEventListener('click', () => zoom(1 / 1.2)); $('#fit-map').addEventListener('click', fitMap);
$('#canvas').addEventListener('wheel', event => { event.preventDefault(); if (gesture) return; const rect = $('#canvas').getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.08 : 1 / 1.08, event.clientX - rect.left, event.clientY - rect.top); }, { passive: false });
$('#canvas').addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary || gesture || state.mutating || !state.map) return;
  const node = event.target.closest('.node');
  gesture = { pointer: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: state.x, y: state.y, scale: state.scale, nodeId: node?.dataset.node, position: node ? { ...state.positions[node.dataset.node] } : null, moved: false };
  $('#canvas').setPointerCapture(event.pointerId);
});
$('#canvas').addEventListener('pointermove', event => {
  if (!gesture || event.pointerId !== gesture.pointer) return;
  const dx = event.clientX - gesture.clientX, dy = event.clientY - gesture.clientY;
  if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
  gesture.moved = true; $('#canvas').classList.add('dragging');
  if (gesture.nodeId) {
    const pos = { x: gesture.position.x + dx / gesture.scale, y: gesture.position.y + dy / gesture.scale }; state.positions[gesture.nodeId] = pos;
    const el = document.querySelector(`[data-node="${gesture.nodeId}"]`); el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`; renderEdges();
  } else { state.x = gesture.x + dx; state.y = gesture.y + dy; transform(); }
});
async function finishGesture(event) {
  if (!gesture || event.pointerId !== gesture.pointer) return;
  const finished = gesture; gesture = null; $('#canvas').classList.remove('dragging');
  if ($('#canvas').hasPointerCapture(event.pointerId)) $('#canvas').releasePointerCapture(event.pointerId);
  if (finished.moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 100); }
  if (event.type !== 'pointerup') { renderMap(); return; }
  if (finished.nodeId) {
    selectNode(finished.nodeId);
    if (finished.moved) {
      $('#saved-state').textContent = 'Saving position…';
      await act(finished.nodeId, 'position', { ...state.positions[finished.nodeId] });
    }
  }
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('#canvas').addEventListener(type, finishGesture);
$('#nodes').addEventListener('keydown', async event => {
  const node = event.target.closest('.node');
  if (!node || !event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault(); if (state.mutating || gesture) return;
  const id = node.dataset.node, pos = state.positions[id];
  const x = pos.x + (event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0);
  const y = pos.y + (event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0);
  selectNode(id); await act(id, 'position', { x, y }); $(`[data-node="${id}"]`)?.focus();
});
window.addEventListener('resize', () => { if (state.map) fitMap(); });
window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== state.map?.id) openMap(id); else if (!id) showWelcome(); });
try {
  const session = await (await fetch('/api/session')).json(); state.token = session.token;
  $('#workspace-name').textContent = session.workspace;
  $('#agent-prompt').value = `Use the Grill My Mind skill at ${session.skillPath || 'skills/grill-my-mind/SKILL.md'} to continue the workspace ${session.workspacePath || session.workspace}. The local app is running. Pick up activated branches with the command bridge, keep context focused, and send findings and questions back to the map.`;
  await refresh();
  const saved = location.hash.slice(1) || localStorage.getItem('grill-my-mind-map');
  if (saved && state.maps.some(m => m.id === saved)) await openMap(saved);
  setInterval(refresh, 2500);
} catch (error) { toast(`Cannot connect to the workspace: ${error.message}`); connectionView(true); }
