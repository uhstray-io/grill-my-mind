const edgeKey = edge => JSON.stringify([edge.from, edge.to, edge.type]);

function timestamp(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function buildTimeline(map) {
  const nodes = map.nodes || [], nodeIds = new Set(nodes.map(node => node.id));
  const edges = (map.edges || []).filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  const edgeKeys = new Set(edges.map(edgeKey));
  const nodeGroups = new Map(), edgeGroups = new Map(), dated = new Map(), recorded = [];
  const group = (kind, at) => ({ kind, at, nodeIds: new Set(), edgeKeys: new Set() });
  const unknown = group('unknown', null);
  const assignNode = (id, target) => { nodeGroups.set(id, target); target.nodeIds.add(id); };
  const assignEdge = (key, target) => { edgeGroups.set(key, target); target.edgeKeys.add(key); };
  const batches = map.growth?.version === 1 && Array.isArray(map.growth.batches) ? map.growth.batches : [];
  for (const batch of batches.filter(batch => batch && Number.isSafeInteger(batch.sequence) && batch.sequence > 0).toSorted((a, b) => a.sequence - b.sequence)) {
    const at = timestamp(batch.at);
    if (!at) continue;
    const target = group('recorded', at);
    recorded.push(target);
    for (const id of Array.isArray(batch.nodeIds) ? batch.nodeIds : []) {
      if (nodeIds.has(id) && !nodeGroups.has(id)) assignNode(id, target);
    }
    for (const edge of Array.isArray(batch.edges) ? batch.edges : []) {
      if (!edge || typeof edge !== 'object') continue;
      const key = edgeKey(edge);
      if (edgeKeys.has(key) && !edgeGroups.has(key)) assignEdge(key, target);
    }
  }
  function fallback(value) {
    const at = timestamp(value);
    if (!at) return unknown;
    if (!dated.has(at)) dated.set(at, group('dated', at));
    return dated.get(at);
  }
  for (const node of nodes) if (!nodeGroups.has(node.id)) assignNode(node.id, fallback(node.createdAt));
  for (const edge of edges) if (!edgeGroups.has(edgeKey(edge))) assignEdge(edgeKey(edge), fallback(edge.createdAt));

  // Existing dates predate adoption of the ledger. Sequence, not wall-clock time,
  // orders recorded transactions; an unknown-date step never implies a past date.
  const groups = [...dated.values()].sort((a, b) => a.at.localeCompare(b.at)).concat(recorded, unknown);
  const order = new Map(groups.map((item, index) => [item, index]));
  for (const edge of edges) {
    const key = edgeKey(edge), target = edgeGroups.get(key);
    if (order.get(target) < Math.max(order.get(nodeGroups.get(edge.from)), order.get(nodeGroups.get(edge.to)))) {
      target.edgeKeys.delete(key);
      assignEdge(key, unknown);
    }
  }
  const visibleNodes = [], visibleEdges = new Set(), edgeSteps = new Map();
  const steps = groups.filter(item => item.nodeIds.size || item.edgeKeys.size).map((item, index) => {
    const addedNodeIds = [...item.nodeIds];
    visibleNodes.push(...addedNodeIds);
    for (const key of item.edgeKeys) { visibleEdges.add(key); edgeSteps.set(key, index); }
    return { index, at: item.at, kind: item.kind, nodeIds: [...visibleNodes], nodeCount: visibleNodes.length,
      edgeCount: visibleEdges.size, addedNodeIds, addedEdgeCount: item.edgeKeys.size };
  });
  const unknownNodeCount = unknown.nodeIds.size, unknownEdgeCount = unknown.edgeKeys.size;
  return { timeline: { steps, latestStep: steps.length - 1, incomplete: !!(unknownNodeCount || unknownEdgeCount), unknownNodeCount, unknownEdgeCount }, edgeSteps };
}

// This describes additions only. Findings, work states, and positions are current.
export function growthTimeline(map) { return buildTimeline(map).timeline; }

export function mapAtGrowthStep(map, step) {
  const { timeline, edgeSteps } = buildTimeline(map);
  const index = Number.isFinite(step) ? Math.max(0, Math.min(timeline.latestStep, Math.trunc(step))) : timeline.latestStep;
  const visible = new Set(timeline.steps[index]?.nodeIds || []);
  const snapshot = structuredClone(map);
  snapshot.nodes = (snapshot.nodes || []).filter(node => visible.has(node.id));
  snapshot.edges = (snapshot.edges || []).filter(edge => visible.has(edge.from) && visible.has(edge.to) && edgeSteps.get(edgeKey(edge)) <= index);
  return snapshot;
}
