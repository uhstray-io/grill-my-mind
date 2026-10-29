import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../skills/grill-my-mind/scripts/store.mjs';
import { startServer } from '../skills/grill-my-mind/scripts/server.mjs';

// Deliberately illustrative: never read or change the owner's maps or preferences.
const root = fileURLToPath(new URL('../', import.meta.url));
await mkdir(path.join(root, '.test-output'), { recursive: true });
const workspace = await mkdtemp(path.join(root, '.test-output', 'review-'));
const store = new Store(path.join(workspace, 'ideas'));
const map = await store.create({ title: 'Demo — field notes without a connection', idea: 'Illustrative review scenario, not user decisions: a small team records field observations offline. Explore sync conflicts, privacy, and the smallest useful version.' });
const finish = async (nodeId, result) => {
  let latest = await store.get(map.id);
  if (latest.nodes.find(n => n.id === nodeId).status === 'suggested') await store.action(map.id, { type: 'activate', nodeId, expectedRevision: latest.revision });
  const packet = await store.claim('review-fixture', map.id);
  if (!packet || packet.selected.id !== nodeId) throw new Error('Unexpected demo queue state.');
  return store.complete(map.id, packet.jobId, packet.claimKey, result);
};
let latest = await finish(map.rootId, { summary: 'The core tension is reliable capture versus the complexity of sharing.', body: 'This illustrative map separates sync decisions, local privacy, and a pilot. No external claims have been researched. All answers and accepted findings below are demo fixtures.',
  suggestions: [{ title: 'When two people edit offline', body: 'Compare preserving both copies with automatic merging. A conflict policy shapes the data model.', kind: 'decision' },
    { title: 'What should stay on the device?', body: 'Establish which observations may leave the device and what happens when it is lost.', kind: 'risk' },
    { title: 'A one-week pilot', body: 'Find a reversible way to test field capture with two volunteers.', kind: 'research' },
    { title: 'Photos in low-connectivity areas', body: 'Test a queue for large attachments after the basic capture workflow works.', kind: 'research' }] });
const conflict = latest.nodes.find(n => n.title === 'When two people edit offline');
latest = await finish(conflict.id, { summary: 'For the demo, preserve both versions and ask a person to reconcile.', body: 'Fixture choice: silent merging risks discarding intent. Keep originals and make conflicts visible. This is a provisional product tradeoff, not a researched universal rule.' });
latest = await store.action(map.id, { type: 'accept', nodeId: conflict.id, expectedRevision: latest.revision });
latest = await store.action(map.id, { type: 'fork-revision', nodeId: conflict.id, expectedRevision: latest.revision, title: 'What if nobody can resolve conflicts?', body: 'Demo changed assumption: the team cannot assign a reviewer each day. Reconsider the conflict policy without discarding the original finding.' });
const privacy = latest.nodes.find(n => n.kind === 'risk');
latest = await finish(privacy.id, { summary: 'The allowed sharing boundary needs a human decision.', body: 'Local storage and team synchronization imply different exposure. Ask for the actual boundary before selecting a design.', questions: ['Which observations, if any, may leave a team member’s device?'], suggestions: [{ title: 'Lost-device recovery', body: 'Explore recovery only after the sharing boundary is known.', kind: 'risk' }] });
const pilot = latest.nodes.find(n => n.title === 'A one-week pilot');
latest = await finish(pilot.id, { summary: 'Try one capture form and a manual export with two volunteers.', body: 'Illustrative pilot: collect missed-capture incidents and unresolved conflicts for a week. A successful trial should reduce re-entry without hiding uncertainty.' });
latest = await store.action(map.id, { type: 'accept', nodeId: pilot.id, expectedRevision: latest.revision });
const photo = latest.nodes.find(n => n.title === 'Photos in low-connectivity areas');
latest = await store.action(map.id, { type: 'activate', nodeId: photo.id, expectedRevision: latest.revision });
console.log(`Review data: ${workspace}\nMap: ${map.id}\nAll content and actions are illustrative fixtures. The owner's ideas directory was not accessed.`);
if (process.argv.includes('--serve')) {
  const app = await startServer({ workspace, port: 0 });
  console.log(`Open ${app.address}/#${map.id}\nKeep this process running while reviewing. This server does not run research automatically.`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => app.close().then(() => process.exit(0)));
}
