const { chromium } = require('./browser.cjs');
const assert = require('node:assert/strict');
(async () => {
  const b = await chromium.launch();
  try {
    const p = await b.newPage(); await p.goto(process.env.BASE_URL || 'http://127.0.0.1:8000');
    assert.equal(await p.locator('#day-one-list section').count(), 6);
    assert.equal(await p.locator('#day-one-list .day-one-step').count(), 26);
    assert.equal(await p.locator('#day-one-list input, #day-one-list button, #day-one-form').count(), 0);
    assert.equal(await p.locator('#documentation-form, #template-preview, #templates-title').count(), 0);
    assert.equal(await p.evaluate(() => localStorage.getItem('claims-companion.workspace.v2')), null);
    assert.equal(await p.locator('#library-list .library-item').count(), 41);
    console.log('PASS reference: all 26 Day 1 items in six groups, no interactive progress/task creation/storage, removed practice note formatter, retained Template Library.');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
