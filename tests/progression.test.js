const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const C=require('../src/game/44-campaign.js');
const P=require('../src/game/45-products.js');
const G=require('../src/game/41-progression.js');
const content=require('../content/progression.json');
const obligations=require('../spec/work-packages/campaign-obligations.json');
const narrative=require('../content/narrative.json');
const hooks={
 configurationFingerprint:s=>JSON.stringify([Object.entries(s.resources).map(([id,r])=>[id,r.generation,r.desired,r.effective]),SOC.operations.fingerprint(s),SOC.information.fingerprint(s),SOC.contact.fingerprint(s),SOC.workforce.fingerprint(s),s.calling?SOC.calling.fingerprint(s.calling):null,s.products?SOC.products.fingerprint(s):null,s.channels?SOC.channels.fingerprint(s.channels):null,s.outcomes?SOC.outcomes.fingerprint(s):null,s.boundaries?SOC.boundaries.fingerprint(s):null,s.transport?SOC.transport.fingerprint(s):null]),
 observeResource:(s,id)=>SOC.observe(s,id),
 dispatchRootCommand:(s,command)=>SOC.dispatch(s,command)
};
const productHooks={validateBinding:()=>true,observeDependency:(s,kind,resource)=>{const r=s.resources?.[resource];if(!r)return {ready:false,reason:'MISSING_DEPENDENCY'};const result=SOC.observe(s,resource);return {ready:result.ready,generation:r.generation,reason:result.reasons[0]||'DEPENDENCY_UNAVAILABLE'};},testDirectionalPath:(s,a,b)=>a.effective?.region===b.effective?.region&&a.effective?.region===s.jurisdiction};
const progressionHooks=(s,id,feature,resource)=>SOC.observe(s,resource).ready&&P.bindingStatus(s,id,feature,resource,productHooks).available;
function ready(){let s=SOC.create({scenario:'smb',mode:'assessed'});for(const c of SOC.reference(s))s=SOC.dispatch(s,c);s.campaign=C.create(s);s.progression=G.create(s);return s;}
function tick(s,n=1){for(let i=0;i<n;i++){s=SOC.dispatch(s,{type:'advance',minutes:1});if(s.campaign)C.advance(s,hooks);}return s;}
function open(s,kind){C.command(s,{action:'open-window',kind},hooks);return s;}
function awardSmb(s){
 open(s,'baseline');s=tick(s,1);
 open(s,'service');s=SOC.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:'progress-live-case'});s=tick(s,5);
 open(s,'recovery');C.command(s,{action:'inject-incident'},hooks);s=tick(s,1);C.command(s,{action:'recover-incident'},hooks);
 s=SOC.dispatch(s,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:'progress-recovery-case'});s=tick(s,7);
 s=SOC.dispatch(s,{type:'business',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'contact',quantity:1,unit:'agent',currency:'AUD',resources:['people','service'],customer:'customer',supportOwner:'orchard-msp',sell:true}});
 s=tick(s,2);open(s,'economics');s=tick(s,60);C.command(s,{action:'assess'},hooks);return s;
}
function productReady(){
 let s=ready();s.products=P.create(s);
 const cmd=(action,body)=>{s=SOC.dispatch(s,{type:'products',command:{action,...body}});};
 s=SOC.dispatch(s,{type:'business',command:{action:'start'}});s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone'],customer:'customer',supportOwner:'orchard-msp',sell:true}});
 cmd('offer',{offer:{id:'queue-offer-a',family:'cisco:suite-calling',edition:'fictional',unit:'session',quantity:2,features:['multitenant-calling'],dependencies:{identity:'identity',carrier:'carrier'}}});
 cmd('offer',{offer:{id:'queue-offer-b',family:'microsoft:workplace-phone',edition:'fictional',unit:'seat',quantity:2,features:['telephony'],dependencies:{identity:'identity'}}});s=tick(s,1);
 cmd('deploy',{id:'queue-service-a',offer:'queue-offer-a',productVersion:'fictional-1',mode:'multitenant',region:'AU',bindings:[{feature:'multitenant-calling',resources:['phone']}]});
 cmd('deploy',{id:'queue-service-b',offer:'queue-offer-b',productVersion:'fictional-2',mode:'multitenant',region:'AU',bindings:[{feature:'telephony',resources:['phone']}]});s=tick(s,1);
 cmd('integration',{id:'queue-integration',source:'queue-service-a',target:'queue-service-b',features:[{sourceFeature:'multitenant-calling',targetFeature:'telephony'}]});cmd('test-integration',{id:'queue-integration'});
 return s;
}
function billed(s){
 if(!s.business)s=SOC.dispatch(s,{type:'business',command:{action:'start'}});
 if(!s.business.contracts.length)s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'contact',quantity:1,unit:'agent',currency:'AUD',resources:['people','service'],customer:'customer',supportOwner:'orchard-msp',sell:true}});
 return tick(s,62);
}

