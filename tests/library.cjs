const { chromium } = require('./browser.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8000';
const key = 'claims-companion.library.v1';
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1440, height: 1000 } });
    const p = await context.newPage(); p.setDefaultTimeout(6000);
    const errors = [], requests = [];
    p.on('pageerror', error => errors.push(error.message));
    p.on('request', request => requests.push({ url: request.url(), body: request.postData() }));
    await p.goto(baseURL);
    const read = () => p.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    const builtins = await p.evaluate(() => BUILTIN_LIBRARY_TEMPLATES);
    assert.equal(builtins.length, 41);
    assert.equal(new Set(builtins.map(t => t.id)).size, 41);
    assert.deepEqual(await p.evaluate(() => LIBRARY_CATEGORIES.map(c => BUILTIN_LIBRARY_TEMPLATES.filter(t => t.category === c).length)), [5, 7, 7, 5, 5, 6, 6]);
    assert.equal(await p.locator('#library-list .library-item').count(), 41);
    for (const category of [...new Set(builtins.map(t => t.category))]) {
      await p.selectOption('#library-category', category);
      assert.equal(await p.locator('#library-list .library-item').count(), builtins.filter(t => t.category === category).length);
    }
    await p.selectOption('#library-category', '');
    await p.locator('#library-search').fill('POLICE REPORT');
    assert.equal(await p.locator('#library-list .library-item').count(), 1);
    await p.locator('#library-search').fill('no-match-fictional-keyword');
    assert.equal(await p.locator('#library-list .library-item').count(), 0);
    await p.locator('#library-search').fill('');
    // Check every requested scenario with an actual clipboard write/read round-trip.
    for (const template of builtins) {
      await p.locator('#library-search').fill(template.title);
      await p.getByRole('button', { name: `Open template: ${template.title}`, exact: true }).click();
      assert.equal(await p.locator('#library-selected-title').textContent(), template.title);
      assert.equal(await p.locator('#library-description').textContent(), template.description);
      assert.equal(await p.locator('#library-preview').inputValue(), template.body);
      assert.equal(await p.locator('#library-preview').getAttribute('readonly'), '');
      assert.ok(template.body.includes('[DATE]') && template.body.includes('[ACTION TAKEN]') && template.body.includes('[FOLLOW-UP DATE]'));
      if (['Coverage', 'Liability'].includes(template.category)) assert.ok(template.body.includes('[SUPPORTING EVIDENCE]'));
      await p.locator('#library-copy').click();
      await p.waitForFunction(async body => await navigator.clipboard.readText() === body, template.body);
      await p.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).recent[0] === id, { key, id: template.id });
      assert.equal(await p.locator('#library-search').inputValue(), template.title);
    }
    assert.equal((await read()).recent.length, 8);
    assert.ok((await read()).recent.every(id => typeof id === 'string'));
    await p.locator('#library-search').fill('');
    const target = builtins.find(t => t.title === 'Repair shop follow-up');
    await p.getByRole('button', { name: `Favorite template: ${target.title}`, exact: true }).click();
    assert.equal(await p.locator('#library-list .library-choose').first().getAttribute('aria-label'), `Open template: ${target.title}`);
    await p.locator('#library-favorites-only').check();
    assert.equal(await p.locator('#library-list .library-item').count(), 1);
    await p.reload();
    assert.ok((await read()).favorites.includes(target.id));
    assert.equal((await read()).recent.length, 8);
    await p.locator('#library-recent button').first().click();
    assert.equal(await p.locator('#library-selected-title').textContent(), builtins[builtins.length - 1].title);
    // Search and category navigation survive switching the preview.
    await p.selectOption('#library-category', 'Coverage');
    await p.locator('#library-search').fill('review');
    const first = p.locator('#library-list .library-choose').first();
    await first.click();
    assert.equal(await p.locator('#library-category').inputValue(), 'Coverage');
    assert.equal(await p.locator('#library-search').inputValue(), 'review');
    await p.selectOption('#library-category', ''); await p.locator('#library-search').fill('');

    const genericBody = 'Purpose: [PURPOSE]\nAction taken: [ACTION TAKEN]\nNext action: [NEXT ACTION]\nFollow-up date: [FOLLOW-UP DATE]';
    async function fillEditor(title, body = genericBody) {
      await p.locator('#library-custom-title').fill(title);
      await p.selectOption('#library-custom-category', 'Follow-ups and resolution');
      await p.locator('#library-custom-description').fill('Use for a generic fictional training follow-up.');
      await p.locator('#library-custom-body').fill(body);
    }
    const save = p.getByRole('button', { name: 'Save generic template', exact: true });
    await p.locator('#library-new').click();
    await fillEditor('Fictional practice follow-up');
    await save.click();
    assert.equal((await read()).custom.length, 0); // Native required confirmation blocks saving.
    await p.locator('#library-custom-confirm').check();
    await p.locator('#library-custom-body').fill('A completed note without placeholders.');
    await save.click(); assert.ok((await p.locator('#library-custom-status').textContent()).includes('two distinct'));
    for (const value of [
      `${genericBody}\nContact: learner@example.test`, `${genericBody}\nPhone: +1 (555) 010-1234`,
      `${genericBody}\nClaim number: ABC123`,
    ]) {
      await p.locator('#library-custom-body').fill(value); await save.click();
      assert.ok((await p.locator('#library-custom-status').textContent()).includes('detected'));
      assert.equal((await read()).custom.length, 0);
    }
    await p.locator('#library-custom-body').fill(genericBody); await save.click();
    assert.equal((await read()).custom.length, 1);
    const customId = (await read()).custom[0].id;
    assert.equal(await p.locator('#library-preview').inputValue(), genericBody);
    await p.locator('#library-edit').click();
    await p.locator('#library-custom-body').fill(`${genericBody}\nOutstanding items: [OUTSTANDING ITEMS]`);
    await p.locator('#library-custom-confirm').check(); await save.click();
    assert.equal((await read()).custom.length, 1); assert.equal((await read()).custom[0].id, customId);
    assert.ok((await read()).custom[0].body.includes('[OUTSTANDING ITEMS]'));
    await p.locator('#library-favorite').click();
    await p.reload();
    assert.equal((await read()).custom[0].id, customId); assert.ok((await read()).favorites.includes(customId));
    await p.getByRole('button', { name: 'Open template: Fictional practice follow-up', exact: true }).click();
    await p.locator('#library-duplicate').click();
    await p.locator('#library-custom-confirm').check(); await save.click();
    assert.equal((await read()).custom.length, 2);
    const duplicatedId = (await read()).custom[1].id;
    assert.notEqual(duplicatedId, customId);
    await p.locator('#library-favorite').click(); await p.locator('#library-copy').click();
    await p.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key)).recent[0] === id, { key, id: duplicatedId });
    p.once('dialog', dialog => dialog.dismiss()); await p.locator('#library-delete').click();
    assert.equal((await read()).custom.length, 2);
    p.once('dialog', dialog => dialog.accept()); await p.locator('#library-delete').click();
    assert.equal((await read()).custom.length, 1);
    assert.ok(!(await read()).recent.includes(duplicatedId) && !(await read()).favorites.includes(duplicatedId));
    // Duplicating a built-in never changes the original.
    await p.getByRole('button', { name: 'Open template: Initial claim review', exact: true }).click();
    await p.locator('#library-duplicate').click(); await p.locator('#library-custom-confirm').check(); await save.click();
    assert.equal((await read()).custom.length, 2);
    assert.equal(await p.evaluate(() => BUILTIN_LIBRARY_TEMPLATES[0].body), builtins[0].body);

    // Unsubmitted custom editor text never enters storage or backups; the note formatter is absent.
    const beforeDraft = await p.evaluate(() => ({ ...localStorage }));
    await p.locator('#library-new').click(); await p.locator('#library-custom-title').fill('UNSAVED_FICTIONAL_LIBRARY_DRAFT');
    assert.equal(await p.locator('#documentation-form').count(), 0);
    assert.deepEqual(await p.evaluate(() => ({ ...localStorage })), beforeDraft);
    assert.equal(await p.evaluate(() => JSON.stringify(sessionStorage)), '{}');
    const downloadPromise = p.waitForEvent('download'); await p.locator('#export-tasks').click();
    const text = await fs.readFile(await (await downloadPromise).path(), 'utf8');
    assert.ok(!text.includes('UNSAVED_FICTIONAL_LIBRARY_DRAFT'));
    await p.reload();
    assert.equal(await p.locator('#library-custom-title').inputValue(), '');
    assert.equal((await read()).custom.length, 2);
    assert.ok(!JSON.stringify(await read()).includes('UNSAVED_FICTIONAL_LIBRARY_DRAFT'));
    // Clipboard denial selects the entire scaffold without claiming successful recent use.
    const recentBefore = (await read()).recent;
    await p.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('Denied')) }));
    await p.locator('#library-copy').click();
    await p.waitForFunction(() => document.querySelector('#library-feedback').textContent.includes('unavailable'));
    assert.equal(await p.locator('#library-preview').evaluate(el => el.selectionEnd - el.selectionStart), (await p.locator('#library-preview').inputValue()).length);
    assert.deepEqual((await read()).recent, recentBefore);
    // Quota failures keep the library usable and show that new changes are temporary.
    const savedBeforeQuota = await p.evaluate(key => localStorage.getItem(key), key);
    await p.evaluate(() => { window.libraryOriginalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
    await p.locator('#library-favorite').click();
    assert.ok((await p.locator('#library-storage-status').textContent()).includes('temporary'));
    assert.equal(await p.evaluate(key => localStorage.getItem(key), key), savedBeforeQuota);
    await p.evaluate(() => { Storage.prototype.setItem = window.libraryOriginalSetItem; });
    for (const width of [1440, 1024, 768, 390, 320]) {
      await p.setViewportSize({ width, height: 900 });
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
      const columns = await p.locator('.library-layout').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      assert.equal(columns, width <= 760 ? 1 : 2);
    }
    assert.deepEqual(errors, []);
    assert.ok(requests.every(r => new URL(r.url).origin === new URL(baseURL).origin && !r.body));
    assert.ok(!JSON.stringify(requests).includes('UNSAVED_FICTIONAL_LIBRARY_DRAFT'));
    console.log('PASS library: all 41 scenarios/7 categories, search, filters, favorites first/persistence, every clipboard round-trip, recent ID cap, custom validation/create/edit/duplicate/delete, refresh, unsaved draft isolation, task-only exports, clipboard refusal, quota warnings, responsive panels; no external data requests or page errors.');
    await context.close();

    // Unavailable storage from startup and malformed saved preferences preserve built-in access.
    const unavailable = await browser.newContext();
    await unavailable.addInitScript(() => {
      window.libraryOriginalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
    });
    const u = await unavailable.newPage(); await u.goto(baseURL);
    assert.equal(await u.locator('#library-list .library-item').count(), 41);
    assert.ok((await u.locator('#library-storage-status').textContent()).includes('temporary'));
    await u.locator('#library-favorite').click();
    await u.locator('#library-new').click();
    await u.locator('#library-custom-title').fill('Fictional temporary template');
    await u.locator('#library-custom-description').fill('Generic temporary training scaffold.');
    await u.locator('#library-custom-body').fill('Purpose: [PURPOSE]\nAction: [ACTION TAKEN]');
    await u.locator('#library-custom-confirm').check(); await u.getByRole('button', { name: 'Save generic template', exact: true }).click();
    assert.equal(await u.evaluate(() => libraryState.custom.length), 1);
    await u.evaluate(() => { Storage.prototype.getItem = window.libraryOriginalGetItem; });
    assert.equal(await u.evaluate(key => localStorage.getItem(key), key), null);
    await unavailable.close();
    const corrupted = await browser.newContext();
    const c = await corrupted.newPage(); await c.goto(baseURL);
    await c.evaluate(key => localStorage.setItem(key, '{malformed'), key); await c.reload();
    assert.ok((await c.locator('#library-storage-status').textContent()).includes('could not be read'));
    await c.locator('#library-favorite').click();
    assert.equal(await c.evaluate(key => localStorage.getItem(key), key), '{malformed');
    assert.equal(await c.locator('#library-list .library-item').count(), 41);
    console.log('PASS storage-unavailable startup and malformed preferences: built-ins remain available, custom/favorite changes stay in memory, existing storage remains untouched.');
    await corrupted.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
