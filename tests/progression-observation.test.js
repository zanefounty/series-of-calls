const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const G=require('../src/game/41-progression.js');
const content=require('../content/progression.json');
const obligations=require('../spec/work-packages/campaign-obligations.json');
const goal=x=>`progress.goal.${x}`;

const person=(id,n,digitalConcurrency=2)=>({id,employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency,entitlements:[`seat-${String(n).padStart(2,'0')}`]});
const d=(s,command)=>SOC.dispatch(s,command);
function base(count=2,{transport=false,digitalConcurrency=2}={}){
 let s=SOC.create({scenario:'smb',mode:'assessed'});for(const c of SOC.reference(s))s=d(s,c);
 s=d(s,{type:'configure',id:'people',config:{people:count,entitlements:count,handlingMinutes:1,wrapMinutes:0,digitalConcurrency}});
 s=d(s,{type:'workforce',command:{action:'start'}});s=d(s,{type:'workforce',command:{action:'roster',people:Array.from({length:count},(_,i)=>person(`agent-${String.fromCharCode(97+i)}`,i+1,digitalConcurrency))}});
 s=d(s,{type:'contact',command:{action:'start'}});s=d(s,{type:'campaign',command:{action:'start'}});s=d(s,{type:'progression',command:{action:'start'}});s=d(s,{type:'service-observation',command:{action:'start'}});
 if(transport){s=d(s,{type:'transport',command:{action:'start'}});for(const c of [
  {action:'site',id:'origin',config:{name:'Synthetic origin',region:'AU',domain:'origin-site'}},{action:'site',id:'destination',config:{name:'Synthetic service',region:'AU',domain:'service-site'}},
  {action:'link',id:'path-a',config:{from:'origin',to:'destination',mode:'owned',capacityMbps:10,latencyMs:20,domain:'failure-domain-a',leadMinutes:1,setupCents:0,periodCents:0,contract:null}},
  {action:'link',id:'path-b',config:{from:'origin',to:'destination',mode:'owned',capacityMbps:10,latencyMs:40,domain:'failure-domain-b',leadMinutes:1,setupCents:0,periodCents:0,contract:null}},
  {action:'bind',resource:'identity',site:'origin'},{action:'bind',resource:'service',site:'destination'}])s=d(s,{type:'transport',command:c});}
 s=d(s,{type:'advance',minutes:1});return s;
}
function tick(s,n=1){for(let i=0;i<n;i++)s=d(s,{type:'advance',minutes:1});return s;}
function runTb(){let s=base();s=d(s,{type:'service-observation',command:{action:'open-window',goal:'tb'}});for(let n=0;n<10;n++){for(let j=0;j<2;j++)s=d(s,{type:'interact',channel:'voice',from:j?'bea':'alex',to:'+61255500201',caseId:`tb-${n}-${j}`,language:'en'});s=tick(s);}return s;}
function runT10(){let s=base(4,{digitalConcurrency:1});s=d(s,{type:'information',command:{action:'start'}});s=tick(s);s=d(s,{type:'service-observation',command:{action:'open-window',goal:'t10'}});const scheduleMeeting=()=>{s=d(s,{type:'information',command:{action:'book',start:s.clock,end:s.clock+1,attendees:2,event:false,language:'en'}});s=d(s,{type:'information',command:{action:'schedule',booking:s.information.bookings.at(-1).id}});};for(let n=0;n<15;n++){for(let j=0;j<2;j++)s=d(s,{type:'interact',channel:'voice',from:j?'bea':'alex',to:'+61255500201',caseId:`t10-v-${n}-${j}`,language:'en',durationMinutes:1});for(let j=0;j<2;j++)s=d(s,{type:'interact',channel:'message',from:j?'bea':'alex',to:'service',caseId:`t10-d-${n}-${j}`,language:'en'});if(n===2||n===7)scheduleMeeting();s=tick(s);}return s;}
function runRd(){let s=base(2,{transport:true});s=d(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'rd-same-case',language:'en'});s=tick(s,2);assert.equal(s.interactions.at(-1).phase,'resolved');s=tick(s);s=d(s,{type:'service-observation',command:{action:'open-window',goal:'rd'}});s=d(s,{type:'service-observation',command:{action:'inject-incident'}});s=tick(s);s=d(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'rd-same-case',language:'en'});s=tick(s,2);assert.equal(s.interactions.at(-1).phase,'resolved');s=d(s,{type:'service-observation',command:{action:'recover-incident'}});s=d(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'rd-same-case',language:'en'});s=tick(s,2);assert.equal(s.interactions.at(-1).phase,'resolved');return tick(s,5);}
function report(s,id){return SOC.calculate(s).progression.goals[goal(id)];}
function claim(s,id){return d(s,{type:'progression',command:{action:'claim-goal',goal:goal(id)}});}

