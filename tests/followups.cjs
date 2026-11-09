const { chromium } = require('./browser.cjs');
const assert = require('node:assert/strict');
(async () => {
  const b = await chromium.launch();
  try {
    for (const [zone, instant, expected] of [
      ['America/Chicago', '2026-11-09T00:30:00Z', '2026-11-08'],
      ['Asia/Tokyo', '2026-11-09T00:30:00Z', '2026-11-09'],
      ['Pacific/Kiritimati', '2026-11-09T12:30:00Z', '2026-11-10'],
      ['America/Los_Angeles', '2026-11-01T08:30:00Z', '2026-11-01'],
    ]) {
      const c = await b.newContext({ timezoneId: zone }); const p = await c.newPage();
      await p.clock.setFixedTime(new Date(instant)); await p.goto(process.env.BASE_URL || 'http://127.0.0.1:8000');
      const dates = await p.evaluate(() => [-1, 0, 1].map(offset => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }));
      assert.equal(dates[1], expected);
      await p.locator('#claim-reference').fill('Fictional follow-up practice'); await p.locator('#claim-approval').check(); await p.locator('#save-claim').click();
      const add = async (title, due, follow, status = 'Not Started') => {
        await p.locator('#task-title').fill(title); await p.locator('#task-date').fill(due); await p.locator('#task-followup-date').fill(follow);
        await p.selectOption('#task-status', status); await p.locator('#save-task').click();
      };
      await add('Due only', dates[0], ''); await add('Follow today', dates[2], dates[1]);
      await add('Upcoming follow', dates[2], dates[2]); await add('Overdue follow', dates[2], dates[0]);
      await add('Waiting follow', dates[2], dates[0], 'Waiting'); await add('Waiting without follow', dates[1], '', 'Waiting');
      await add('Completed follow', dates[0], dates[0], 'Completed');
      assert.equal(await p.locator('#overdue-count').textContent(), '1'); assert.equal(await p.locator('#today-count').textContent(), '1');
      assert.equal(await p.locator('#followup-overdue-count').textContent(), '2'); assert.equal(await p.locator('#followup-today-count').textContent(), '1');
      assert.equal(await p.locator('#followup-overdue .followup-row').count(), 1); assert.equal(await p.locator('#followup-today .followup-row').count(), 1);
      assert.equal(await p.locator('#followup-upcoming .followup-row').count(), 1); assert.equal(await p.locator('#followup-waiting .followup-row').count(), 1);
      await p.getByLabel('Follow-up date for Follow today', { exact: true }).fill(dates[2]);
      await p.getByRole('button', { name: 'Save follow-up date for Follow today', exact: true }).click();
      const key = 'claims-companion.workspace.v2';
      let w = await p.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      assert.equal(w.tasks.find(t => t.title === 'Follow today').date, dates[2]);
      assert.equal(await p.locator('#followup-today-count').textContent(), '0'); assert.equal(await p.locator('#today-count').textContent(), '1');
      await p.getByLabel('Follow-up date for Overdue follow', { exact: true }).fill('');
      await p.getByRole('button', { name: 'Save follow-up date for Overdue follow', exact: true }).click();
      assert.equal(await p.locator('#followup-overdue-count').textContent(), '1');
      await p.getByRole('button', { name: 'Complete follow-up: Waiting follow', exact: true }).click();
      assert.equal(await p.locator('#followup-overdue-count').textContent(), '0');
      await p.reload();
      w = await p.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
      assert.equal(w.tasks.find(t => t.title === 'Waiting follow').done, true);
      assert.equal(w.tasks.find(t => t.title === 'Waiting follow').followUpDate, dates[0]);
      assert.equal(w.tasks.length, 7);
      await p.getByRole('button', { name: 'Close claim: Fictional follow-up practice', exact: true }).click();
      assert.equal(await p.locator('.followup-row').count(), 0); assert.equal(await p.locator('#active-count').textContent(), '0');
      await c.close(); console.log(`PASS follow-ups ${zone}: independent due/follow dates, optional dates, waiting/completed scenarios, local day ${expected}, no postponement, refresh and closed-claim exclusion.`);
    }
    const c = await b.newContext({ timezoneId: 'America/Chicago' }); const p = await c.newPage();
    await p.clock.install({ time: new Date('2026-11-09T05:59:30Z') }); await p.clock.pauseAt(new Date('2026-11-09T05:59:30Z'));
    await p.goto(process.env.BASE_URL || 'http://127.0.0.1:8000');
    await p.locator('#claim-reference').fill('Midnight practice'); await p.locator('#claim-approval').check(); await p.locator('#save-claim').click();
    await p.locator('#task-title').fill('Generic midnight review'); await p.locator('#task-date').fill('2026-11-08'); await p.locator('#task-followup-date').fill('2026-11-08'); await p.locator('#save-task').click();
    await p.clock.runFor(61000);
    assert.equal(await p.locator('#overdue-count').textContent(), '1'); assert.equal(await p.locator('#followup-overdue-count').textContent(), '1');
    assert.equal(await p.getByLabel('Follow-up date for Generic midnight review', { exact: true }).inputValue(), '2026-11-08');
    await c.close(); console.log('PASS local midnight: both independent calendar counts refresh without moving dates.');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
