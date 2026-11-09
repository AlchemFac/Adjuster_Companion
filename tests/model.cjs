const assert = require('node:assert/strict');
const { validDate, normalizeWorkspace, migrateLegacyTasks, readWorkspaceBackup } = require('../workspace-data.js');
const old = [{ id: 'old-1', title: 'Generic review', date: '2026-11-08', done: false, nextAction: 'Read practice outline', checklist: { type: 'day-one', set: 'Practice A', step: 'file-review' } }, { id: 'old-2', title: 'Older complete task', date: '', done: true }];
const migrated = migrateLegacyTasks(old);
assert.equal(migrated.claims[0].reference, 'Existing work');
assert.equal(migrated.tasks[0].id, 'old-1');
assert.equal(migrated.tasks[0].date, migrated.tasks[0].followUpDate);
assert.equal(migrated.tasks[0].nextAction, old[0].nextAction);
assert.equal(migrated.tasks[1].completedOn, '');
assert.equal(migrated.tasks[1].status, 'Completed');
assert.ok(!('checklist' in migrated.tasks[0]));
assert.deepEqual(migrateLegacyTasks(old), migrated);
assert.deepEqual(readWorkspaceBackup({ app: 'claims-companion', version: 1, tasks: old }), migrated);
assert.deepEqual(readWorkspaceBackup({ app: 'claims-companion', ...migrated }), migrated);
assert.equal(old[0].claimId, undefined);
assert.equal(validDate('2026-02-30'), false);
assert.equal(validDate('2028-02-29'), true);
for (const invalid of [
  { ...migrated, claims: [] }, { ...migrated, claims: [migrated.claims[0], migrated.claims[0]] },
  { ...migrated, tasks: [migrated.tasks[0], migrated.tasks[0]] },
  { ...migrated, tasks: [{ ...migrated.tasks[0], followUpDate: '2026-02-30' }] },
  { ...migrated, tasks: [{ ...migrated.tasks[0], status: 'Completed' }] },
  { ...migrated, tasks: [{ ...migrated.tasks[0], description: 'x'.repeat(2001) }] },
  { ...migrated, version: 99 },
]) assert.throws(() => normalizeWorkspace(invalid));
const cleaned = normalizeWorkspace({ ...migrated, noteDraft: 'not saved', tasks: [{ ...migrated.tasks[0], noteDraft: 'not saved' }] });
assert.ok(!JSON.stringify(cleaned).includes('not saved'));
console.log('PASS model: deterministic legacy migration, IDs/dates/status preserved, v1/v2 backups, no orphan/duplicate/invalid tasks, bounded fields, unknown metadata excluded.');
