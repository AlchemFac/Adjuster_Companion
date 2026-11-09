const { chromium } = require('./browser.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
    const key = 'claims-companion.tasks.v1';
    await page.goto(baseURL);
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(await page.locator('#day-one-list fieldset').count(), 6);
    assert.equal(await page.locator('#day-one-list input').count(), 26);
    const routine = await page.locator('#day-one-list input:checked').count();
    assert.ok(routine > 0 && routine < 26);
    await page.locator('#day-one-date').fill('2020-01-01');
    await page.locator('#day-one-form button').click();
    assert.equal((await read()).length, routine);
    assert.equal(await page.locator('#overdue-count').textContent(), String(routine));
    assert.equal(await page.locator('#followup-overdue .followup-row').count(), routine);
    assert.ok((await read()).every(task => task.checklist.set === 'Practice A'));
    assert.ok((await read()).every(task => task.title.length <= 120 && task.nextAction.length <= 200));
    const first = (await read()).find(task => task.checklist.step === 'file-review');
    await page.locator('#day-one-date').fill('2099-12-31');
    await page.locator('#day-one-form button').click();
    assert.equal((await read()).length, routine);
    assert.equal((await read()).find(task => task.id === first.id).date, '2020-01-01');
    await page.locator('#day-one-file-review').focus();
    await page.keyboard.press('Space');
    assert.equal((await read()).find(task => task.id === first.id).done, true);
    assert.equal(await page.getByRole('checkbox', { name: `Reopen task: ${first.title}`, exact: true }).isChecked(), true);
    assert.ok((await page.locator('#day-one-progress').textContent()).startsWith('1 of'));
    await page.reload();
    assert.equal(await page.locator('#day-one-file-review').isChecked(), true);
    await page.getByRole('combobox', { name: `Status for ${first.title}`, exact: true }).selectOption('Waiting');
    assert.equal(await page.locator('#day-one-file-review').isChecked(), false);
    assert.ok((await page.locator('#day-one-file-review').locator('../..').textContent()).includes('Waiting'));
    await page.getByRole('button', { name: 'Edit checklist task: Review file sections', exact: true }).click();
    assert.equal(await page.locator('#task-title').inputValue(), first.title);
    await page.selectOption('#task-priority', 'High');
    await page.locator('#save-task').click();
    assert.equal((await read()).find(task => task.id === first.id).priority, 'High');
    assert.equal((await read()).filter(task => task.checklist.step === 'file-review').length, 1);
    // Applicable steps add only when selected; optional selections survive unrelated rendering.
    await page.locator('#day-one-date').fill('2099-12-31');
    await page.locator('#day-one-response-24h').check();
    await page.locator('#task-search').fill('generic');
    assert.equal(await page.locator('#day-one-response-24h').isChecked(), true);
    await page.locator('#task-search').fill('');
    await page.locator('#day-one-form button').click();
    assert.equal((await read()).length, routine + 1);
    assert.equal((await read()).find(task => task.checklist.step === 'response-24h').date, '2099-12-31');
    // Separate fictional practice sets have independent records and progress.
    await page.selectOption('#day-one-set', 'Practice B');
    assert.ok((await page.locator('#day-one-progress').textContent()).startsWith('0 of 0'));
    await page.locator('#day-one-form button').click();
    assert.equal((await read()).length, routine * 2 + 1);
    await page.selectOption('#day-one-set', 'Practice A');
    await page.getByRole('button', { name: `Delete task: ${first.title}`, exact: true }).click();
    assert.equal(await page.locator('#day-one-file-review').getAttribute('aria-label'), 'Include step: Review file sections');
    await page.locator('#day-one-form button').click();
    assert.equal((await read()).filter(task => task.checklist.set === 'Practice A' && task.checklist.step === 'file-review').length, 1);
    // Select every remaining conditional item and verify the whole photographed workflow is supported.
    for (const box of await page.locator('#day-one-list input[aria-label^="Include step:"]').all()) await box.check();
    await page.locator('#day-one-form button').click();
    assert.equal((await read()).filter(task => task.checklist.set === 'Practice A').length, 26);
    assert.ok((await read()).every(task => task.title.length <= 120 && task.nextAction.length <= 200));
    // All checklist metadata survives backup and restore; duplicate logical steps are rejected.
    const downloaded = page.waitForEvent('download');
    await page.locator('#export-tasks').click();
    const backup = JSON.parse(await fs.readFile(await (await downloaded).path(), 'utf8'));
    assert.ok(backup.tasks.every(task => task.checklist.type === 'day-one'));
    async function upload(data, accept) {
      if (accept) page.once('dialog', dialog => dialog.accept());
      await page.locator('#import-tasks').setInputFiles({ name: 'practice.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
      await page.waitForFunction(() => document.querySelector('#import-tasks').value === '');
    }
    await upload(backup, true);
    assert.deepEqual(await read(), backup.tasks);
    await upload({ ...backup, tasks: [backup.tasks[0], { ...backup.tasks[0], id: 'duplicate-logical-step' }] });
    assert.deepEqual(await read(), backup.tasks);
    await upload({ ...backup, tasks: [{ ...backup.tasks[0], checklist: { type: 'day-one', set: 'real identifier', step: 'file-review' } }] });
    assert.deepEqual(await read(), backup.tasks);
    // Capacity is atomic: no partial checklist is added at the 500-task boundary.
    const almostFull = Array.from({ length: 499 }, (_, i) => ({ id: `fictional-limit-${i}`, title: 'Generic capacity practice', date: '', done: false }));
    await upload({ app: 'claims-companion', version: 1, tasks: almostFull }, true);
    await page.locator('#day-one-form button').click();
    assert.equal((await read()).length, 499);
    assert.ok((await page.locator('#day-one-feedback').textContent()).includes('No steps were added'));
    await upload(backup, true);
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    }
    assert.deepEqual(errors, []);
    assert.ok(requests.every(url => new URL(url).origin === new URL(baseURL).origin));
    console.log('PASS Day 1: all 26 steps, routine/conditional selection, shared task status/dates, keyboard completion, edit/delete/re-add, separate fictional sets, refresh, JSON round-trip, duplicate-link rejection, atomic capacity, responsive layout; no external requests or page errors.');
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
