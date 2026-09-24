import { Problem, isCompleted } from './store.mjs';

// Pages are tied to a map revision so a resumed read cannot silently mix versions.
export function contextExcerpt(map, nodeId, options = {}) {
  const node = map.nodes.find(n => n.id === nodeId);
  if (!node) throw new Problem('Node not found.', 404);
  const section = options.section || 'summary';
  const offset = Number(options.offset ?? 0), limit = Number(options.limit ?? 4000);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 6000) throw new Problem('Use a non-negative offset and a limit from 1 to 6000.');
  if (offset > 0 && options.revision == null) throw new Problem('Pass the returned revision when continuing a page.', 409);
  if (options.revision != null && Number(options.revision) !== map.revision) throw new Problem('The map changed. Restart this read at offset 0.', 409);
  const query = String(options.query || '').trim().toLowerCase();
  if (query.length > 500) throw new Problem('Search query must be at most 500 characters.');
  let records;
  switch (section) {
    case 'summary': records = [`# ${node.title}\nNode: ${node.id}\nWork: ${node.status}\nCompleted: ${isCompleted(map, node)}\nReview: ${node.reviewState}\nStale: ${!!node.stale}\n\n${node.summary}\n\nSections: premise, findings, questions, sources, relationships. Read only the section needed; query filters question/evidence records.`]; break;
    case 'premise': records = [node.prompt || node.body]; break;
    case 'findings': records = [node.body]; break;
    case 'questions': records = node.questions.filter(q => !options.question || q.id === options.question).map(q => `## ${q.id}\nQuestion: ${q.text}\nAnswer: ${q.answer ?? '[Awaiting answer]'}${q.answeredAt ? `\nAnswered: ${q.answeredAt}` : ''}`); break;
    case 'sources': records = node.sources.map(s => `## ${s.title}\nURL: ${s.url}\nRetrieved: ${s.retrievedAt}\nEvidence: ${s.note}`); break;
    case 'relationships': records = map.edges.filter(e => e.from === node.id || e.to === node.id).map(e => `${e.from} ${e.type} ${e.to}`); break;
    default: throw new Problem('Unknown section. Use summary, premise, findings, questions, sources, or relationships.');
  }
  if (options.question && section !== 'questions') throw new Problem('Question IDs require the questions section.');
  if (options.question && !node.questions.some(q => q.id === options.question)) throw new Problem('Question not found.', 404);
  const totalRecords = records.length;
  if (query) records = records.filter(record => record.toLowerCase().includes(query));
  const source = records.join('\n\n');
  if (offset > source.length) throw new Problem('Offset is beyond this section.');
  const response = { mapId: map.id, revision: map.revision, nodeId, section, totalRecords, matchingRecords: records.length,
    totalCharacters: source.length, offset, excerpt: source.slice(offset, offset + limit), nextOffset: null };
  const finish = () => { response.nextOffset = offset + response.excerpt.length < source.length ? offset + response.excerpt.length : null; };
  finish();
  // Escaped strings can be much larger than their raw text; cap serialized output too.
  while (JSON.stringify(response, null, 2).length > 8000) { response.excerpt = response.excerpt.slice(0, Math.max(1, Math.floor(response.excerpt.length * .8))); finish(); }
  return response;
}
