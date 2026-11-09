const {chromium}=require('./browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch();
try{
for(const [timezone,instant,expectedDay] of [
 ['America/Chicago','2026-11-09T00:30:00Z','2026-11-08'],
 ['Asia/Tokyo','2026-11-09T00:30:00Z','2026-11-09'],
 ['Pacific/Kiritimati','2026-11-09T12:30:00Z','2026-11-10'],
 ['America/Los_Angeles','2026-11-01T08:30:00Z','2026-11-01']
]){
const context=await browser.newContext({timezoneId:timezone});const p=await context.newPage();p.setDefaultTimeout(5000);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.clock.setFixedTime(new Date(instant));await p.goto((process.env.BASE_URL || 'http://127.0.0.1:8000'));
const dates=await p.evaluate(()=>[-1,0,1].map(offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}));assert.equal(dates[1],expectedDay);
const key='claims-companion.tasks.v1';const saved=()=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function add(title,date,status='Not Started',waiting=''){
 await p.locator('#task-title').fill(title);await p.locator('#task-date').fill(date);await p.selectOption('#task-status',status);await p.selectOption('#task-waiting-on',waiting);await p.locator('#save-task').click();
}
await add('Generic overdue review',dates[0]);await add('Generic today review',dates[1]);await add('Generic future review',dates[2]);await add('Waiting practice',dates[0],'Waiting','Internal Review');await add('Undated waiting practice','','Waiting');await add('Completed practice',dates[0],'Completed');await add('Undated generic task','');
assert.equal(await p.locator('#followup-overdue .followup-row').count(),1);assert.equal(await p.locator('#followup-today .followup-row').count(),1);assert.equal(await p.locator('#followup-upcoming .followup-row').count(),1);assert.equal(await p.locator('#followup-waiting .followup-row').count(),2);
assert.equal(await p.locator('#overdue-count').textContent(),'2');assert.equal(await p.locator('#today-count').textContent(),'1');assert.equal(await p.locator('.followup-row.is-overdue').count(),2);
assert.equal((await saved()).length,7);const id=(await saved()).find(t=>t.title==='Generic overdue review').id;
await p.reload();assert.equal((await saved()).find(t=>t.id===id).date,dates[0]);
await p.getByRole('textbox',{name:'Follow-up date for Generic overdue review',exact:true}).count();
await p.getByLabel('Follow-up date for Generic overdue review',{exact:true}).fill(dates[2]);await p.getByRole('button',{name:'Save follow-up date for Generic overdue review',exact:true}).click();
assert.equal((await saved()).length,7);assert.equal((await saved()).find(t=>t.id===id).date,dates[2]);assert.equal(await p.locator('#followup-upcoming .followup-row').count(),2);assert.equal(await p.locator('#overdue-count').textContent(),'1');
await p.getByRole('button',{name:'Edit task: Generic overdue review',exact:true}).click();assert.equal(await p.locator('#task-date').inputValue(),dates[2]);await p.locator('#cancel-edit').click();
for(const category of ['Customer','Repair Shop','Internal Review','Other Insurer','Other']){
 await p.getByLabel('Waiting on for Waiting practice',{exact:true}).selectOption(category);assert.equal((await saved()).find(t=>t.title==='Waiting practice').waitingOn,category);
}
await p.getByRole('button',{name:'Complete follow-up: Waiting practice',exact:true}).click();assert.equal(await p.locator('#overdue-count').textContent(),'0');assert.equal(await p.locator('#followup-waiting .followup-row').count(),1);assert.equal((await saved()).find(t=>t.title==='Waiting practice').status,'Completed');
await p.getByRole('button',{name:'Complete follow-up: Generic today review',exact:true}).click();assert.equal(await p.locator('#today-count').textContent(),'0');assert.equal(await p.locator('#followup-today .followup-row').count(),0);await p.reload();assert.equal(await p.locator('#today-count').textContent(),'0');
await p.getByRole('checkbox',{name:'Reopen task: Generic today review',exact:true}).click();assert.equal(await p.locator('#followup-today .followup-row').count(),1);
await p.getByLabel('Follow-up date for Generic future review',{exact:true}).fill('');await p.getByRole('button',{name:'Save follow-up date for Generic future review',exact:true}).click();assert.equal((await saved()).find(t=>t.title==='Generic future review').date,'');assert.equal(await p.locator('#followup-upcoming .followup-row').count(),1);
await p.setViewportSize({width:375,height:812});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok((await p.locator('#followups-title').locator('..').textContent()).includes('official system'));
assert.deepEqual(errors,[]);console.log(`PASS ${timezone}: local day ${expectedDay}; groups, counts, waiting categories, dates, shared IDs, no postponement, completion/reopen, persistence, mobile.`);
await context.close();
}
// Advance past local midnight without reloading to verify the timer updates classification.
const c=await browser.newContext({timezoneId:'America/Chicago'});const p=await c.newPage();await p.clock.install({time:new Date('2026-11-09T05:59:30Z')});await p.clock.pauseAt(new Date('2026-11-09T05:59:30Z'));await p.goto((process.env.BASE_URL || 'http://127.0.0.1:8000'));await p.locator('#task-title').fill('Midnight practice');await p.locator('#task-date').fill('2026-11-08');await p.locator('#save-task').click();assert.equal(await p.locator('#today-count').textContent(),'1');await p.clock.runFor(61000);assert.equal(await p.locator('#overdue-count').textContent(),'1');assert.equal(await p.locator('#today-count').textContent(),'0');assert.equal(await p.getByLabel('Follow-up date for Midnight practice',{exact:true}).inputValue(),'2026-11-08');console.log('PASS midnight: reclassification without changing date.');await c.close();
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
