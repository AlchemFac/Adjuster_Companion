const {chromium}=require('./browser.cjs');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch();
try{
const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});const p=await context.newPage();p.setDefaultTimeout(5000);const errors=[];p.on('pageerror',e=>errors.push(e.message));const requests=[];p.on('request',r=>requests.push(r.url()));
await p.goto((process.env.BASE_URL || 'http://127.0.0.1:8000'));
// Seed unrelated task data; documentation must not mutate it.
await p.locator('#task-title').fill('Generic training review');await p.locator('#save-task').click();
const baseline=await p.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}}));const baselineRequests=requests.length;
const fields=[['purpose','Purpose'],['action','Action taken'],['information','Information obtained'],['outstanding','Outstanding items'],['next','Next steps']];
const choices=[['customer-contact','Customer contact'],['contact-attempt','Contact attempt'],['investigation-update','Investigation update'],['repair-followup','Repair estimate follow-up'],['general-followup','General follow-up']];
for(const [id,title] of choices){
 await p.selectOption('#template-select',id);
 assert.equal(await p.locator('#documentation-fields textarea').count(),5);
 assert.equal(await p.locator('#doc-date').isVisible(),false);
 let expected=`${title.toUpperCase()}\n\n${fields.map(([_,label])=>`${label}:\n[Not provided]`).join('\n\n')}`;
 assert.equal(await p.locator('#template-preview').inputValue(),expected);
 for(const [field] of fields) await p.locator(`#doc-${field}`).fill(`Fictional practice ${field}\nSecond generic line`);
 expected=`${title.toUpperCase()}\n\n${fields.map(([field,label])=>`${label}:\nFictional practice ${field}\nSecond generic line`).join('\n\n')}`;
 assert.equal(await p.locator('#template-preview').inputValue(),expected);
 await p.locator('#include-doc-date').check();assert.equal(await p.locator('#doc-date').isVisible(),true);
 assert.ok((await p.locator('#template-preview').inputValue()).endsWith('Follow-up date:\n[Not provided]'));
 await p.locator('#doc-date').fill('2026-11-12');expected+='\n\nFollow-up date:\n2026-11-12';assert.equal(await p.locator('#template-preview').inputValue(),expected);
 await p.locator('#copy-template').click();await p.waitForFunction(()=>document.querySelector('#copy-status').textContent.startsWith('Copied'));
 assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),expected);
 await p.locator('#include-doc-date').uncheck();assert.ok(!(await p.locator('#template-preview').inputValue()).includes('Follow-up date:'));assert.equal(await p.locator('#doc-date').inputValue(),'');
 await p.locator('#clear-documentation').click();assert.equal(await p.locator('#template-preview').inputValue(),'');for(const [field] of fields) assert.equal(await p.locator(`#doc-${field}`).inputValue(),'');
 assert.equal(await p.locator('#doc-date').isVisible(),false);
 await p.locator('#copy-template').click();assert.ok((await p.locator('#copy-status').textContent()).includes('Nothing to copy'));
 assert.deepEqual(await p.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}})),baseline);
 console.log(`PASS ${title}: fields, blanks, exact preview, optional date, actual clipboard round-trip, clear, no storage writes.`);
}
// Template switching clears prior input, and potentially unsafe markup remains literal text.
await p.locator('#doc-purpose').fill('<img src=x onerror=alert(1)>');assert.ok((await p.locator('#template-preview').inputValue()).includes('<img src=x onerror=alert(1)>'));assert.equal(await p.locator('#documentation-form img').count(),0);
await p.selectOption('#template-select','customer-contact');assert.equal(await p.locator('#doc-purpose').inputValue(),'');
await p.locator('#doc-purpose').fill('Fictional draft not retained');await p.reload();assert.equal(await p.locator('#doc-purpose').inputValue(),'');assert.equal(await p.locator('.task').count(),1);
// Original learning outlines remain available.
for(const legacy of ['daily','followup','practice']){await p.selectOption('#template-select',legacy);assert.equal(await p.locator('#documentation-form').isVisible(),false);assert.ok((await p.locator('#template-preview').inputValue()).length>80);await p.locator('#copy-template').click();await p.waitForFunction(()=>document.querySelector('#copy-status').textContent.startsWith('Copied'));assert.equal(await p.evaluate(()=>navigator.clipboard.readText()),await p.locator('#template-preview').inputValue());}
// Force clipboard refusal to exercise fallback, not just the success message.
await p.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:()=>Promise.reject(new Error('Denied'))}));await p.locator('#copy-template').click();await p.waitForFunction(()=>document.querySelector('#copy-status').textContent.includes('unavailable'));assert.equal(await p.locator('#template-preview').evaluate(el=>el.selectionEnd-el.selectionStart), (await p.locator('#template-preview').inputValue()).length);
await p.selectOption('#template-select','general-followup');await p.locator('#doc-purpose').fill('Fictional temporary draft');await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await p.locator('#doc-purpose').inputValue(),'');assert.equal(await p.locator('#template-preview').inputValue(),'');
await p.setViewportSize({width:375,height:812});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(new URL(process.env.BASE_URL || 'http://127.0.0.1:8000').origin + '/')));assert.deepEqual(await p.evaluate(()=>({local:{...localStorage},session:{...sessionStorage}})),baseline);console.log('PASS legacy outlines, literal markup, draft removal on reload/departure, clipboard refusal fallback, unchanged tasks, no external requests, mobile layout; no JavaScript errors.');
await context.close();
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
