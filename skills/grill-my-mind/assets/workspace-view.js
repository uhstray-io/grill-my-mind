import { presentation } from './graph.js';

export const overviewFilters = [
  { id: 'answer', label: 'Needs your answer', empty: 'No questions are waiting for you.', matches: node => node.status === 'awaiting-answer' },
  { id: 'queued', label: 'Queued', empty: 'No branches are waiting in the queue.', matches: node => node.status === 'queued' },
  { id: 'unexplored', label: 'Unexplored', empty: 'Every suggested direction has been explored or started.', matches: node => node.status === 'suggested' },
  { id: 'stale', label: 'Needs review', empty: 'No findings are flagged by a changed premise.', matches: node => Boolean(node.stale) },
];

export function mapOverview(map) {
  const nodes = map?.nodes || [];
  return {
    total: nodes.length,
    explored: nodes.filter(node => node.status === 'explored').length,
    accepted: nodes.filter(node => node.reviewState === 'accepted' && !node.stale && node.status === 'explored').length,
    running: nodes.filter(node => node.status === 'running').length,
    groups: overviewFilters.map(filter => ({ ...filter, nodes: nodes.filter(filter.matches) })),
  };
}

// A historical selection must refer to a visible idea, never a hidden future one.
export function visibleSelection(map, selected) {
  return map.nodes.some(node => node.id === selected) ? selected : null;
}

export function briefFilename(title) {
  const name = String(title || 'exploration').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').trim().slice(0, 100) || 'exploration';
  return `${name}-brief.md`;
}

export function briefPreview(brief) {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const counts = brief.counts;
  // Show questions and answers separately so long prompts cannot hide the answer.
  const itemsWithAnswers = brief.sections.map(section => ({ ...section, items: section.items.map(item => item.question ? { ...item, text: `Question: ${item.question}\nAnswer: ${item.text}` } : item) }));
  brief = { ...brief, sections: itemsWithAnswers };
  return `${brief.originalIdea ? `<h3>Original idea</h3><blockquote>${esc(brief.originalIdea)}</blockquote>` : ''}<h3>Progress</h3><p>${counts.nodes} ideas; ${counts.explored} explored; ${counts.accepted} accepted and current; ${counts.stale} need review; ${counts.awaitingAnswer} awaiting answers.</p><p class="brief-scope-note">A bounded summary of saved material. Sections may overlap; explored findings have not necessarily been verified.</p>${brief.sections.map(section => `<section class="brief-section"><h3>${esc(section.label)}</h3>${section.items.length ? section.items.map(item => `<article class="brief-item"><strong>${esc(item.title)}</strong><small class="brief-item-state">${esc(presentation(item).label)}</small><p>${esc(item.text)}</p><small class="brief-reference">${esc(item.nodeId)}${item.questionId ? ` · ${esc(item.questionId)}` : ''}</small></article>`).join('') : '<p class="brief-empty">None recorded in this scope.</p>'}${section.omitted ? `<p class="brief-omitted">${section.omitted} more ${section.omitted === 1 ? 'record' : 'records'} in this section. Open the map to inspect the rest.</p>` : ''}</section>`).join('')}`;
}

export function historyStepLabel(step, total) {
  if (!step) return 'No growth has been recorded yet';
  const additions = step.kind === 'unknown' ? 'Additions with unknown dates' : step.kind === 'dated' ? 'From recorded node dates' : 'Recorded addition';
  return `Step ${step.index + 1} of ${total} · ${step.nodeCount} ${step.nodeCount === 1 ? 'idea' : 'ideas'} · ${step.edgeCount} ${step.edgeCount === 1 ? 'connection' : 'connections'} · ${additions}`;
}

export const starterIdeas = {
  architecture: { title: 'Choose an architecture', idea: 'Help me choose an architecture for a new application. Compare a modular monolith with separate services. Ask about my team, workload, deployment constraints and expected growth before recommending a direction. Make tradeoffs, failure modes and a first practical experiment clear.' },
  product: { title: 'Pressure-test a product idea', idea: 'I have a product idea and want to find out whether it solves an important problem. Help me define the customer, challenge my assumptions, compare alternatives and choose a small experiment to test demand. Start by asking who it serves and what problem they face.' },
  decision: { title: 'Think through a personal decision', idea: 'Help me think through an important personal decision. Ask about my options, priorities, constraints and what feels uncertain. Separate facts from assumptions, look for overlooked alternatives and identify a reversible next step. Start by asking what decision I am facing.' },
};