test('AC-SOC-141 progression rows preserve original source attributes, witty adaptations and pending boundaries',()=>{
 assert.equal(content.records.length,32);assert.equal(obligations.items.length,32);assert.equal(content.balanceStatus,'fictional thresholds selected for implementation; not validated gameplay balance');
 for(const source of obligations.items){const row=content.records.find(x=>x.sourceId===source.sourceId);assert.ok(row,source.sourceId);assert.deepEqual(row.original.attributes,source.original.original_attributes);assert.equal(row.original.sourceFile,source.original.source_file);assert.equal(row.original.sourceSymbol,source.original.source_symbol);assert.equal(row.original.sha256,source.sourceRecordSha256);}
 assert.equal(content.records.filter(x=>x.narrative).length,13);assert.equal(content.records.find(x=>x.sourceId==='progress.progression-level.1').narrative.text,narrative.entries.find(x=>x.source==='progress.progression-level.1').text);
 assert.deepEqual(content.implementedSourceRows,[...G.implementedGoals,...G.implementedLevels]);assert.deepEqual(content.pendingSourceRows,[]);assert.equal(content.scope.includes('no source obligation is claimed complete'),true);
 assert.deepEqual(G.goalIds,obligations.items.filter(x=>x.sourceId.startsWith('progress.goal.')).map(x=>x.sourceId));assert.deepEqual(G.levelIds,obligations.items.filter(x=>x.sourceId.startsWith('progress.progression-level.')).map(x=>x.sourceId));
});

test('AC-SOC-142 an empty or sandbox campaign cannot unlock level or goal milestones',()=>{
 let s=SOC.create({scenario:'smb',mode:'sandbox'});s.campaign=C.create(s);s.progression=G.create(s);
 const before=JSON.stringify(s.progression),report=G.calculate(s);assert.equal(report.levels['progress.progression-level.1'].status,'locked');assert.equal(report.goals['progress.goal.bb'].status,'incomplete');assert.equal(report.goals['progress.goal.bz'].status,'incomplete');assert.equal(report.goals['progress.goal.ix'].status,'incomplete');assert.equal(JSON.stringify(s.progression),before);
 assert.throws(()=>G.command(s,{action:'claim-level',level:'progress.progression-level.1'}),/PROGRESSION_EVIDENCE_REQUIRED/);
 assert.throws(()=>G.command(s,{action:'claim-goal',goal:'progress.goal.tr'}),/PROGRESSION_EVIDENCE_REQUIRED/);
 assert.equal(report.goals['progress.goal.tr'].implementation,'partial');assert.equal(report.goals['progress.goal.tr'].status,'incomplete');
 assert.equal(report.goals['progress.goal.gi'].implementation,'partial');assert.equal(report.goals['progress.goal.gi'].status,'incomplete');
});

test('AC-SOC-143 first managed contract requires accepted player order, active service, support role and actual billing',()=>{
 let s=ready();s.progression=G.create(s);assert.equal(G.calculate(s).goals['progress.goal.bz'].status,'incomplete');
 s=billed(s);const report=G.calculate(s).goals['progress.goal.bz'];assert.equal(report.status,'ready');assert.deepEqual({kind:report.evidence.kind,customer:report.evidence.customer,supportOwner:report.evidence.supportOwner,billedPeriods:report.evidence.billedPeriods},{kind:'accepted-supported-billed-contract',customer:'customer',supportOwner:'orchard-msp',billedPeriods:1});
 G.command(s,{action:'claim-goal',goal:'progress.goal.bz'});assert.equal(s.progression.awards.length,1);assert.equal(s.progression.awards[0].reward.sourceCashConversion,'none');
});

test('AC-SOC-144 first customer live requires the assessed SMB award and retained resolved case lineage',()=>{
 let s=ready();s.progression=G.create(s);s=awardSmb(s);assert.equal(s.campaign.progress.smb.award.track,'smb');
 assert.equal(G.calculate(s).goals['progress.goal.bb'].status,'ready');assert.equal(G.calculate(s).levels['progress.progression-level.1'].status,'ready');
 const saved=structuredClone(s);saved.interactions=[];saved.cases={};
 assert.equal(G.calculate(saved).goals['progress.goal.bb'].status,'ready','campaign acceptance evidence survives bounded interaction history pruning');assert.equal(G.calculate(saved).levels['progress.progression-level.1'].status,'ready');
 const forged=structuredClone(s);const service=forged.campaign.progress.smb.windows.find(w=>w.kind==='service'&&w.status==='passed');service.evidence.traces.interactions[0].context=false;
 assert.equal(G.calculate(forged).goals['progress.goal.bb'].status,'incomplete');assert.equal(G.calculate(forged).levels['progress.progression-level.1'].status,'locked');
 const earned=structuredClone(s);G.command(earned,{action:'claim-goal',goal:'progress.goal.bb'});
 let busy=structuredClone(earned);for(let i=0;i<201;i++){busy=SOC.dispatch(busy,{type:'interact',channel:'message',from:'alex',to:'+61255500201',caseId:`history-case-${i}`});busy=tick(busy,5);}
 assert.equal(busy.interactions.length,200);assert.equal(G.validate(busy),true,'the earned badge remains valid after 201 real interactions roll the original case out of the bounded history ring');
 earned.interactions=[];earned.cases={};assert.equal(G.validate(earned),true,'an earned badge validates from immutable campaign evidence after interaction history pruning');
});

