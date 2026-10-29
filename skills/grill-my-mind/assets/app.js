import { constellationLayout, connectionPath, presentation, overviewView, focusedView } from './graph.js';
import { growthTimeline, mapAtGrowthStep } from './history.js';
import { mapOverview, visibleSelection, briefFilename, briefPreview, historyStepLabel, starterIdeas } from './workspace-view.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const state = { token: '', map: null, visibleMap: null, maps: [], selected: null, bridge: {}, scale: 1, x: 0, y: 0, positions: {}, drafts: {}, editors: {}, refreshing: false, filter: null, historyStep: null, historySource: null, brief: null };
const glyphs = { idea: '✳', research: '◇', question: '?', decision: '✓', risk: '△' };
let toastTimer, gesture, suppressClick = false, openVersion = 0, actionTail = Promise.resolve();
const accents = ['var(--teal)', 'var(--blue)', 'var(--orange)'];
function navigation(open) { document.body.classList.toggle('rail-open', open); $('#map-navigation').inert = !open; $('#maps-toggle').setAttribute('aria-expanded', String(open)); }
$('#maps-toggle').onclick = () => navigation(!document.body.classList.contains('rail-open'));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') { navigation(false); closeOverview(); }
  if (event.key === '/' && state.map && !event.ctrlKey && !event.metaKey && !event.altKey && !document.querySelector('dialog[open]') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) { event.preventDefault(); $('#find-node').focus(); }
});
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
function agentListening(mapId = state.map?.id) {
  return Boolean(state.bridge.listening && (!mapId || !Array.isArray(state.bridge.scopes) || state.bridge.scopes.some(scope => scope.listening && (scope.mapId === null || scope.mapId === mapId))));
}
function connectionView(offline = false) {
  const connected = agentListening() && !offline;
  $('#bridge-status').classList.toggle('connected', connected);
  $('#bridge-status span').textContent = offline ? 'Server disconnected' : connected ? 'Agent is listening' : state.bridge.listening ? 'Agent on another map' : 'Connect your agent';
  const hint = $('#empty-hint');
  hint.classList.toggle('hidden', !state.map || state.historyStep !== null || connected || !state.map.jobs.some(j => j.status === 'queued'));
  hint.textContent = 'Queued safely. Use the agent button above to continue.';
}
function renderRail() {
  const html = state.maps.length ? state.maps.map(m => `<button class="map-link ${state.map?.id === m.id ? 'current' : ''}" data-map="${m.id}" ${state.map?.id === m.id ? 'aria-current="page"' : ''}><span class="map-icon" aria-hidden="true">⌘</span><span><strong>${esc(m.title)}</strong><small>${m.demo ? 'Example map' : `${m.count} ${m.count === 1 ? 'idea' : 'ideas'}`}${m.pending ? ` · ${m.pending} queued` : ''}</small></span></button>`).join('') : '<p class="empty-list">Your ideas will find a home here.</p>';
  if ($('#map-list').innerHTML !== html) $('#map-list').innerHTML = html;
}
async function refresh() {
  if (state.refreshing || state.mutating || gesture || document.hidden) return;
  state.refreshing = true;
  const version = openVersion;
  const previouslyListening = agentListening();
  try {
    const data = await api('/maps'); state.maps = data.maps; state.bridge = data.bridge; renderRail(); connectionView();
    if (state.map && data.maps.find(m => m.id === state.map.id)?.revision !== state.map.revision) {
      const mapId = state.map.id, map = await api(`/maps/${mapId}`);
      if (version === openVersion && state.map?.id === mapId && !state.mutating && !gesture && map.revision >= state.map.revision) { state.map = map; renderMap(); }
    }
    if ((state.detailDeferred || previouslyListening !== agentListening()) && version === openVersion && state.map) renderDetail();
  } catch { connectionView(true); }
  finally { state.refreshing = false; }
}
async function openMap(id) {
  const version = ++openVersion;
  try {
    const map = await api(`/maps/${id}`); if (version !== openVersion) return;
    state.map = map; state.selected = state.map.rootId; state.historyStep = null; state.historySource = null; state.filter = null; navigation(false);
    $('#find-node').value = ''; $('#node-results').hidden = true;
    localStorage.setItem('grill-my-mind-map', id); location.hash = id;
    renderMap(true); renderRail();
  } catch (error) { toast(error.message); }
}
function layout() {
  const source = state.historySource || state.map;
  const key = JSON.stringify([source.id, source.nodes.map(n => [n.id, n.parentId])]);
  if (state.graphKey !== key) {
    state.graphKey = key;
    state.baseGraph = constellationLayout({ ...source, view: null });
  }
  state.positions = { ...state.baseGraph.positions }; state.domains = state.baseGraph.domains;
  for (const node of source.nodes) {
    const saved = source.view?.positions?.[node.id];
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) state.positions[node.id] = { ...saved };
  }
}
function renderEdges() {
  const nodes = new Map(state.visibleMap.nodes.map(node => [node.id, node]));
  $('#edges').innerHTML = state.visibleMap.edges.map(e => {
    const a = state.positions[e.from], b = state.positions[e.to]; if (!a || !b) return '';
    const target = nodes.get(e.to);
    return `<path class="edge ${e.type === 'contains' ? '' : 'semantic'} ${presentation(target).lit ? 'lit' : ''}" style="--accent:${accents[state.domains[e.to] % accents.length]}" d="${connectionPath(a, b)}"><title>${esc(e.type.replaceAll('_', ' '))}</title></path>`;
  }).join('');
}
function renderMap(fit = false, preserveView = false) {
  if (!state.map || gesture) return;
  const historic = state.historyStep !== null;
  state.timeline = growthTimeline(state.historySource || state.map);
  state.visibleMap = historic ? mapAtGrowthStep(state.historySource, state.historyStep) : state.map;
  state.selected = visibleSelection(state.visibleMap, state.selected);
  const topologyChanged = state.layoutMap !== state.map.id || state.layoutCount !== state.map.nodes.length;
  state.layoutMap = state.map.id; state.layoutCount = state.map.nodes.length;
  $('#welcome').classList.add('hidden'); $('#workspace').classList.remove('hidden');
  $('#map-title').textContent = state.map.title; $('#canvas-title').textContent = state.map.title;
  const overview = mapOverview(state.visibleMap);
  $('#canvas-subtitle').textContent = `${overview.total} ${overview.total === 1 ? 'idea' : 'ideas'} · ${overview.explored} explored · ${overview.accepted} accepted${overview.running ? ` · ${overview.running} researching` : ''}${state.map.demo ? ' · Example map' : ''}`;
  $('#saved-state').textContent = historic ? 'Read-only history' : 'Saved locally';
  $('#workspace').classList.toggle('history-mode', historic);
  $('#canvas').setAttribute('aria-label', historic ? 'Map growth history. Read-only. Drag the background to pan; select an idea to view today’s findings.' : 'Constellation. Drag a node to move it or the background to pan. Focus a node and use Alt plus arrow keys to move it.');
  $('#canvas-instruction').textContent = historic ? 'Read-only history · pan or zoom to inspect · return to live to arrange ideas' : 'Drag nodes to arrange · Alt + arrow keys moves a focused node · / finds an idea';
  $('#focus-selected').disabled = !state.selected;
  layout();
  const focusedNode = document.activeElement?.dataset.node;
  $('#nodes').innerHTML = state.visibleMap.nodes.map(n => {
    const pos = state.positions[n.id];
    const root = n.id === state.map.rootId, status = presentation(n), major = root || n.parentId === state.map.rootId;
    return `<button class="node ${n.kind} ${n.status} ${root ? 'root' : ''} ${major ? 'major' : ''} ${status.lit ? 'lit' : ''} ${n.stale ? 'stale' : ''} ${n.reviewState === 'accepted' ? 'accepted' : ''} ${n.id === state.selected ? 'selected' : ''}" data-node="${n.id}" style="left:${pos.x}px;top:${pos.y}px;--accent:${accents[state.domains[n.id] % accents.length]}" aria-label="${esc(n.title)}, ${esc(status.label)}" aria-pressed="${n.id === state.selected}"><span class="node-symbol" aria-hidden="true">${glyphs[n.kind]}</span><span class="node-badge" aria-hidden="true">${n.stale ? '!' : n.status === 'awaiting-answer' ? '?' : n.reviewState === 'accepted' ? '✓' : ''}</span><span class="node-tooltip">${esc(n.title)} · ${esc(status.label)}</span>${major ? `<span class="node-caption">${esc(n.title)}</span>` : ''}</button>`;
  }).join('');
  renderEdges();
  renderDetail(); renderOverview(); renderHistory();
  if (focusedNode) $(`[data-node="${focusedNode}"]`)?.focus({ preventScroll: true });
  if (!$('#node-results').hidden) searchNodes();
  connectionView();
  if (!preserveView && !historic && (fit || (topologyChanged && state.overview))) requestAnimationFrame(() => { if (fit) centerSelected(); else fitMap(); });
  else transform();
}
function transform() { $('#world').style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`; $('#world').style.setProperty('--graph-scale', state.scale); $('#zoom-value').textContent = `${state.scale < .1 ? (state.scale * 100).toFixed(1) : Math.round(state.scale * 100)}%`; }
function viewport() { return { width: $('#canvas').clientWidth, height: $('#canvas').clientHeight }; }
function fitMap() {
  if (!state.map) return;
  state.overview = true;
  Object.assign(state, overviewView(visiblePositions(), viewport()));
  transform();
}
function zoom(factor, cx = $('#canvas').clientWidth / 2, cy = $('#canvas').clientHeight / 2) {
  state.overview = false;
  const minimum = Math.min(.05, overviewView(visiblePositions(), viewport()).scale);
  const next = Math.max(minimum, Math.min(3, state.scale * factor)); const ratio = next / state.scale;
  state.x = cx - (cx - state.x) * ratio; state.y = cy - (cy - state.y) * ratio; state.scale = next; transform();
}
function selectNode(nodeId) {
  state.selected = visibleSelection(state.visibleMap, nodeId);
  for (const card of document.querySelectorAll('.node')) { card.classList.toggle('selected', card.dataset.node === nodeId); card.setAttribute('aria-pressed', String(card.dataset.node === nodeId)); }
  $('#focus-selected').disabled = !state.selected; renderDetail();
}
function focusNode(nodeId) {
  if (!state.positions[nodeId] || !state.visibleMap.nodes.some(node => node.id === nodeId)) return;
  selectNode(nodeId);
  centerSelected();
  $('#node-results').hidden = true;
  closeOverview();
  $(`[data-node="${nodeId}"]`)?.focus({ preventScroll: true });
}
function centerSelected() {
  const node = state.visibleMap?.nodes.find(n => n.id === state.selected);
  if (!node) return;
  const neighbors = state.visibleMap.nodes.filter(n => n.parentId === node.id || n.id === node.parentId).map(n => state.positions[n.id]);
  state.overview = false;
  Object.assign(state, focusedView(state.positions[node.id], viewport(), 1, neighbors)); transform();
}
function searchNodes() {
  if (!state.map) return;
  const focusedIdea = $('#node-results').contains(document.activeElement) ? document.activeElement.dataset.focusNode : null;
  const query = $('#find-node').value.trim().toLowerCase();
  const matches = state.visibleMap.nodes.filter(node => `${node.title} ${node.summary || ''}`.toLowerCase().includes(query));
  $('#node-results').innerHTML = `<p role="status">${matches.length ? `${matches.length} ${matches.length === 1 ? 'idea' : 'ideas'}${matches.length > 12 ? ' · showing 12, type more to narrow' : ''}` : 'No matching ideas'}</p>` + matches.slice(0, 12).map(node => `<button type="button" data-focus-node="${node.id}"><strong>${esc(node.title)}</strong><small>${esc(presentation(node).label)}</small></button>`).join('');
  $('#node-results').hidden = false;
  if (focusedIdea) ([...$('#node-results').querySelectorAll('[data-focus-node]')].find(button => button.dataset.focusNode === focusedIdea) || $('#find-node')).focus({ preventScroll: true });
}
$('#find-node').addEventListener('input', searchNodes);
$('#find-node').addEventListener('focus', searchNodes);
$('#find-node').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); $('#node-results').hidden = true; }
  if (event.key === 'ArrowDown') { event.preventDefault(); $('#node-results button')?.focus(); }
  if (event.key === 'Enter') { event.preventDefault(); const id = $('#node-results button')?.dataset.focusNode; if (id && !$('#node-results').hidden) focusNode(id); }
});
$('#node-finder').addEventListener('focusout', event => { if (!event.currentTarget.contains(event.relatedTarget)) $('#node-results').hidden = true; });
$('#node-finder').addEventListener('keydown', event => { if (event.key === 'Escape') { $('#find-node').focus(); $('#node-results').hidden = true; } });
$('#focus-selected').addEventListener('click', () => focusNode(state.selected));

function visiblePositions() {
  return Object.fromEntries((state.visibleMap?.nodes || []).filter(node => state.positions[node.id]).map(node => [node.id, state.positions[node.id]]));
}
function closeOverview() {
  if (!state.filter) return;
  state.filter = null; renderOverview();
}
function renderOverview() {
  if (!state.visibleMap) return;
  const overview = mapOverview(state.visibleMap), focusedFilter = document.activeElement?.dataset.filter;
  const focusedIdea = $('#overview-list').contains(document.activeElement) ? document.activeElement.dataset.focusNode : null;
  const html = overview.groups.map(group => `<button type="button" data-filter="${group.id}" aria-expanded="${state.filter === group.id}" aria-controls="overview-panel"><span>${group.label}</span><strong>${group.nodes.length}</strong></button>`).join('');
  if ($('#overview-filters').innerHTML !== html) $('#overview-filters').innerHTML = html;
  if (focusedFilter) $(`[data-filter="${focusedFilter}"]`)?.focus({ preventScroll: true });
  const group = overview.groups.find(item => item.id === state.filter);
  $('#overview-panel').hidden = !group;
  for (const card of document.querySelectorAll('.node')) card.classList.toggle('filter-muted', Boolean(group) && !group.nodes.some(node => node.id === card.dataset.node));
  if (!group) return;
  $('#overview-title').textContent = `${group.label} (${group.nodes.length})`;
  $('#overview-explanation').textContent = state.historyStep === null ? 'Choose an idea to inspect it. Opening this list never starts work.' : 'Today’s state of ideas visible at this growth step.';
  const list = group.nodes.length ? group.nodes.map(node => `<button type="button" class="overview-idea" data-focus-node="${node.id}"><strong>${esc(node.title)}</strong><small>${esc(presentation(node).label)}</small>${node.summary ? `<span>${esc(node.summary)}</span>` : ''}</button>`).join('') : `<p class="overview-empty">${esc(group.empty)}</p>`;
  if ($('#overview-list').innerHTML !== list) $('#overview-list').innerHTML = list;
  if (focusedIdea) ([...$('#overview-list').querySelectorAll('[data-focus-node]')].find(button => button.dataset.focusNode === focusedIdea) || $(`[data-filter="${state.filter}"]`))?.focus({ preventScroll: true });
}
$('#overview-filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]'); if (!button) return;
  state.filter = state.filter === button.dataset.filter ? null : button.dataset.filter;
  $('#node-results').hidden = true; renderOverview();
});
$('#overview-filters').addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' && state.filter) { event.preventDefault(); $('#overview-list button')?.focus(); }
});
$('#close-overview').addEventListener('click', () => { const filter = state.filter; closeOverview(); $(`[data-filter="${filter}"]`)?.focus(); });
$('#overview-panel').addEventListener('keydown', event => {
  if (event.key === 'Escape') { const filter = state.filter; closeOverview(); $(`[data-filter="${filter}"]`)?.focus(); }
});

function renderHistory() {
  const historic = state.historyStep !== null;
  $('#history-panel').hidden = !historic;
  $('#show-history').setAttribute('aria-expanded', String(historic));
  $('#show-history').disabled = !state.timeline.steps.length;
  $('#show-brief').textContent = historic ? 'Today’s brief' : 'Map brief';
  if (!historic) return;
  const step = state.timeline.steps[state.historyStep], total = state.timeline.steps.length;
  const label = historyStepLabel(step, total);
  $('#history-slider').max = String(Math.max(0, total - 1)); $('#history-slider').value = String(state.historyStep);
  $('#history-slider').disabled = total < 2;
  $('#history-slider').setAttribute('aria-valuetext', label);
  $('#history-description').textContent = label;
  $('#history-previous').disabled = state.historyStep <= 0;
  $('#history-next').disabled = state.historyStep >= total - 1;
  $('#history-date').textContent = step?.at ? new Date(step.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'The date of these additions was not recorded.';
  $('#history-note').textContent = `Shows when ideas and connections were added. Findings, status and layout are from today. Read-only.${state.timeline.incomplete ? ' Earlier maps may have incomplete dates; undated additions appear in their own step.' : ''}`;
  $('#history-updates').hidden = state.map.revision === state.historySource.revision;
}
function setGrowthStep(index) {
  if (!state.map || gesture || state.mutating) return;
  if (!state.historySource) state.historySource = structuredClone(state.map);
  const timeline = growthTimeline(state.historySource);
  if (!timeline.steps.length) { state.historySource = null; return; }
  state.historyStep = Math.min(timeline.latestStep, Math.max(0, Number(index)));
  renderMap(false, true);
}
function returnLive() {
  state.historySource = null; state.historyStep = null;
  renderMap(false, true);
  $('#show-history').focus({ preventScroll: true });
}
$('#show-history').addEventListener('click', () => { if (state.historyStep !== null) returnLive(); else setGrowthStep(state.timeline.latestStep); });
$('#return-live').addEventListener('click', returnLive);
$('#history-slider').addEventListener('input', event => setGrowthStep(event.target.value));
$('#history-previous').addEventListener('click', () => setGrowthStep(state.historyStep - 1));
$('#history-next').addEventListener('click', () => setGrowthStep(state.historyStep + 1));

let briefVersion = 0;
async function showBrief(nodeId = null) {
  if (!state.map) return;
  const mapId = state.map.id, version = ++briefVersion;
  state.brief = null; state.briefScope = nodeId;
  $('#brief-title').textContent = nodeId ? 'Branch brief' : 'Map brief';
  $('#brief-description').textContent = 'Extracted from your latest saved map. Includes recorded findings, decisions, open questions and next directions.';
  $('#brief-content').textContent = ''; $('#brief-status').textContent = 'Preparing your brief…';
  $('#copy-brief').disabled = true; $('#download-brief').disabled = true; $('#retry-brief').hidden = true; $('#brief-copy-fallback').hidden = true;
  if (!$('#brief-dialog').open) $('#brief-dialog').showModal();
  try {
    const brief = await api(`/maps/${mapId}/brief${nodeId ? `?node=${encodeURIComponent(nodeId)}` : ''}`);
    if (version !== briefVersion) return;
    state.brief = brief;
    $('#brief-description').textContent = `${brief.title}. Extracted from your latest saved ${nodeId ? 'branch and its descendants' : 'map'}.`;
    $('#brief-content').innerHTML = briefPreview(brief);
    $('#brief-status').textContent = `Saved revision ${brief.revision}. This brief summarizes recorded material; it does not run new research.`;
    $('#copy-brief').disabled = false; $('#download-brief').disabled = false;
  } catch (error) {
    if (version !== briefVersion) return;
    $('#brief-status').textContent = `Could not prepare the brief. ${error.message}`; $('#retry-brief').hidden = false;
  }
}
$('#show-brief').addEventListener('click', () => showBrief());
$('#retry-brief').addEventListener('click', () => showBrief(state.briefScope));
$('#copy-brief').addEventListener('click', async () => {
  if (!state.brief) return;
  try { await navigator.clipboard.writeText(state.brief.markdown); $('#brief-status').textContent = 'Brief copied. Paste it into a document or your agent.'; }
  catch { const field = $('#brief-copy-fallback'); field.value = state.brief.markdown; field.hidden = false; field.focus(); field.select(); $('#brief-status').textContent = 'Copy the selected brief text below.'; }
});
$('#download-brief').addEventListener('click', () => {
  if (!state.brief) return;
  const url = URL.createObjectURL(new Blob([state.brief.markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = briefFilename(state.brief.title); document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); $('#brief-status').textContent = 'Brief downloaded as Markdown.';
});

function detailFocusKey(element) {
  const form = element.closest('form'), editor = element.closest('details[data-editor]');
  return JSON.stringify([element.tagName, element.getAttribute('href'),
    ...['explore', 'cancel', 'accept', 'branchBrief', 'select'].map(key => element.dataset[key] || null),
    form?.dataset.question || form?.id || null, editor?.dataset.editor || null]);
}
function renderDetail(force = false) {
  const detail = $('#detail'), previousNode = detail.dataset.nodeId;
  const historic = state.historyStep !== null;
  const active = detail.contains(document.activeElement) ? document.activeElement : null;
  // Keep the DOM control itself: copying its value/caret loses native undo and IME composition.
  if (!force && previousNode === state.selected && detail.dataset.history === String(historic) && active?.dataset.draft) {
    state.detailDeferred = true;
    return;
  }
  state.detailDeferred = false;
  detail.dataset.history = String(historic);
  for (const editor of detail.querySelectorAll('details[data-editor]')) state.editors[`${previousNode}:${editor.dataset.editor}`] = editor.open;
  const focus = active ? active.dataset.draft ? { key: active.dataset.draft, start: active.selectionStart, end: active.selectionEnd } : { control: detailFocusKey(active) } : null;
  const scroll = previousNode === state.selected ? detail.scrollTop : 0;
  detail.dataset.nodeId = state.selected || '';
  const n = state.visibleMap.nodes.find(n => n.id === state.selected);
  if (!n) { detail.innerHTML = `<div class="detail-empty"><span>◇</span>${historic ? 'Select an idea visible at this growth step to read today’s findings.' : 'Select an idea to look closer.'}</div>`; return; }
  const completed = n.completed || n.status === 'explored';
  const pending = ['suggested', 'queued', 'running', 'awaiting-answer', 'interrupted'].includes(n.status);
  const job = state.visibleMap.jobs.filter(j => j.nodeId === n.id).at(-1);
  const related = state.visibleMap.edges.filter(e => e.type !== 'contains' && (e.from === n.id || e.to === n.id));
  const nearby = state.visibleMap.nodes.filter(node => node.id === n.parentId || node.parentId === n.id);
  const questionHtml = n.questions.map(q => q.answer || q.supersededAt || completed || historic ? `<div class="answer"><strong>${esc(q.text)}</strong>${q.answer ? `${q.supersededAt ? '<em>Answer from an earlier premise.</em><br>' : ''}${esc(q.answer)}` : q.supersededAt ? 'Superseded by a changed premise; no answer is needed.' : historic ? 'Unanswered. Return to live to continue this question.' : 'Unanswered historical question. Add a new direction to investigate it.'}</div>` : `<form class="question-box" data-question="${q.id}" data-node-id="${n.id}"><div class="question-label">A question for you</div><p id="question-label-${q.id}">${esc(q.text)}</p><textarea name="answer" aria-labelledby="question-label-${q.id}" placeholder="What do you think?" maxlength="12000" data-draft="${q.id}" required>${esc(state.drafts[q.id] ?? '')}</textarea><button type="submit" class="primary">Save answer & continue</button></form>`).join('');
  $('#detail').innerHTML = `<div class="detail-kind"><span class="kind-tag"><b aria-hidden="true">${glyphs[n.kind]}</b>${n.kind.charAt(0).toUpperCase() + n.kind.slice(1)}</span><span class="status-label ${pending ? 'pending' : ''}">${esc(presentation(n).label)}</span></div><h2>${esc(n.title)}</h2><p class="detail-summary">${esc(n.summary)}</p>
    ${historic ? '<p class="state-note history-detail-note">Read-only growth history. These are today’s findings and status, not a past version of the research.</p>' : ''}
    ${n.stale ? '<p class="state-note warning">An earlier premise changed. These findings need another look before you rely on them.</p>' : ''}
    ${completed && !historic ? '<p class="state-note">This branch is complete. Add a new direction to keep exploring; these findings stay here.</p>' : ''}
    ${n.status === 'suggested' && !historic ? '<p class="state-note">A possible direction. Nothing runs until you choose to explore it.</p>' : ''}
    ${n.status === 'queued' && !historic ? `<p class="state-note">${agentListening() ? 'Your agent will pick up this branch next.' : 'Saved in the queue. Connect your agent to start this investigation.'}</p>` : ''}
    ${n.status === 'running' && !historic ? '<p class="state-note">Your agent is exploring this direction. New questions and findings will appear here.</p>' : ''}
    ${job?.error ? `<p class="state-note warning">${esc(job.error)}</p>` : ''}
    ${!historic ? `<div class="detail-actions">${!completed && ['suggested', 'interrupted'].includes(n.status) ? `<button class="primary" data-explore="${n.id}">${n.status === 'suggested' ? 'Explore this branch' : 'Retry exploration'}</button>` : ''}${!completed && ['queued', 'running'].includes(n.status) ? `<button class="secondary" data-cancel="${n.id}">Stop exploration</button>` : ''}${n.status === 'explored' && n.reviewState !== 'accepted' && !n.stale ? `<button class="secondary" data-accept="${n.id}">Accept finding</button>` : ''}<button class="secondary" data-branch-brief="${n.id}">Branch brief</button></div>` : ''}
    ${questionHtml}
    ${nearby.length ? `<h3 class="section-label">Nearby ideas</h3>${nearby.slice(0, 12).map(node => `<button class="relationship" data-select="${node.id}">${node.id === n.parentId ? 'Back to parent' : esc(presentation(node).label)}<strong>${esc(node.title)}</strong></button>`).join('')}${nearby.length > 12 ? '<p class="form-note">More directions are available through Find an idea.</p>' : ''}` : ''}
    ${n.body && n.body !== n.summary ? `<h3 class="section-label">${n.status === 'suggested' ? 'What to explore' : 'Notes & findings'}</h3><div class="prose">${prose(n.body)}</div>` : ''}
    ${job?.stale && job.result ? `<h3 class="section-label">Result from the earlier premise</h3><div class="prose">${prose(job.result.body)}</div>` : ''}
    ${n.sources.length ? `<h3 class="section-label">Sources & evidence</h3>${n.sources.map(s => `<a class="evidence-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} <span aria-hidden="true">↗</span><small>${esc(s.note)}</small></a>`).join('')}` : ''}
    ${related.length ? `<h3 class="section-label">Connected thinking</h3>${related.map(e => { const target = state.visibleMap.nodes.find(node => node.id === (e.from === n.id ? e.to : e.from)); return target ? `<button class="relationship" data-select="${target.id}">${esc(e.type.replaceAll('_', ' '))}<strong>${esc(target.title)}</strong></button>` : ''; }).join('')}` : ''}
    ${!historic ? `<details data-editor="suggest"><summary>Add a direction</summary><form id="suggest-form" data-node-id="${n.id}"><label for="branch-title">What's worth exploring?</label><input id="branch-title" name="title" maxlength="100" data-draft="${n.id}-title" value="${esc(state.drafts[`${n.id}-title`] ?? '')}" required><label for="branch-body">A little context</label><textarea id="branch-body" name="body" rows="3" maxlength="4000" data-draft="${n.id}-branch">${esc(state.drafts[`${n.id}-branch`] ?? '')}</textarea><button type="submit" class="secondary">Add suggested branch</button></form></details>
    <details data-editor="revise"><summary>${completed ? 'Explore a changed premise' : 'Revise this premise'}</summary><form id="revise-form" data-completed="${completed}" data-node-id="${n.id}"><label for="revised-body">What changed?</label><textarea id="revised-body" name="body" rows="5" maxlength="16000" required data-draft="${n.id}-revision">${esc(state.drafts[`${n.id}-revision`] ?? n.prompt ?? n.body)}</textarea><p class="form-note">${completed ? 'Creates a new inactive branch and flags affected findings for review. The original premise and evidence are preserved.' : "Dependent findings will be marked for review. Research won't restart automatically."}</p><button type="submit" class="secondary">${completed ? 'Add changed-premise branch' : 'Save revised premise'}</button></form></details>` : ''}
    ${job?.contextCharacters ? `<p class="run-note">Last investigation used ${job.contextCharacters.toLocaleString()} characters of map context. Only relevant context is sent.</p>` : ''}`;
  for (const editor of detail.querySelectorAll('details[data-editor]')) editor.open = Boolean(state.editors[`${n.id}:${editor.dataset.editor}`]);
  if (focus && previousNode === n.id) {
    const control = focus.key ? [...detail.querySelectorAll('[data-draft]')].find(item => item.dataset.draft === focus.key)
      : [...detail.querySelectorAll('button, a[href], summary')].find(item => !item.disabled && detailFocusKey(item) === focus.control);
    if (control) { control.focus({ preventScroll: true }); if (focus.key && focus.start !== null) control.setSelectionRange(focus.start, focus.end); }
    else { detail.tabIndex = -1; detail.focus({ preventScroll: true }); }
  }
  detail.scrollTop = scroll;
}
function act(nodeId, type, extra = {}) {
  if (!state.map || state.historyStep !== null) return Promise.resolve(false);
  const mapId = state.map.id;
  const execute = async () => {
    if (state.map?.id !== mapId || state.historyStep !== null) return false;
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
let createVersion = 0;
function showCreate() {
  createVersion++;
  $('#create-error').textContent = '';
  $('#create-form').querySelector('button[type="submit"]').disabled = false;
  $('#create-dialog').showModal(); $('#idea').focus();
}
function showWelcome() {
  openVersion++; state.map = null; state.visibleMap = null; state.selected = null; state.historyStep = null; state.historySource = null; state.filter = null; localStorage.removeItem('grill-my-mind-map'); navigation(false);
  $('#welcome').classList.remove('hidden'); $('#workspace').classList.add('hidden'); $('#map-title').textContent = 'A place to think'; renderRail();
}
$('.brand').addEventListener('click', event => { event.preventDefault(); showWelcome(); location.hash = ''; });
$('#new-map').addEventListener('click', showCreate); $('#start-exploration').addEventListener('click', showCreate);
for (const button of document.querySelectorAll('.close-dialog')) button.addEventListener('click', () => button.closest('dialog').close());
function showHelp() {
  const session = state.session || {};
  const target = state.map ? `Continue only map ${state.map.id} (${state.map.title}). Pick up activated branches for this map only.` : 'Ask me which saved map to continue, then pick up its activated branches.';
  $('#agent-prompt').value = `Use the Grill My Mind skill at ${session.skillPath || 'skills/grill-my-mind/SKILL.md'} to continue the workspace ${session.workspacePath || session.workspace || ''}. The local app is running. ${target} Use the command bridge, keep context focused, and send findings and questions back to the map.`;
  $('#agent-copy-status').textContent = ''; $('#help-dialog').showModal();
}
$('#bridge-status').addEventListener('click', showHelp);
$('#copy-prompt').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#agent-prompt').value); $('#agent-copy-status').textContent = 'Prompt copied. Paste it into your coding agent.'; } catch { $('#agent-prompt').focus(); $('#agent-prompt').select(); $('#agent-copy-status').textContent = 'Copy the selected prompt above.'; } });
$('#create-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.target, button = event.submitter || form.querySelector('button[type="submit"]');
  button.disabled = true; $('#create-error').textContent = '';
  const version = createVersion, navigationVersion = openVersion, dialog = $('#create-dialog');
  const data = new FormData(form), submittedIdea = data.get('idea'), submittedTitle = data.get('title');
  const idea = submittedIdea.trim(), title = submittedTitle.trim() || idea.split(/\s+/).slice(0, 7).join(' ').slice(0, 100);
  const currentDraft = () => version === createVersion && navigationVersion === openVersion && dialog.open && $('#idea').value === submittedIdea && $('#title').value === submittedTitle;
  try {
    const map = await api('/maps', { title, idea });
    await refresh();
    const follow = currentDraft();
    if (follow) { dialog.close(); form.reset(); await openMap(map.id); }
    toast(follow ? 'Your idea is saved. Its first exploration is queued.' : `“${map.title}” is saved in Maps. Its first exploration is queued.`);
  } catch (error) {
    if (currentDraft()) $('#create-error').textContent = error.message;
    else toast(`Could not save “${title}”: ${error.message}`);
  } finally {
    if (version === createVersion) button.disabled = false;
  }
});
$('#open-example').addEventListener('click', async event => {
  event.target.disabled = true;
  try { const existing = state.maps.find(m => m.demo); const map = existing || await api('/demo', {}); await refresh(); await openMap(map.id); }
  catch (error) { toast(error.message); } finally { event.target.disabled = false; }
});
document.addEventListener('click', async event => {
  if (suppressClick) { suppressClick = false; return; }
  const map = event.target.closest('[data-map]'); if (map) return openMap(map.dataset.map);
  if (!event.target.closest('#node-finder')) $('#node-results').hidden = true;
  const focus = event.target.closest('[data-focus-node]'); if (focus) return focusNode(focus.dataset.focusNode);
  const select = event.target.closest('[data-select]'); if (select) return focusNode(select.dataset.select);
  const example = event.target.closest('[data-example]');
  if (example) { const starter = starterIdeas[example.dataset.example]; if (starter) { $('#idea').value = starter.idea; $('#title').value = starter.title; $('#idea').focus(); } return; }
  const brief = event.target.closest('[data-branch-brief]'); if (brief) return showBrief(brief.dataset.branchBrief);
  for (const [attribute, action, message] of [['explore', 'activate', 'Exploration queued.'], ['cancel', 'cancel', 'Cancelled. An active agent may finish its current step.'], ['accept', 'accept', 'Finding accepted.']]) {
    const button = event.target.closest(`[data-${attribute}]`);
    if (button) { button.disabled = true; if (await act(button.dataset[attribute], action)) toast(message); button.disabled = false; return; }
  }
  const card = event.target.closest('.node'); if (card) focusNode(card.dataset.node);
});
$('#detail').addEventListener('input', event => { if (event.target.dataset.draft) state.drafts[event.target.dataset.draft] = event.target.value; });
$('#detail').addEventListener('submit', async event => {
  event.preventDefault(); if (state.historyStep !== null) return;
  const submittedMapId = state.map?.id;
  const form = event.target; const button = event.submitter; button.disabled = true;
  const data = Object.fromEntries(new FormData(form)); const node = form.dataset.nodeId;
  const fields = [...form.querySelectorAll('[data-draft]')];
  const submittedDrafts = new Map(fields.map(field => [field.dataset.draft, field.value]));
  // An answer is final once saved; do not allow a second, unsavable answer during the request.
  const answerFields = form.dataset.question ? fields.map(field => [field, field.readOnly]) : [];
  for (const [field] of answerFields) field.readOnly = true;
  try {
    let success = false;
    if (form.dataset.question) success = await act(node, 'answer', { questionId: form.dataset.question, answer: data.answer });
    if (form.id === 'suggest-form') success = await act(node, 'suggest', { title: data.title, body: data.body.trim() || data.title });
    if (form.id === 'revise-form') success = await act(node, form.dataset.completed === 'true' ? 'fork-revision' : 'revise', data);
    if (success) {
      let newerDrafts = false;
      for (const [key, value] of submittedDrafts) {
        if (state.drafts[key] === value) delete state.drafts[key];
        else if (state.drafts[key] !== undefined) newerDrafts = true;
      }
      const active = $('#detail').contains(document.activeElement) ? document.activeElement : null;
      const preserveActiveDraft = active?.dataset.draft && (!submittedDrafts.has(active.dataset.draft) || active.value !== submittedDrafts.get(active.dataset.draft));
      if (state.visibleMap) renderDetail(state.map?.id === submittedMapId && state.selected === node && !preserveActiveDraft);
      toast(form.dataset.question ? 'Answer saved. Your branch will continue.' : newerDrafts ? 'Saved the submitted version. Your newer edits are kept as a draft.' : 'Saved to your map.');
    }
  } finally {
    for (const [field, readOnly] of answerFields) field.readOnly = readOnly;
    button.disabled = false;
  }
});
$('#zoom-in').addEventListener('click', () => zoom(1.2)); $('#zoom-out').addEventListener('click', () => zoom(1 / 1.2)); $('#fit-map').addEventListener('click', fitMap);
$('#canvas').addEventListener('wheel', event => { event.preventDefault(); if (gesture) return; const rect = $('#canvas').getBoundingClientRect(); zoom(event.deltaY < 0 ? 1.08 : 1 / 1.08, event.clientX - rect.left, event.clientY - rect.top); }, { passive: false });
$('#canvas').addEventListener('pointerdown', event => {
  if (event.button !== 0 || !event.isPrimary || gesture || state.mutating || !state.map) return;
  const node = event.target.closest('.node');
  if (node && state.historyStep !== null) return;
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
  } else { state.overview = false; state.x = gesture.x + dx; state.y = gesture.y + dy; transform(); }
});
async function finishGesture(event) {
  if (!gesture || event.pointerId !== gesture.pointer) return;
  const finished = gesture; gesture = null; $('#canvas').classList.remove('dragging');
  if ($('#canvas').hasPointerCapture(event.pointerId)) $('#canvas').releasePointerCapture(event.pointerId);
  if (finished.moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 100); }
  if (event.type !== 'pointerup') { renderMap(); return; }
  if (finished.nodeId) {
    if (finished.moved) {
      selectNode(finished.nodeId);
      $('#saved-state').textContent = 'Saving position…';
      await act(finished.nodeId, 'position', { ...state.positions[finished.nodeId] });
    } else {
      suppressClick = true; setTimeout(() => { suppressClick = false; }, 100);
      focusNode(finished.nodeId);
    }
  }
}
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) $('#canvas').addEventListener(type, finishGesture);
$('#nodes').addEventListener('keydown', async event => {
  const node = event.target.closest('.node');
  if (!node || !event.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault(); if (state.mutating || gesture || state.historyStep !== null) return;
  const id = node.dataset.node, pos = state.positions[id];
  const x = pos.x + (event.key === 'ArrowLeft' ? -24 : event.key === 'ArrowRight' ? 24 : 0);
  const y = pos.y + (event.key === 'ArrowUp' ? -24 : event.key === 'ArrowDown' ? 24 : 0);
  selectNode(id); await act(id, 'position', { x, y }); $(`[data-node="${id}"]`)?.focus();
});
window.addEventListener('resize', () => { if (state.map && state.historyStep === null) { if (state.overview) fitMap(); else centerSelected(); } });
window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (id && id !== state.map?.id) openMap(id); else if (!id) showWelcome(); });
try {
  const session = await (await fetch('/api/session')).json(); state.token = session.token; state.session = session;
  $('#workspace-name').textContent = session.workspace;
  await refresh();
  const saved = location.hash.slice(1) || localStorage.getItem('grill-my-mind-map');
  if (saved && state.maps.some(m => m.id === saved)) await openMap(saved);
  setInterval(refresh, 2500);
} catch (error) { toast(`Cannot connect to the workspace: ${error.message}`); connectionView(true); }
