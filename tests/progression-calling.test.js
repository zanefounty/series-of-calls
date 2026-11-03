const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const securityFixture=require('../content/admission-security.json').reference_fixture;
const siteFixture=require('./helpers/site-fixture');
const marketFixture=require('./helpers/market-fixture');
const goal='progress.goal.scrub';
const run=(s,command)=>SOC.dispatch(s,command);

test('AC-SOC-283 calling progression routes scrub awards through actual shared dispatch evidence and preserves a strict historical proof',()=>{
 let s=SOC.create({scenario:'smb',mode:'assessed'});
 for(const command of SOC.reference(s))s=run(s,command);
 s=run(s,{type:'campaign',command:{action:'start'}});
 s=run(s,{type:'progression',command:{action:'start'}});
 s=run(s,{type:'admission-security',command:{action:'start'}});
 for(const command of securityFixture.configures)s=run(s,{type:'admission-security',command});
 s=run(s,{type:'configure',id:'people',config:{people:2}});
 s=run(s,{type:'advance',minutes:1});
 s=run(s,{type:'admission-security',command:securityFixture.packetBatch});
 for(const command of securityFixture.signallingSamples)s=run(s,{type:'admission-security',command});
 s=run(s,{type:'interact',channel:'voice',from:'alex',to:'+61355500201',caseId:'progression-blocked'});
 assert.equal(s.interactions.at(-1).outcome,'DESTINATION_NOT_ALLOWED');
 s=run(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'progression-allowed'});
 const interaction=s.interactions.at(-1).id;
 s=run(s,{type:'advance',minutes:5});
 assert.equal(s.interactions.find(x=>x.id===interaction).phase,'resolved');
 assert.equal(SOC.calculate(s).progression.goals[goal].status,'ready');
 s=run(s,{type:'progression',command:{action:'claim-goal',goal}});
 assert.equal(s.progression.goals[goal].status,'earned');
 s=run(s,{type:'advance',minutes:1});
 assert.equal(SOC.validateState(s),s);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s,'earned evidence remains valid after time advances');
 const changed=run(structuredClone(s),{type:'admission-security',command:{action:'configure',control:'destination',config:{...s.admissionSecurity.controls.destination.desired,enabled:false}}});
 assert.equal(SOC.calculate(changed).progression.goals[goal].status,'incomplete');
 assert.equal(SOC.validateState(changed),changed,'earned proof is historical and does not require current controls to remain ready');
 const forged=structuredClone(changed);forged.progression.goals[goal].evidence.evidence.evidence.assessment.passed=false;
 assert.throws(()=>SOC.validateState(forged),/INVALID_PROGRESSION_GOAL/);
});

test('AC-SOC-284 site continuity goal is awarded only from the validated site exercise receipt and remains historically verifiable',()=>{
 let s=siteFixture.siteFixture();
 s=SOC.dispatch(s,{type:'campaign',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'progression',command:{action:'start'}});
 s=siteFixture.exercise(s,'power','site-a','progression-site-proof');
 assert.equal(SOC.calculate(s).progression.goals['progress.goal.ln'].status,'ready');
 s=SOC.dispatch(s,{type:'progression',command:{action:'claim-goal',goal:'progress.goal.ln'}});
 assert.equal(s.progression.goals['progress.goal.ln'].status,'earned');
 assert.equal(SOC.validateState(s),s);
 const forged=structuredClone(s);forged.progression.goals['progress.goal.ln'].evidence.evidence.evidence[0].journeys[0]='invented-journey';
 assert.throws(()=>SOC.validateState(forged),/INVALID_PROGRESSION_GOAL/);
});

test('AC-SOC-285 capability overlay level is claimable through progression only from the supported customer portfolio evidence',()=>{
 const customers=marketFixture.fixtures.slice(0,2);
 let s=marketFixture.setup({customers,viaCustomers:customers.map(x=>x.id)});
 s=SOC.dispatch(s,{type:'campaign',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'progression',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'advance',minutes:60});
 assert.equal(SOC.calculate(s).progression.levels['progress.progression-level.10'].status,'ready');
 s=SOC.dispatch(s,{type:'progression',command:{action:'claim-level',level:'progress.progression-level.10'}});
 assert.equal(s.progression.levels['progress.progression-level.10'].status,'earned');
 assert.equal(SOC.validateState(s),s);
 const forged=structuredClone(s);forged.progression.levels['progress.progression-level.10'].evidence.evidence.evidence.customers[0].billing=[];
 assert.throws(()=>SOC.validateState(forged),/INVALID_PROGRESSION_LEVEL/);
});

test('AC-SOC-286 claiming a progression achievement does not change the current synthetic meeting fingerprint',()=>{
 let s=SOC.create({scenario:'smb',mode:'assessed'});
 for(const command of SOC.reference(s))s=SOC.dispatch(s,command);
 s=SOC.dispatch(s,{type:'campaign',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'progression',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'business',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'contact',quantity:1,unit:'agent',currency:'AUD',resources:['people','service'],customer:'customer',supportOwner:'orchard-msp',sell:true}});
 s=SOC.dispatch(s,{type:'advance',minutes:62});
 s=SOC.dispatch(s,{type:'meeting'});assert.equal(s.lastMeeting.success,true);
 const originalFingerprint=s.lastMeeting.fingerprint;
 s=SOC.dispatch(s,{type:'progression',command:{action:'claim-goal',goal:'progress.goal.bz'}});
 s=SOC.dispatch(s,{type:'meeting'});
 assert.equal(s.lastMeeting.success,true);
 assert.equal(s.lastMeeting.fingerprint,originalFingerprint);
});