test('AC-SOC-190 progression exposes the three source-linked observations as partial mechanics only',()=>{
 assert.equal(content.contentVersion,G.CONTENT);assert.deepEqual(content.runtime.implementedGoals,G.implementedGoals);
 const raw=new Map(obligations.items.map(x=>[x.sourceId,x]));
 for(const id of ['rd','tb','t10']){const row=content.records.find(x=>x.sourceId===goal(id)),source=raw.get(goal(id));assert.ok(row);assert.deepEqual(row.original.attributes,source.original.original_attributes);assert.equal(row.mechanicStatus,'partial');assert.equal(row.acceptanceStatus,'partial-mechanic-tested');assert.ok(row.remainingGaps.length);}
 assert.equal(content.records.find(x=>x.sourceId===goal('tb')).original.attributes.t,'Serve 1 Tbps');assert.equal(content.records.find(x=>x.sourceId===goal('tb')).original.attributes.ok,'()=>R.served>=1000');assert.equal(content.records.find(x=>x.sourceId===goal('tb')).original.attributes.r,75000);
 assert.equal(content.records.find(x=>x.sourceId===goal('t10')).original.attributes.t,'Serve 10 Tbps');assert.equal(content.records.find(x=>x.sourceId===goal('t10')).original.attributes.r,250000);
 let s=base();for(const id of ['rd','tb','t10']){assert.equal(report(s,id).status,'incomplete');assert.throws(()=>claim(s,id),/PROGRESSION_EVIDENCE_REQUIRED/);}
});

test('AC-SOC-191 a real closed tb window can be claimed, while missing or forged proof is rejected',()=>{
 let s=runTb();assert.equal(s.serviceObservation.windows.at(-1).status,'passed');assert.equal(report(s,'tb').status,'ready');
 const deleted=structuredClone(s);deleted.serviceObservation.proofs=[];assert.equal(report(deleted,'tb').status,'incomplete');
 for(const field of ['interactions','cases','assignments']){const missing=structuredClone(s);if(field==='assignments')missing.workforceOps.assignments=[];else missing[field]=field==='interactions'?[]:{};const error=field==='interactions'?{message:'ORPHAN_WORKFORCE_ASSIGNMENT'}:/INVALID_(SERVICE_OBSERVATION|WORKFORCE)_/;assert.throws(()=>SOC.validateState(missing),error,`removing retained ${field} must invalidate the root proof`);}
 const forged=structuredClone(s);forged.serviceObservation.proofs.at(-1).result.checks.journeys=false;assert.equal(report(forged,'tb').status,'incomplete');
 s=claim(s,'tb');assert.equal(s.progression.goals[goal('tb')].status,'earned');assert.equal(G.validate(s),true);
 s=d(s,{type:'configure',id:'phone',config:{capacity:11}});assert.equal(report(s,'tb').status,'incomplete','current readiness goes stale after a configuration generation changes');assert.equal(G.validate(s),true,'the earned award retains its immutable proof');
 const mutated=structuredClone(s);mutated.progression.goals[goal('tb')].evidence.evidence.proof.journeys[0].caseBound=false;assert.throws(()=>G.validate(mutated),/INVALID_PROGRESSION_GOAL/);
});

test('AC-SOC-192 t10 requires the full mixed-service proof before an award',()=>{
 let s=runT10();const w=s.serviceObservation.windows.at(-1);assert.equal(w.status,'passed');assert.equal(w.result.counts.voice>=8,true);assert.equal(w.result.counts.digital>=8,true);assert.equal(w.result.counts.meetings,2);assert.equal(w.result.counts.people,4);assert.equal(report(s,'t10').status,'ready');
 const noMeetings=structuredClone(s);noMeetings.serviceObservation.proofs.at(-1).result.checks.meetings=false;assert.equal(report(noMeetings,'t10').status,'incomplete');
 s=claim(s,'t10');assert.equal(s.progression.goals[goal('t10')].status,'earned');const roundtrip=SOC.restore(JSON.stringify(s));assert.equal(G.validate(roundtrip),true);
});

test('AC-SOC-193 rd award needs the same case and tenant across a live independent path, with historical evidence retained',()=>{
 let s=runRd();const w=s.serviceObservation.windows.at(-1);assert.equal(w.status,'passed');assert.equal(w.result.checks.sameTenant,true);assert.equal(w.result.checks.independentPath,true);assert.equal(report(s,'rd').status,'ready');
 const damaged=structuredClone(s);damaged.serviceObservation.proofs.at(-1).rd.during.domains=['failure-domain-a'];assert.equal(report(damaged,'rd').status,'incomplete');
 s=claim(s,'rd');s=d(s,{type:'transport',command:{action:'link',id:'path-b',config:{from:'origin',to:'destination',mode:'owned',capacityMbps:10,latencyMs:40,domain:'failure-domain-b',leadMinutes:1,setupCents:0,periodCents:0,contract:null}}});assert.equal(report(s,'rd').status,'incomplete','the current transport graph is no longer the observed proof configuration');assert.equal(G.validate(s),true,'historical continuity award remains valid');
 const bad=structuredClone(s);delete bad.progression.goals[goal('rd')].evidence.evidence.proof;assert.throws(()=>G.validate(bad),/INVALID_PROGRESSION_GOAL/);
});
