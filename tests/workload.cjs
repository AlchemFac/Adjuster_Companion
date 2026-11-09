const { chromium } = require('./browser.cjs');
const assert = require('node:assert/strict');
(async () => {
const browser = await chromium.launch();
try {
const context=await browser.newContext({timezoneId:'America/Chicago'});
const page=await context.newPage();page.setDefaultTimeout(5000);
const errors=[];page.on('pageerror', e=>errors.push(e.message));
await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8000'));
const dates=await page.evaluate(()=>[-1,0,1].map(offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}));
const key='claims-companion.tasks.v1';
const saved=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function add(title,date,priority='Medium',status='Not Started',category='Training',next='') {
 await page.locator('#task-title').fill(title);await page.locator('#task-date').fill(date);
 await page.selectOption('#task-priority',priority);await page.selectOption('#task-status',status);await page.selectOption('#task-category',category);await page.locator('#task-next-action').fill(next);await page.locator('#save-task').click();
}
await add('Upcoming exercise',dates[2],'Low');
await add('Today checklist',dates[1],'High','Waiting','Follow-up','Review practice outline');
await add('Overdue training',dates[0],'Medium','In Progress');
await add('Undated study','');
assert.equal(await page.locator('.task label').allTextContents().then(t=>t.join('|')),'Overdue training|Today checklist|Upcoming exercise|Undated study');
assert.equal(await page.locator('#active-count').textContent(),'4');assert.equal(await page.locator('#today-count').textContent(),'1');assert.equal(await page.locator('#overdue-count').textContent(),'1');
const original=(await saved()).find(t=>t.title==='Today checklist');
await page.getByRole('button',{name:'Edit task: Today checklist',exact:true}).click();
await page.locator('#task-title').fill('Edited checklist');await page.selectOption('#task-priority','Low');await page.selectOption('#task-category','Documentation');await page.selectOption('#task-status','In Progress');await page.locator('#task-next-action').fill('Read generic outline');await page.locator('#save-task').click();
let data=await saved();assert.equal(data.length,4);assert.equal(data.find(t=>t.title==='Edited checklist').id,original.id);assert.equal(data.find(t=>t.id===original.id).nextAction,'Read generic outline');assert.equal(data.find(t=>t.id===original.id).category,'Documentation');
await page.reload();assert.equal(await page.locator('.task').count(),4);
await page.selectOption('#priority-filter','Low');assert.equal(await page.locator('.task').count(),2);
await page.selectOption('#status-filter','In Progress');assert.equal(await page.locator('.task').count(),1);
await page.locator('#task-search').fill('GENERIC OUTLINE');assert.equal(await page.locator('.task').count(),1);
await page.locator('#task-search').fill('No matching task');assert.equal(await page.locator('.task').count(),0);
await page.locator('#task-search').fill('');await page.selectOption('#priority-filter','');await page.selectOption('#status-filter','');
await page.getByRole('checkbox',{name:'Complete task: Edited checklist',exact:true}).click();
assert.equal(await page.locator('#completed-count').textContent(),'1');assert.equal(await page.locator('#today-count').textContent(),'0');assert.equal(await page.locator('#active-count').textContent(),'3');
data=await saved();assert.equal(data.find(t=>t.id===original.id).status,'Completed');assert.equal(data.find(t=>t.id===original.id).completedOn,dates[1]);
await page.reload();assert.equal(await page.locator('#completed-count').textContent(),'1');
await page.getByRole('button',{name:'Edit task: Edited checklist',exact:true}).click();await page.locator('#task-title').fill('Cancelled change');await page.locator('#cancel-edit').click();assert.equal((await saved()).find(t=>t.id===original.id).title,'Edited checklist');
await page.getByRole('combobox',{name:'Status for Edited checklist',exact:true}).selectOption('Waiting');assert.equal(await page.locator('#completed-count').textContent(),'0');assert.equal((await saved()).find(t=>t.id===original.id).completedOn,'');
await page.getByRole('button',{name:'Delete task: Edited checklist',exact:true}).click();await page.reload();assert.equal((await saved()).length,3);assert.ok(!(await saved()).some(t=>t.id===original.id));
await page.locator('[data-filter=due]').click();assert.equal(await page.locator('.task').count(),1);await page.locator('[data-filter=all]').click();
await page.locator('#task-title').fill('   ');await page.locator('#save-task').click();assert.equal((await saved()).length,3);await page.locator('#task-title').fill('');
// Legacy records must migrate with IDs intact and without invented completion dates.
await page.evaluate(key=>localStorage.setItem(key,JSON.stringify([{id:'legacy-open',title:'Legacy practice',date:'',done:false},{id:'legacy-done',title:'Older exercise',date:'',done:true}])),key);await page.reload();
assert.equal(await page.locator('.task').count(),2);assert.equal(await page.locator('#completed-count').textContent(),'0');await page.getByRole('button',{name:'Edit task: Legacy practice',exact:true}).click();await page.locator('#save-task').click();data=await saved();assert.equal(data.length,2);assert.equal(data[0].id,'legacy-open');assert.equal(data[0].priority,'Medium');assert.equal(data[1].completedOn,'');
await page.selectOption('#template-select','practice');assert.ok((await page.locator('#template-preview').inputValue()).includes('PRACTICE DOCUMENTATION'));
await page.setViewportSize({width:375,height:812});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.evaluate(key=>localStorage.setItem(key,'invalid'),key);await page.reload();assert.ok((await page.locator('#storage-status').textContent()).includes('could not be read'));assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),'invalid');
assert.deepEqual(errors,[]);
console.log('PASS: creation/all fields, stable-ID editing, cancel, delete, search, combined filters, due sorting, summary counts, completion/reopen, reload persistence, legacy migration, whitespace validation, corrupt storage, templates, 375px layout. No page errors.');
} finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
