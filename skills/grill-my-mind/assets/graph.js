export const workLabels = { suggested: 'Unexplored', queued: 'Queued', running: 'Researching', 'awaiting-answer': 'Needs your answer', explored: 'Explored', interrupted: 'Ready to retry' };

export function presentation(node) {
  const work = workLabels[node.status] || node.status;
  return {
    label: [work, node.stale ? 'needs review' : node.reviewState === 'accepted' ? 'accepted' : ''].filter(Boolean).join(' · '),
    lit: node.status === 'explored' && !node.stale,
  };
}

// Saved coordinates are absolute centers. Layout never writes, activates, or edits nodes.
export function constellationLayout(map) {
  const nodes = new Map(map.nodes.map(node => [node.id, node]));
  const children = new Map(map.nodes.map(node => [node.id, []]));
  for (const node of map.nodes) children.get(node.parentId)?.push(node);
  const positions = {}, domains = {}, weights = new Map(), measuring = new Set();
  function weight(node) {
    if (weights.has(node.id)) return weights.get(node.id);
    if (measuring.has(node.id)) return 1;
    measuring.add(node.id);
    const value = Math.max(1, children.get(node.id).reduce((sum, child) => sum + weight(child), 0));
    measuring.delete(node.id); weights.set(node.id, value); return value;
  }
  const root = nodes.get(map.rootId) || map.nodes[0];
  if (!root) return { positions, domains };
  const visited = new Set();
  function place(node, depth, start, span, domain) {
    if (visited.has(node.id)) return;
    visited.add(node.id); domains[node.id] = domain;
    const angle = start + span / 2;
    const radius = depth * Math.max(220, weight(root) * 13);
    positions[node.id] = depth ? { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * .76 } : { x: 0, y: 0 };
    const list = children.get(node.id), total = list.reduce((sum, child) => sum + weight(child), 0);
    let cursor = start;
    list.forEach((child, index) => {
      const section = span * weight(child) / total;
      place(child, depth + 1, cursor, section, depth ? domain : index);
      cursor += section;
    });
  }
  place(root, 0, -Math.PI, Math.PI * 2, 0);
  // Imported/disconnected nodes remain visible even if their parent is absent.
  for (const node of map.nodes) if (!visited.has(node.id)) place(node, 1, 0, Math.PI * 2, visited.size);
  for (const node of map.nodes) {
    const saved = map.view?.positions?.[node.id];
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) positions[node.id] = { x: saved.x, y: saved.y };
  }
  return { positions, domains };
}

export function connectionPath(from, to) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}
