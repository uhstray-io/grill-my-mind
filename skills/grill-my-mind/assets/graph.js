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
  const positions = {}, domains = {}, occupied = new Map();
  const root = nodes.get(map.rootId) || map.nodes[0];
  if (!root) return { positions, domains };
  // Place each branch near its parent, independent of the total number of leaves.
  // A spatial grid keeps nodes apart without spreading every edge across the map.
  const gap = 84;
  const key = (x, y) => Math.floor(x / gap) + ',' + Math.floor(y / gap);
  function available(point) {
    const cx = Math.floor(point.x / gap), cy = Math.floor(point.y / gap);
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 1; y <= cy + 1; y++) {
      for (const other of occupied.get(x + ',' + y) || []) {
        if (Math.hypot(point.x - other.x, point.y - other.y) < gap) return false;
      }
    }
    return true;
  }
  function reserve(id, point, domain) {
    positions[id] = point; domains[id] = domain;
    const cell = key(point.x, point.y);
    if (!occupied.has(cell)) occupied.set(cell, []);
    occupied.get(cell).push(point);
  }
  function nearby(parent, angle, index) {
    for (let ring = 0; ; ring++) {
      const radius = 112 + ring * 38;
      const count = 24 + ring * 6;
      for (let attempt = 0; attempt < count; attempt++) {
        const turn = Math.ceil(attempt / 2) * (attempt % 2 ? 1 : -1) * Math.PI * 2 / count;
        const direction = angle + turn + Math.sin(index * 2.4) * .12;
        const point = { x: parent.x + Math.cos(direction) * radius, y: parent.y + Math.sin(direction) * radius };
        if (available(point)) return point;
      }
    }
  }
  const queue = [];
  function component(node, domain) {
    if (positions[node.id]) return;
    reserve(node.id, queue.length ? nearby({ x: 0, y: 0 }, .5, queue.length) : { x: 0, y: 0 }, domain);
    queue.push(node);
    for (let cursor = queue.length - 1; cursor < queue.length; cursor++) {
      const parent = queue[cursor], point = positions[parent.id];
      const origin = positions[parent.parentId] || { x: point.x - 1, y: point.y };
      const outward = Math.atan2(point.y - origin.y, point.x - origin.x);
      const list = children.get(parent.id);
      list.forEach((child, index) => {
        if (positions[child.id]) return;
        const angle = parent.id === root.id ? -1.2 + index * 2.399963 : outward + (index - (list.length - 1) / 2) * .9;
        reserve(child.id, nearby(point, angle, queue.length), parent.id === root.id ? index : domains[parent.id]);
        queue.push(child);
      });
    }
  }
  component(root, 0);
  // Imported/disconnected nodes remain visible even if their parent is absent.
  for (const node of map.nodes) component(node, queue.length);
  // Relax crowded branches locally: short connections and readable node spacing
  // matter more than matching a symmetric ring. This runs once per topology.
  const points = map.nodes.map(node => positions[node.id]);
  const indices = new Map(map.nodes.map((node, index) => [node.id, index]));
  const springs = map.nodes.filter(node => indices.has(node.parentId)).map(node => [indices.get(node.id), indices.get(node.parentId)]);
  for (let step = 0; step < 120; step++) {
    const offsets = points.map(() => ({ x: 0, y: 0 }));
    for (const [a, b] of springs) {
      const dx = points[b].x - points[a].x, dy = points[b].y - points[a].y;
      const distance = Math.hypot(dx, dy) || 1;
      const pull = (distance - 112) / distance * .07;
      offsets[a].x += dx * pull; offsets[a].y += dy * pull;
      offsets[b].x -= dx * pull; offsets[b].y -= dy * pull;
    }
    for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
      const dx = points[b].x - points[a].x, dy = points[b].y - points[a].y;
      if (Math.abs(dx) >= 72 || Math.abs(dy) >= 72) continue;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance >= 72) continue;
      const push = (72 - distance) / distance * .65;
      offsets[a].x -= dx * push; offsets[a].y -= dy * push;
      offsets[b].x += dx * push; offsets[b].y += dy * push;
    }
    points.forEach((point, index) => {
      if (map.nodes[index].id === root.id) return;
      point.x += Math.max(-18, Math.min(18, offsets[index].x));
      point.y += Math.max(-18, Math.min(18, offsets[index].y));
    });
  }
  // Finish by separating circles; manual placements below always remain authoritative.
  for (let step = 0; step < 35; step++) {
    for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
      const dx = points[b].x - points[a].x, dy = points[b].y - points[a].y;
      const clearance = (map.nodes[a].id === root.id || map.nodes[b].id === root.id) ? 68 : 58;
      if (Math.abs(dx) >= clearance || Math.abs(dy) >= clearance) continue;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance >= clearance) continue;
      const push = (clearance - distance) / distance * .52;
      const aFixed = map.nodes[a].id === root.id, bFixed = map.nodes[b].id === root.id;
      if (!aFixed) { points[a].x -= dx * push * (bFixed ? 2 : 1); points[a].y -= dy * push * (bFixed ? 2 : 1); }
      if (!bFixed) { points[b].x += dx * push * (aFixed ? 2 : 1); points[b].y += dy * push * (aFixed ? 2 : 1); }
    }
  }
  for (const node of map.nodes) {
    const saved = map.view?.positions?.[node.id];
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) positions[node.id] = { x: saved.x, y: saved.y };
  }
  return { positions, domains };
}

export function connectionPath(from, to) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

export function overviewView(positions, viewport) {
  const points = Object.values(positions);
  if (!points.length) return { scale: 1, x: viewport.width / 2, y: viewport.height / 2 };
  const left = Math.min(...points.map(p => p.x)) - 115;
  const top = Math.min(...points.map(p => p.y)) - 60;
  const width = Math.max(...points.map(p => p.x)) + 115 - left;
  const height = Math.max(...points.map(p => p.y)) + 110 - top;
  const scale = Math.min(1.15, Math.max(1, viewport.width - 48) / width, Math.max(1, viewport.height - 40) / height);
  return { scale, x: (viewport.width - width * scale) / 2 - left * scale,
    y: (viewport.height - height * scale) / 2 - top * scale };
}

export function focusedView(point, viewport, scale = 1, neighbors = []) {
  scale = Math.max(1, Math.min(3, scale));
  if (neighbors.length) {
    const reachX = Math.max(60, ...neighbors.map(p => Math.abs(p.x - point.x) + 40));
    const reachY = Math.max(60, ...neighbors.map(p => Math.abs(p.y - point.y) + 40));
    scale = Math.min(scale, Math.max(1, viewport.width - 32) / (2 * reachX), Math.max(1, viewport.height - 32) / (2 * reachY));
  }
  return { scale, x: viewport.width / 2 - point.x * scale, y: viewport.height / 2 - point.y * scale };
}