test('AC-SOC-145 milestone claims are explicit, one-time and do not convert source cash rewards',()=>{
 let s=awardSmb(ready());s.progression=G.create(s);const before=G.fingerprint(s);G.command(s,{action:'claim-goal',goal:'progress.goal.bb'});G.command(s,{action:'claim-goal',goal:'progress.goal.bz'});G.command(s,{action:'claim-level',level:'progress.progression-level.1'});assert.notEqual(G.fingerprint(s),before);
 const snapshot=JSON.stringify(s.business),again=G.command(s,{action:'claim-goal',goal:'progress.goal.bb'});assert.equal(again.status,'earned');assert.equal(s.progression.awards.length,3);assert.equal(JSON.stringify(s.business),snapshot);
 for(const a of s.progression.awards)assert.deepEqual(a.reward,{kind:'badge',unit:'achievement',amount:1,sourceCashConversion:'none'});
 const billedContract=s.progression.awards.find(a=>a.sourceId==='progress.goal.bz').evidence.contractId;
 s=SOC.dispatch(s,{type:'business',command:{action:'cancel',contract:billedContract}});assert.equal(G.validate(s),true,'cancelling a contract does not invalidate its historic earned evidence');
});

test('AC-SOC-146 ecosystem integration requires current tested versions, successful directional checks and scoped support',()=>{
 let s=productReady();assert.equal(G.calculate(s).goals['progress.goal.ix'].status,'incomplete');s=billed(s);
 assert.equal(G.calculate(s,{productBindingAvailable:progressionHooks}).goals['progress.goal.ix'].status,'ready');G.command(s,{action:'claim-goal',goal:'progress.goal.ix'}, {productBindingAvailable:progressionHooks});
 const faulted=SOC.dispatch(structuredClone(s),{type:'fault',id:'phone',fault:'OUTAGE'});assert.equal(G.calculate(faulted,{productBindingAvailable:progressionHooks}).goals['progress.goal.ix'].status,'incomplete');
 s=SOC.dispatch(s,{type:'products',command:{action:'configure',id:'queue-service-a',config:{productVersion:'fictional-3'}}});s=tick(s,1);
 s=SOC.dispatch(s,{type:'products',command:{action:'test-integration',id:'queue-integration'}});assert.equal(s.products.integrations[0].result.status,'blocked');assert.equal(G.validate(s),true,'an earned integration badge retains the version-scoped proof after a later reconfiguration and retest');
 assert.equal(G.calculate(s,{productBindingAvailable:progressionHooks}).goals['progress.goal.ix'].status,'incomplete');
});

test('AC-SOC-147 progression inspection, fingerprint and worker serialization are deterministic and pure',()=>{
 let s=billed(ready());s.progression=G.create(s);const state=JSON.stringify(s),fp=G.fingerprint(s),a=JSON.stringify(G.inspect(s)),b=JSON.stringify(G.inspect(s));assert.equal(a,b);assert.equal(JSON.stringify(s),state);assert.equal(G.fingerprint(s),fp);
 const worker={};vm.createContext(worker);vm.runInContext(G.source()+';globalThis.progressionPack=SOC_PROGRESSION;',worker);const W=worker.progressionPack,restored=structuredClone(s);assert.equal(W.validate(restored),true);assert.equal(W.fingerprint(restored),fp);assert.equal(JSON.stringify(W.inspect(restored)),a);
});

test('AC-SOC-148 save validation rejects forged awards, altered source IDs and invented pending completions',()=>{
 let s=awardSmb(ready());s.progression=G.create(s);G.command(s,{action:'claim-goal',goal:'progress.goal.bb'});
 const bad=structuredClone(s);bad.progression.awards[0].evidence.contractId='contract-invented';bad.progression.goals['progress.goal.bb'].evidence=structuredClone(bad.progression.awards[0]);assert.throws(()=>G.validate(bad),/INVALID_PROGRESSION/);
 const badSource=structuredClone(s);badSource.progression.goals['progress.goal.tr'].status='earned';badSource.progression.goals['progress.goal.tr'].evidence=structuredClone(badSource.progression.awards[0]);assert.throws(()=>G.validate(badSource),/INVALID_PROGRESSION/);
 const badPending=structuredClone(s);badPending.progression.levels['progress.progression-level.2'].status='earned';badPending.progression.levels['progress.progression-level.2'].evidence=structuredClone(badPending.progression.awards[0]);assert.throws(()=>G.validate(badPending),/INVALID_PROGRESSION/);
});
