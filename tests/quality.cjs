const { chromium } = require('./browser.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const key = 'claims-companion.workspace.v2';
(async () => {
  const b = await chromium.launch();
  try {
    const c = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await c.newPage(); p.setDefaultTimeout(6000);
    const errors = [], requests = []; p.on('pageerror', e => errors.push(e.message)); p.on('request', r => requests.push({ url: r.url(), body: r.postData() }));
    await p.goto(baseURL);
    const day = await p.evaluate(() => today());
    const claims = Array.from({ length: 10 }, (_, i) => ({ id: `practice-${i}`, reference: `Fictional practice ${i}`, status: 'Open' }));
    const tasks = Array.from({ length: 100 }, (_, i) => ({ id: `practice-task-${i}`, claimId: claims[Math.floor(i / 10)].id,
      title: `Generic task ${String(i).padStart(3, '0')}`, description: 'Review fictional training materials\nNo case facts',
      date: ['2020-01-01', day, '2099-12-31', ''][i % 4], followUpDate: ['', day, '2020-01-01', '2099-12-31'][i % 4],
      done: i % 5 === 0, category: 'Training', priority: ['High', 'Medium', 'Low'][i % 3], status: i % 5 === 0 ? 'Completed' : 'Not Started',
      waitingOn: '', nextAction: 'Read generic outline\nReview practice questions', completedOn: i % 5 === 0 ? day : '' }));
    const backup = { app: 'claims-companion', version: 2, claims, tasks };
    const read = () => p.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    async function upload(data, accept) {
      if (accept !== undefined) p.once('dialog', d => accept ? d.accept() : d.dismiss());
      await p.locator('#import-tasks').setInputFiles({ name: 'fictional-workspace.json', mimeType: 'application/json', buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)) });
      await p.waitForFunction(() => document.querySelector('#import-tasks').value === '');
    }
    await upload(backup, true);
    assert.equal(await p.locator('.claim-card').count(), 10); assert.equal(await p.locator('.task').count(), 100);
    assert.equal(await p.locator('#active-count').textContent(), '80'); assert.equal(await p.locator('#today-count').textContent(), '20');
    assert.equal(await p.locator('#overdue-count').textContent(), '20'); assert.equal(await p.locator('#completed-count').textContent(), '20');
    await p.reload(); assert.deepEqual(await read(), { version: 2, claims, tasks });
    const timings = await p.evaluate(() => Array.from({ length: 5 }, () => { const start = performance.now(); render(); return performance.now() - start; }));
    const median = [...timings].sort((a, b) => a - b)[2]; assert.ok(median < 1500);
    await p.locator('#task-search').fill('Generic task 099'); assert.equal(await p.locator('.task').count(), 1);
    await p.locator('#task-search').fill('');
    const saved = await read();
    const download = p.waitForEvent('download'); await p.locator('#export-tasks').click();
    const exported = JSON.parse(await fs.readFile(await (await download).path(), 'utf8'));
    assert.deepEqual(exported, backup);
    await upload(exported, false); assert.deepEqual(await read(), saved);
    await upload(exported, true); await upload(exported, true); assert.equal((await read()).tasks.length, 100);
    for (const invalid of [
      '{bad', {}, { ...backup, version: 99 }, { ...backup, claims: [] },
      { ...backup, claims: [claims[0], claims[0]] }, { ...backup, claims: [claims[0], { ...claims[0], id: 'new-id' }] },
      { ...backup, tasks: [tasks[0], tasks[0]] }, { ...backup, tasks: [{ ...tasks[0], claimId: 'missing-claim' }] },
      { ...backup, tasks: [{ ...tasks[0], followUpDate: '2026-02-30' }] }, { ...backup, tasks: [{ ...tasks[0], status: 'Waiting' }] },
      { ...backup, tasks: Array.from({ length: 501 }, (_, i) => ({ ...tasks[0], id: `over-limit-${i}` })) },
      ' '.repeat(10 * 1024 * 1024 + 1),
    ]) { await upload(invalid); assert.deepEqual(await read(), saved); assert.ok((await p.locator('#backup-status').textContent()).includes('Import failed')); }
    // Unknown fields, including note drafts, never enter persistent data.
    await upload({ ...backup, noteDraft: 'FICTIONAL-NOTE-NOT-STORED', tasks: [{ ...tasks[0], noteDraft: 'FICTIONAL-NOTE-NOT-STORED' }] }, true);
    assert.ok(!JSON.stringify(await read()).includes('FICTIONAL-NOTE-NOT-STORED'));
    await upload(backup, true);
    await p.evaluate(() => { window.originalSet = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
    await upload({ app: 'claims-companion', version: 2, claims: [], tasks: [] }, true);
    assert.deepEqual(await read(), saved); assert.equal(await p.locator('.task').count(), 100);
    await p.evaluate(() => { Storage.prototype.setItem = window.originalSet; });
    // v1 backup conversion preserves IDs and both former date meanings.
    await upload({ app: 'claims-companion', version: 1, tasks: [{ id: 'old-review', title: 'Generic old review', date: '2020-01-01', done: false }] }, true);
    assert.equal((await read()).claims[0].reference, 'Existing work'); assert.equal((await read()).tasks[0].id, 'old-review');
    assert.equal((await read()).tasks[0].date, (await read()).tasks[0].followUpDate);
    await upload(backup, true);
    // Pending follow-up edits survive search/focus; native cards are keyboard collapsible.
    const pending = p.getByLabel('Follow-up date for Generic task 001', { exact: true }); await pending.fill('2099-10-10');
    await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await p.locator('#task-search').fill('Generic');
    assert.equal(await pending.inputValue(), '2099-10-10'); await p.locator('#task-search').fill('');
    const summary = p.locator('.claim-card summary').first(); await summary.focus(); await p.keyboard.press('Enter');
    assert.equal(await summary.locator('..').evaluate(el => el.open), false); await p.keyboard.press('Enter');
    assert.equal(await summary.locator('..').evaluate(el => el.open), true);
    const unlabeled = await p.locator('input, select, textarea').evaluateAll(els => els.filter(e => e.getClientRects().length && !e.labels?.length && !e.getAttribute('aria-label')).map(e => e.id));
    assert.deepEqual(unlabeled, []);
    for (const width of [1440, 1024, 768, 390, 320]) {
      await p.setViewportSize({ width, height: 900 }); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
    }
    await p.getByRole('button', { name: 'Add task to Fictional practice 0', exact: true }).click();
    await p.locator('#task-title').fill('Fictional offline task'); await p.locator('#task-date').fill('2099-12-31'); await c.setOffline(true);
    await p.locator('#save-task').click(); assert.equal((await read()).tasks.length, 101); await c.setOffline(false);
    const second = await c.newPage(); await second.goto(baseURL);
    await second.locator('.claim-card').first().getByRole('button', { name: 'Add task to Fictional practice 0', exact: true }).click();
    await second.locator('#task-title').fill('Second tab practice'); await second.locator('#task-date').fill('2099-12-31'); await second.locator('#save-task').click();
    await p.waitForFunction(() => document.querySelector('#storage-status').textContent.includes('another tab'));
    const beforeStale = await read(); await p.locator('#task-title').fill('Stale temporary task'); await p.locator('#task-date').fill('2099-12-31'); await p.locator('#save-task').click();
    assert.deepEqual(await read(), beforeStale);
    assert.deepEqual(errors, []); assert.ok(requests.every(r => new URL(r.url).origin === new URL(baseURL).origin && !r.body));
    console.log(`PASS quality: 10 collapsible claims / 100 tasks, counters/search, v1/v2 backups, rejection/cancel/quota/duplicate/orphan cases, label/keyboard/320–1440px checks, independent pending dates, offline operations, stale-tab protection. Median render ${median.toFixed(1)} ms.`);
    await c.close();
    // Startup migration writes a single v2 snapshot and preserves the legacy recovery copy.
    const legacy = [{ id: 'legacy-preserved', title: 'Legacy fictional task', date: '2020-01-01', done: false }];
    const m = await b.newContext(); const mp = await m.newPage(); await mp.goto(baseURL);
    await mp.evaluate(tasks => localStorage.setItem('claims-companion.tasks.v1', JSON.stringify(tasks)), legacy); await mp.reload();
    assert.equal(await mp.locator('.claim-card').count(), 1);
    assert.equal(await mp.evaluate(key => JSON.parse(localStorage.getItem(key)).tasks[0].id, key), 'legacy-preserved');
    await mp.reload(); assert.equal(await mp.locator('.task').count(), 1);
    assert.deepEqual(await mp.evaluate(() => JSON.parse(localStorage.getItem('claims-companion.tasks.v1'))), legacy);
    mp.once('dialog', d => d.accept()); await mp.locator('#clear-data').click(); await mp.reload();
    assert.equal(await mp.locator('.claim-card').count(), 0); assert.equal(await mp.evaluate(() => localStorage.getItem('claims-companion.tasks.v1')), null);
    await m.close();
    console.log('PASS startup migration: stable IDs, no repeated migration/duplication, legacy recovery preserved until explicit clear, no old-task resurrection.');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
