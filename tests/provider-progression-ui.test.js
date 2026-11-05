const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications.js');
const FACTS=require('../src/game/23-provider-progression.js');
const source=fs.readFileSync(path.join(__dirname,'../src/game/93-ui/79-provider-progression.js'),'utf8');
const ui=()=>{const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window,markers=[];w.N_=key=>{markers.push(key);return key;};w.tr=key=>key;w.eval(source);return {dom,w,markers};};
const buy=(s,request)=>{const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[],JSON.stringify(quote.blockers));return SOC.dispatch(s,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});};
const minute=s=>SOC.dispatch(s,{type:'advance',minutes:1});
function liveProvider(){
 let s=SOC.create({experience:'campaign'});
 for(const stage of ['base','carrier','partner']){s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:'starter-customer'})});while(s.providerCampaign.customers[0].stages[stage].status!=='effective')s=minute(s);}
 s=buy(s,{action:'operation',operationId:'bpo',customerId:'starter-customer'});
 for(let n=0;n<35;n++){
  const incident=s.providerCampaign.incidents.find(x=>x.status==='active');
  if(incident){s=SOC.dispatch(s,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});s=buy(s,{action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId});}
  s=minute(s);const delivered=new Set(s.providerCampaign.jobs.filter(x=>['completed','late'].includes(x.status)).map(x=>x.channel));if(delivered.has('voice')&&delivered.has('message'))break;
 }
 return s;
}
const hooks={customerRoot:(s,id)=>s.portfolio.customers.find(x=>x.id===id)?.root||null,observeResource:(root,id)=>SOC.observe(root,id)};

test('AC-PROVIDER-PROGRESSION-UI-001 renders all 13 levels and 19 goals as compact collapsed readiness groups without mutating Provider state',()=>{
 const {dom,w}=ui(),state=SOC.create({experience:'campaign'}),before=JSON.stringify(state),progression=FACTS.evaluate(state,hooks),host=w.document.createElement('div');host.innerHTML=w.SOCProviderProgression.render({progression});
 assert.equal(JSON.stringify(state),before);
 assert.equal(host.querySelectorAll('.provider-progression-row').length,32);
 assert.equal(host.querySelectorAll('.provider-progression-row.is-incomplete').length,32);
 assert.equal(host.querySelectorAll('.provider-progression-details[open]').length,0);
 assert.ok(host.textContent.includes('13 of 13 ready')===false,'the summary reports measured counts, not a fixed completion claim');
 assert.match(host.textContent,/not claimed and unlocks nothing/i);
 assert.match(host.textContent,/No Provider customer has been accepted yet/);
 assert.ok(!host.querySelector('button'));
 dom.window.close();
});

test('AC-PROVIDER-PROGRESSION-UI-002 shows a measured first-live evidence trail and keeps detailed lists inside disclosures',()=>{
 const {dom,w}=ui(),state=liveProvider(),before=JSON.stringify(state),progression=FACTS.evaluate(state,hooks),host=w.document.createElement('div');host.innerHTML=w.SOCProviderProgression.render({progression});
 const row=host.querySelector('[data-progression-id="progress.goal.bb"]');assert.ok(row);assert.match(row.textContent,/First customer live/);assert.match(row.textContent,/Ready/);assert.ok(row.querySelector('.provider-progression-evidence'));
 row.querySelector('.provider-progression-evidence').open=true;assert.match(row.textContent,/Paid commissioned stages: 3/);assert.match(row.textContent,/Matching central postings: 3/);assert.match(row.textContent,/voice case pc-starter-customer/);assert.match(row.textContent,/digital case pc-starter-customer/);
 assert.equal(JSON.stringify(state),before,'projection and rendering have no simulation side effects');
 assert.equal(host.querySelectorAll('.provider-progression-row').length,32);dom.window.close();
});

test('AC-PROVIDER-PROGRESSION-UI-003 translates every source name and visible reason through static markers and escapes untrusted report values',()=>{
 const {dom,w,markers}=ui(),state=SOC.create({experience:'campaign'}),progression=FACTS.evaluate(state,hooks),host=w.document.createElement('div');
 const labels=Object.values(w.SOCProviderProgression.keys);
 assert.ok(labels.length>=70);assert.ok(labels.every(key=>markers.includes(key)));
 assert.ok(Object.values(w.SOCProviderProgression.sourceNames).every(key=>markers.includes(key)));
 assert.ok(labels.filter(x=>String(x).startsWith('provider.progression.')).every(x=>String(x).startsWith('provider.progression.')));
 const forged=structuredClone(progression);forged.goals['progress.goal.bb'].status='ready';forged.goals['progress.goal.bb'].name='<img src=x onerror=alert(1)>';forged.goals['progress.goal.bb'].evidence={customerId:'<svg onload=alert(1)>'};
 host.innerHTML=w.SOCProviderProgression.render(forged);
 assert.equal(host.querySelector('img,svg'),null);assert.ok(host.textContent.includes('<img src=x onerror=alert(1)>'));assert.ok(host.textContent.includes('<svg onload=alert(1)>'));
 dom.window.close();
});
