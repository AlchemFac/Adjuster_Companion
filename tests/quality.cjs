const { chromium } = require('./browser.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const key = 'claims-companion.tasks.v1';

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push({ url: request.url(), body: request.postData() }));
    await page.goto(baseURL);
    const localDay = await page.evaluate(() => today());
    const tasks = Array.from({ length: 100 }, (_, i) => ({
      id: `fictional-${i}`, title: `Fictional training review ${String(i).padStart(3, '0')}`,
      date: ['2020-01-01', localDay, '2099-12-31', ''][i % 4],
      done: i % 5 === 0, category: 'Training', priority: ['High', 'Medium', 'Low'][i % 3],
      status: i % 5 === 0 ? 'Completed' : i % 5 === 1 ? 'Waiting' : 'Not Started',
      nextAction: 'Review a generic practice checklist', waitingOn: '',
      completedOn: i % 5 === 0 ? localDay : '',
    }));
    const backup = { app: 'claims-companion', version: 1, tasks };
    const stored = () => page.evaluate(key => localStorage.getItem(key), key);
    const upload = async (data, accept) => {
      if (accept !== undefined) page.once('dialog', dialog => accept ? dialog.accept() : dialog.dismiss());
      await page.locator('#import-tasks').setInputFiles({
        name: 'fictional-backup.json', mimeType: 'application/json',
        buffer: Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)),
      });
      await page.waitForFunction(() => document.querySelector('#import-tasks').value === '');
    };
    await upload(backup, true);
    assert.equal(await page.locator('.task').count(), 100);
    assert.equal(await page.locator('#active-count').textContent(), '80');
    assert.equal(await page.locator('#today-count').textContent(), '20');
    assert.equal(await page.locator('#overdue-count').textContent(), '20');
    assert.equal(await page.locator('#completed-count').textContent(), '20');
    await page.reload();
    assert.deepEqual(JSON.parse(await stored()), tasks);

    // Measure actual list rebuilds with 100 tasks, not a trivial empty-list timing.
    const timings = await page.evaluate(() => Array.from({ length: 5 }, () => {
      const start = performance.now(); render(); return performance.now() - start;
    }));
    const median = [...timings].sort((a, b) => a - b)[2];
    assert.ok(median < 1500, `100-task render is too slow: ${median} ms`);
    const searchStart = Date.now();
    await page.locator('#task-search').fill('review 099');
    assert.equal(await page.locator('.task').count(), 1);
    const searchTime = Date.now() - searchStart;
    await page.locator('#task-search').fill('');
    await page.getByRole('button', { name: 'Edit task: Fictional training review 099', exact: true }).click();
    await page.locator('#task-title').fill('Fictional revised practice');
    await page.selectOption('#task-priority', 'High');
    await page.locator('#save-task').click();
    assert.equal(JSON.parse(await stored()).length, 100);
    assert.equal(JSON.parse(await stored()).find(t => t.id === 'fictional-99').priority, 'High');

    // Keyboard-only creation and completion, with focus retained after rebuilding a row.
    await page.locator('#task-title').focus();
    await page.keyboard.type('Keyboard practice');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.task').count(), 101);
    const checkbox = page.getByRole('checkbox', { name: 'Complete task: Keyboard practice', exact: true });
    await checkbox.focus(); await page.keyboard.press('Space');
    assert.equal(await page.getByRole('checkbox', { name: 'Reopen task: Keyboard practice', exact: true }).isChecked(), true);
    assert.equal(await page.evaluate(() => document.activeElement.type), 'checkbox');
    await page.getByRole('button', { name: 'Delete task: Keyboard practice', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.task').count(), 100);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'task-title');

    // Filtering should not discard a pending follow-up date or a selected status.
    const pending = page.getByLabel('Follow-up date for Fictional training review 001', { exact: true });
    await pending.fill('2099-10-10');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.locator('#task-search').fill('Fictional revised');
    assert.equal(await pending.inputValue(), '2099-10-10');
    await page.locator('#task-search').fill('');
    await page.locator('[data-filter=open]').click();
    await page.selectOption('#status-filter', 'Completed');
    assert.equal(await page.locator('.task').count(), 20);
    await page.selectOption('#status-filter', '');

    // Every field needs an associated visible label or explicit accessible name.
    const unlabeled = await page.locator('input, select, textarea').evaluateAll(controls => controls
      .filter(el => el.getClientRects().length && !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
      .map(el => el.id));
    assert.deepEqual(unlabeled, []);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('Control+Home');
    await page.locator('.skip-link').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'tasks-title');

    // Export excludes documentation and round-trips every task field without duplicates.
    await page.locator('#doc-purpose').fill('FICTIONAL-DRAFT-NEVER-SAVE');
    const beforeExport = await stored();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-tasks').click();
    const download = await downloadPromise;
    const text = await fs.readFile(await download.path(), 'utf8');
    const exported = JSON.parse(text);
    assert.equal(exported.app, 'claims-companion');
    assert.equal(exported.tasks.length, 100);
    assert.ok(!text.includes('FICTIONAL-DRAFT-NEVER-SAVE'));
    assert.equal(await stored(), beforeExport);
    assert.equal(await page.evaluate(() => JSON.stringify(sessionStorage)), '{}');
    await upload(exported, false);
    assert.equal(await stored(), beforeExport);
    assert.ok((await page.locator('#backup-status').textContent()).includes('cancelled'));
    await upload(exported, true);
    assert.deepEqual(JSON.parse(await stored()), exported.tasks);
    await upload(exported, true); // Repeated restore replaces; it never appends.
    assert.equal(JSON.parse(await stored()).length, 100);

    await upload({ ...backup, tasks: [] }, false);
    assert.equal(await stored(), beforeExport);
    await upload({ ...backup, tasks: [] }, true);
    assert.equal(await page.locator('.task').count(), 0);
    assert.equal(await page.locator('#active-count').textContent(), '0');
    await upload(exported, true);
    assert.equal(await page.locator('.task').count(), 100);

    // Invalid or oversized imports must leave data untouched, without opening a dialog.
    for (const invalid of [
      '{bad json', {}, { ...backup, version: 99 }, { ...backup, tasks: [tasks[0], tasks[0]] },
      { ...backup, tasks: [{ ...tasks[0], priority: 'Urgent' }] },
      { ...backup, tasks: [{ ...tasks[0], date: '2026-02-30' }] },
      { ...backup, tasks: [{ ...tasks[0], status: 'Waiting' }] },
      { ...backup, tasks: Array.from({ length: 501 }, (_, i) => ({ ...tasks[0], id: `test-${i}` })) },
      ' '.repeat(1024 * 1024 + 1),
    ]) {
      await upload(invalid);
      assert.equal(await stored(), beforeExport);
      assert.ok(/Invalid|Import failed/.test(await page.locator('#backup-status').textContent()));
    }
    // Ignore unrecognized metadata rather than persisting arbitrary imported properties.
    await upload({ ...backup, tasks: [{ ...tasks[1], draft: 'FICTIONAL-DRAFT-NEVER-SAVE' }] }, true);
    assert.ok(!(await stored()).includes('draft'));
    await upload(exported, true);
    await page.evaluate(() => {
      window.originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
    });
    await upload({ ...backup, tasks: [] }, true);
    assert.equal(await stored(), beforeExport);
    assert.equal(await page.locator('.task').count(), 100);
    await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; });

    // Check long generic content and 100-row lists at desktop, tablet, and phone widths.
    await page.locator('#doc-information').fill('FictionalGenericTrainingText'.repeat(60));
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
      const clipped = await page.locator('button, input, select').evaluateAll(els => els
        .filter(el => el.getClientRects().length)
        .filter(el => el.getBoundingClientRect().right > innerWidth + 1 || el.getBoundingClientRect().left < -1)
        .map(el => el.id || el.textContent));
      assert.deepEqual(clipped, [], `Offscreen controls at ${width}px`);
    }
    await page.setViewportSize({ width: 1440, height: 1100 });
    if (process.env.SCREENSHOT_DIR) {
      await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/desktop.png`, fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/mobile.png`, fullPage: true });
    }
    assert.ok(requests.every(r => new URL(r.url).origin === new URL(baseURL).origin && !r.body));
    assert.ok(!JSON.stringify(requests).includes('FICTIONAL-DRAFT-NEVER-SAVE'));
    await page.reload();
    assert.equal(await page.locator('#doc-purpose').inputValue(), '');
    assert.equal(await page.locator('#doc-information').inputValue(), '');
    assert.equal(JSON.parse(await stored()).length, 100);

    // Once static assets are loaded, task operations need no network or account.
    await context.setOffline(true);
    await page.locator('#task-title').fill('Fictional offline practice');
    await page.locator('#save-task').click();
    assert.equal(JSON.parse(await stored()).length, 101);
    await page.getByRole('button', { name: 'Delete task: Fictional offline practice', exact: true }).click();
    assert.equal(JSON.parse(await stored()).length, 100);
    await context.setOffline(false);

    // A second tab changing storage must prevent this tab from overwriting it.
    const second = await context.newPage();
    await second.goto(baseURL);
    await second.locator('#task-title').fill('Fictional second-tab task');
    await second.locator('#save-task').click();
    await page.waitForFunction(() => document.querySelector('#storage-status').textContent.includes('another tab'));
    const newStored = await stored();
    await page.locator('#task-title').fill('Temporary stale-tab practice');
    await page.locator('#save-task').click();
    assert.equal(await stored(), newStored);
    assert.deepEqual(errors, []);
    console.log(`PASS quality: 100-task JSON round-trip, cancel/reject/oversize/storage-failure cases, no duplicates/draft export, empty restore, offline task operations, counts, editing, keyboard controls/labels, focus retention, 320–1440px layout, persistence, tab conflict, no external data requests. Median render ${median.toFixed(1)} ms; search ${searchTime} ms.`);
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
