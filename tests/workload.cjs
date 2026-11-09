const { chromium } = require('./browser.cjs');
const assert = require('node:assert/strict');
(async () => {
  const b = await chromium.launch();
  try {
    const c = await b.newContext(); const p = await c.newPage(); p.setDefaultTimeout(6000);
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(process.env.BASE_URL || 'http://127.0.0.1:8000');
    const key = 'claims-companion.workspace.v2'; const read = () => p.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    async function claim(reference) {
      await p.locator('#claim-reference').fill(reference); await p.locator('#claim-approval').check(); await p.locator('#save-claim').click();
    }
    assert.equal(await p.locator('#task-form').isVisible(), false);
    await p.locator('#claim-reference').fill('Practice 01'); await p.locator('#save-claim').click();
    assert.equal(await p.locator('.claim-card').count(), 0);
    await p.locator('#claim-approval').check(); await p.locator('#save-claim').click();
    assert.equal(await p.locator('.claim-card').count(), 1);
    await p.locator('#task-title').fill('Generic review'); await p.locator('#task-description').fill('Review training material\nUse only fictional examples');
    await p.locator('#task-date').fill('2020-01-01'); await p.locator('#task-followup-date').fill('2099-12-31');
    await p.selectOption('#task-category', 'Investigation'); await p.selectOption('#task-priority', 'High');
    await p.selectOption('#task-waiting-on', 'Internal Review'); await p.selectOption('#task-status', 'In Progress');
    await p.locator('#task-next-action').fill('Read outline\nPrepare generic questions'); await p.locator('#save-task').click();
    let w = await read(); const id = w.tasks[0].id, firstClaimId = w.claims[0].id;
    assert.equal(w.tasks[0].description, 'Review training material\nUse only fictional examples');
    assert.equal(w.tasks[0].nextAction, 'Read outline\nPrepare generic questions'); assert.equal(w.tasks[0].claimId, firstClaimId);
    assert.equal(await p.locator('#overdue-count').textContent(), '1'); assert.equal(await p.locator('#followup-overdue-count').textContent(), '0');
    await p.getByRole('button', { name: 'Edit task: Generic review', exact: true }).click();
    await p.locator('#task-title').fill('Edited generic review'); await p.selectOption('#task-priority', 'Low');
    await p.locator('#task-description').fill('Updated generic description'); await p.locator('#save-task').click();
    assert.equal((await read()).tasks.length, 1); assert.equal((await read()).tasks[0].id, id);
    assert.equal((await read()).tasks[0].priority, 'Low');
    await p.getByRole('button', { name: 'Edit task: Edited generic review', exact: true }).click();
    await p.locator('#task-description').fill('Cancelled draft'); await p.locator('#cancel-edit').click();
    assert.equal((await read()).tasks[0].description, 'Updated generic description');
    // A second claim gets independent tasks; cards collapse natively without deleting them.
    await claim('Practice 02');
    await p.locator('#task-title').fill('Second practice task'); await p.locator('#task-date').fill('2099-12-31'); await p.locator('#save-task').click();
    assert.equal((await read()).claims.length, 2); assert.notEqual((await read()).tasks[1].claimId, firstClaimId);
    const firstCard = p.locator('.claim-card').filter({ hasText: 'Practice 01' });
    await firstCard.locator('summary').click(); assert.equal(await firstCard.evaluate(el => el.open), false);
    assert.equal((await read()).tasks.length, 2);
    await firstCard.locator('summary').click();
    await p.getByRole('checkbox', { name: 'Complete task: Edited generic review', exact: true }).focus(); await p.keyboard.press('Space');
    assert.equal((await read()).tasks[0].done, true); assert.equal(await p.locator('#completed-count').textContent(), '1');
    // Completing every task does not close a claim; closure/reopening is explicit.
    assert.equal((await read()).claims[0].status, 'Open');
    await p.getByRole('button', { name: 'Close claim: Practice 01', exact: true }).click();
    assert.equal((await read()).tasks.length, 2); assert.equal((await read()).claims[0].status, 'Closed');
    assert.equal(await p.locator('#completed-count').textContent(), '0');
    await p.selectOption('#claim-filter', 'Closed');
    assert.equal(await p.locator('.claim-card').count(), 1);
    assert.equal(await p.getByRole('button', { name: 'Add task to Practice 01', exact: true }).isDisabled(), true);
    await p.getByRole('button', { name: 'Reopen claim: Practice 01', exact: true }).click();
    await p.selectOption('#claim-filter', 'Open');
    await p.getByRole('button', { name: 'Rename claim: Practice 01', exact: true }).click();
    await p.locator('#claim-reference').fill('Practice renamed'); await p.locator('#claim-approval').check(); await p.locator('#save-claim').click();
    assert.equal((await read()).claims[0].id, firstClaimId); assert.equal((await read()).claims[0].reference, 'Practice renamed');
    await p.locator('#task-search').fill('Updated generic description'); assert.equal(await p.locator('.task').count(), 1);
    await p.selectOption('#priority-filter', 'High'); assert.equal(await p.locator('.task').count(), 0);
    await p.selectOption('#priority-filter', 'Low'); await p.selectOption('#status-filter', 'Completed'); assert.equal(await p.locator('.task').count(), 1);
    await p.locator('#task-search').fill(''); await p.selectOption('#priority-filter', ''); await p.selectOption('#status-filter', '');
    await p.reload(); assert.equal((await read()).tasks[0].done, true);
    await p.getByRole('button', { name: 'Delete task: Edited generic review', exact: true }).click();
    assert.equal(await p.evaluate(() => document.activeElement.tagName), 'SUMMARY');
    await p.reload(); assert.equal((await read()).tasks.length, 1); assert.equal((await read()).claims.length, 2);
    // Required due date blocks a new task; an optional follow-up stays empty.
    await p.getByRole('button', { name: 'Add task to Practice renamed', exact: true }).click();
    await p.locator('#task-title').fill('No due date yet'); await p.locator('#save-task').click(); assert.equal((await read()).tasks.length, 1);
    await p.locator('#task-date').fill('2099-12-31'); await p.locator('#save-task').click(); assert.equal((await read()).tasks[1].followUpDate, '');
    const moveId = (await read()).tasks[1].id;
    await p.getByRole('button', { name: 'Edit task: No due date yet', exact: true }).click();
    await p.selectOption('#task-claim', (await read()).claims[1].id); await p.locator('#save-task').click();
    assert.equal((await read()).tasks.find(t => t.id === moveId).claimId, (await read()).claims[1].id);
    assert.equal((await read()).tasks.length, 2);
    await claim('Practice 02'); assert.equal((await read()).claims.length, 2);
    assert.ok((await p.locator('#claim-feedback').textContent()).includes('already exists'));
    assert.deepEqual(errors, []);
    console.log('PASS workload: approved/generic claim labels, collapsible cards, all task fields, stable-ID edits, cancellation, priority/search/status filters, close/reopen/rename, no auto-close, due-date validation, deletion and refresh.');
    await c.close();
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
