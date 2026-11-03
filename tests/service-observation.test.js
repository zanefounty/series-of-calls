const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const W=require('../src/game/49-workforce.js');
const O=require('../src/game/39-service-observation.js');
const content=require('../content/service-observation.json');

function ready(){let s=SOC.create({scenario:'smb',mode:'assessed'});for(const c of SOC.reference(s))s=SOC.dispatch(s,c);return s;}
function tick(s,n=1){for(let i=0;i<n;i++)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}
function begin(s,goal){s=SOC.dispatch(s,{type:'service-observation',command:{action:'start'}});return SOC.dispatch(s,{type:'service-observation',command:{action:'open-window',goal}});}
function person(id,seat,digitalConcurrency=2){return {id,employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency,entitlements:[seat]};}

test('AC-SOC-177 source units remain typed and the selected thresholds make no cash or bandwidth conversion',()=>{
 assert.equal(content.pack,O.PACK);assert.equal(content.version,O.CONTENT);assert.equal(content.fictionalBalance,true);
 assert.deepEqual(content.sourceIds,O.sourceIds);assert.deepEqual(content.goals,O.GOALS);assert.deepEqual(content.thresholds,O.thresholds);assert.deepEqual(content.required,O.required);
 assert.equal(content.sourceUnits.rd.sourceUnit,'source-game-cash');assert.equal(content.sourceUnits.rd.sourceValue,12500);assert.equal(content.sourceUnits.rd.conversion,'none');
 assert.equal(content.sourceUnits.tb.originalTitle,'Serve 1 Tbps');assert.equal(content.sourceUnits.tb.sourceUnit,'Gbit/s');assert.equal(content.sourceUnits.tb.sourcePredicate,'R.served>=1000');assert.equal(content.sourceUnits.tb.rewardValue,75000);assert.equal(content.sourceUnits.tb.conversion,'none');
 assert.equal(content.sourceUnits.t10.originalTitle,'Serve 10 Tbps');assert.equal(content.sourceUnits.t10.sourceUnit,'Gbit/s');assert.equal(content.sourceUnits.t10.sourcePredicate,'R.served>=10000');assert.equal(content.sourceUnits.t10.rewardValue,250000);assert.equal(content.sourceUnits.t10.conversion,'none');
 for(const goal of O.GOALS)assert.deepEqual(content.sourceObligations.find(x=>x.sourceId===`progress.goal.${goal}`).status,'partial-mechanic-integrated-progression-pending');
 assert.deepEqual(O.thresholds.tb,{minutes:10,journeys:12,completionPercent:90,activeBuckets:8,people:2,concurrentSamples:3,concurrent:2});
 assert.deepEqual(O.thresholds.t10,{minutes:15,journeys:30,completionPercent:90,activeBuckets:12,people:4,concurrentSamples:5,concurrent:4,voice:8,digital:8,meetings:2});
});

test('AC-SOC-178 sampling is minute-exact, inspection is pure, and a skipped minute is sticky failure',()=>{
 let s=begin(ready(),'tb'),before=JSON.stringify(s.serviceObservation),fp=O.fingerprint(s),a=O.inspect(s),b=O.calculate(s);
 assert.deepEqual(a,b);assert.equal(JSON.stringify(s.serviceObservation),before);assert.equal(O.fingerprint(s),fp);
 s=tick(s,1);assert.equal(s.serviceObservation.active.samples.length,1);assert.equal(O.validate(s),true);
 s.clock+=2;O.advance(s);assert.equal(s.serviceObservation.active,null);assert.ok(s.serviceObservation.windows[0].errors.includes('OBSERVATION_SAMPLE_GAP'));
 assert.equal(s.serviceObservation.windows[0].status,'failed');assert.equal(O.validate(s),true);
});

test('AC-SOC-179 a real core save with no staffed journeys cannot qualify as sustained service',()=>{
 let s=begin(ready(),'tb');s=tick(s,10);
 const report=O.calculate(s);assert.equal(report.goals.tb.status,'incomplete');assert.equal(s.serviceObservation.windows[0].status,'failed');
 assert.equal(s.serviceObservation.windows[0].result.checks.journeys,false);assert.equal(s.serviceObservation.windows[0].result.checks.people,false);assert.equal(O.validate(s),true);

 s=ready();s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:2,entitlements:2,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:2}});s=SOC.dispatch(s,{type:'workforce',command:{action:'start'}});s=SOC.dispatch(s,{type:'workforce',command:{action:'roster',people:[person('agent-a','seat-01'),person('agent-b','seat-02')]}});s=SOC.dispatch(s,{type:'contact',command:{action:'start'}});s=tick(s,1);s=SOC.dispatch(s,{type:'service-observation',command:{action:'start'}});s=SOC.dispatch(s,{type:'service-observation',command:{action:'open-window',goal:'tb'}});
 for(let n=0;n<10;n++){for(let j=0;j<2;j++)s=SOC.dispatch(s,{type:'interact',channel:'voice',from:j?'bea':'alex',to:'+61255500201',caseId:`tb-case-${n}-${j}`,language:'en'});s=tick(s,1);}
 const passed=s.serviceObservation.windows[0];assert.equal(passed.status,'passed');assert.equal(passed.result.checks.journeys,true);assert.equal(passed.result.checks.people,true);assert.equal(passed.result.checks.concurrency,true);assert.equal(O.validate(s),true);
});

test('AC-SOC-180 licenses do not stand in for named people',()=>{
 let s=ready();s=SOC.dispatch(s,{type:'workforce',command:{action:'start'}});
 const roster=[person('agent-a','seat-01'),person('agent-b','seat-02')];
 s=SOC.dispatch(s,{type:'workforce',command:{action:'roster',people:roster}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 const capacity=W.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'});
 assert.deepEqual(capacity.people,['agent-a','agent-b']);assert.equal(capacity.throughput,30);
 let noPeople=structuredClone(s);noPeople.workforceOps.roster.effective=[];
 assert.equal(W.effectiveCapacity(noPeople,{channel:'voice',skill:'service',language:'en'}).people.length,0);
 noPeople=SOC.dispatch(noPeople,{type:'service-observation',command:{action:'start'}});noPeople=SOC.dispatch(noPeople,{type:'service-observation',command:{action:'open-window',goal:'tb'}});
 noPeople=SOC.dispatch(noPeople,{type:'advance',minutes:1});assert.equal(noPeople.serviceObservation.active.samples[0].agentCount,0);
});

test('AC-SOC-181 t10 independently requires voice, digital, meetings, concurrency and four assigned people',()=>{
 const s=begin(ready(),'t10'),checks=O.calculate(s).active.result.checks;
 assert.equal(checks.channels,false);assert.equal(checks.meetings,false);assert.equal(checks.people,false);assert.equal(checks.concurrency,false);
 let botRoot=ready();botRoot=SOC.dispatch(botRoot,{type:'configure',id:'people',config:{people:4,entitlements:4,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:1}});botRoot=SOC.dispatch(botRoot,{type:'workforce',command:{action:'start'}});botRoot=SOC.dispatch(botRoot,{type:'workforce',command:{action:'roster',people:[person('agent-a','seat-01',1),person('agent-b','seat-02',1),person('agent-c','seat-03',1),person('agent-d','seat-04',1)]}});botRoot=SOC.dispatch(botRoot,{type:'contact',command:{action:'start'}});botRoot=SOC.dispatch(botRoot,{type:'outcomes',command:{action:'start'}});botRoot=SOC.dispatch(botRoot,{type:'outcomes',command:{action:'configure',config:{supportedIntents:['appointment'],taskIntegrations:[{intent:'appointment',integration:'engage',evidence:['confirmed']}],handoffDestination:'service',maxAttempts:3,repeatInterval:5,repeatEffort:1,contextLossEffort:2,maxRepeatEmissionsPerAdvance:2}}});botRoot=SOC.dispatch(botRoot,{type:'configure',id:'engage',config:{botResolves:true}});botRoot=tick(botRoot,1);botRoot=SOC.dispatch(botRoot,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'bot-retained-case',language:'en'});botRoot=tick(botRoot,2);assert.equal(botRoot.interactions.at(-1).phase,'resolved');botRoot=SOC.dispatch(botRoot,{type:'service-observation',command:{action:'start'}});botRoot=SOC.dispatch(botRoot,{type:'service-observation',command:{action:'open-window',goal:'t10'}});
 for(let n=0;n<15;n++){for(let j=0;j<2;j++)botRoot=SOC.dispatch(botRoot,{type:'interact',channel:'voice',from:j?'bea':'alex',to:'+61255500201',caseId:`bot-voice-${n}-${j}`,language:'en'});for(let j=0;j<2;j++){const need=SOC.dispatch(botRoot,{type:'outcomes',command:{action:'need',caseId:'bot-retained-case',person:'alex',tenant:'orchard-repairs',intent:'appointment',permittedChannels:['message'],purpose:'service'}});botRoot=SOC.dispatch(need,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'bot-retained-case',language:'en',needId:need.outcomes.needs.at(-1).id});}if(n===2||n===7)botRoot=SOC.dispatch(botRoot,{type:'meeting'});botRoot=tick(botRoot,1);}
 const botEvidence=botRoot.interactions.filter(i=>i.botAnswered&&i.needOutcome?.outcome==='unresolved');assert.ok(botEvidence.length>=8);assert.equal(botRoot.serviceObservation.windows[0].status,'failed');assert.equal(botRoot.serviceObservation.windows[0].result.checks.channels,false);assert.equal(botRoot.serviceObservation.windows[0].result.checks.journeys,false);assert.equal(O.validate(botRoot),true);assert.equal(O.validate(s),true);

 let root=SOC.create({scenario:'enterprise',mode:'assessed'});for(const c of SOC.reference(root))root=SOC.dispatch(root,c);root=SOC.dispatch(root,{type:'configure',id:'people',config:{people:4,entitlements:4,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:1}});root=SOC.dispatch(root,{type:'workforce',command:{action:'start'}});root=SOC.dispatch(root,{type:'workforce',command:{action:'roster',people:[person('agent-a','seat-01',1),person('agent-b','seat-02',1),person('agent-c','seat-03',1),person('agent-d','seat-04',1)]}});root=SOC.dispatch(root,{type:'contact',command:{action:'start'}});root=tick(root,1);root=SOC.dispatch(root,{type:'service-observation',command:{action:'start'}});root=SOC.dispatch(root,{type:'service-observation',command:{action:'open-window',goal:'t10'}});
 for(let n=0;n<15;n++){for(let j=0;j<2;j++)root=SOC.dispatch(root,{type:'interact',channel:'voice',from:j?'bea':'alex',to:'+61255500201',caseId:`t10-v-${n}-${j}`,language:'en'});for(let j=0;j<2;j++)root=SOC.dispatch(root,{type:'interact',channel:'message',from:j?'bea':'alex',to:'service',caseId:`t10-d-${n}-${j}`,language:'en'});if(n===2||n===7)root=SOC.dispatch(root,{type:'meeting'});root=tick(root,1);}
 const result=root.serviceObservation.windows[0];assert.equal(result.status,'passed');assert.equal(result.result.checks.channels,true);assert.equal(result.result.checks.meetings,true);assert.equal(result.result.checks.people,true);assert.equal(result.result.counts.people,4);assert.equal(result.result.checks.concurrency,true);assert.equal(O.validate(root),true);
});

test('AC-SOC-182 transport continuity needs a real baseline and validated root dispatch',()=>{
 let root=ready();root=SOC.dispatch(root,{type:'transport',command:{action:'start'}});const s=begin(root,'rd');
 assert.throws(()=>O.command(s,{action:'inject-incident'},{}),/SERVICE_OBSERVATION_BASELINE_PATH_REQUIRED/);
 assert.throws(()=>O.command(s,{action:'recover-incident'},{}),/SERVICE_OBSERVATION_INCIDENT_RECOVERY_INVALID/);
 assert.equal(O.calculate(s).active.result.checks.rdEvidence,false);

 let root2=SOC.create({scenario:'enterprise',mode:'assessed'});for(const c of SOC.reference(root2))root2=SOC.dispatch(root2,c);root2=SOC.dispatch(root2,{type:'configure',id:'people',config:{people:2,entitlements:2,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:2}});root2=SOC.dispatch(root2,{type:'workforce',command:{action:'start'}});root2=SOC.dispatch(root2,{type:'workforce',command:{action:'roster',people:[person('agent-a','seat-01'),person('agent-b','seat-02')]}});root2=SOC.dispatch(root2,{type:'contact',command:{action:'start'}});root2=SOC.dispatch(root2,{type:'transport',command:{action:'start'}});
 for(const c of [
  {action:'site',id:'origin',config:{name:'Synthetic origin',region:'AU',domain:'origin-site'}},{action:'site',id:'destination',config:{name:'Synthetic service',region:'AU',domain:'service-site'}},
  {action:'link',id:'path-a',config:{from:'origin',to:'destination',mode:'owned',capacityMbps:10,latencyMs:20,domain:'failure-domain-a',leadMinutes:1,setupCents:0,periodCents:0,contract:null}},
  {action:'link',id:'path-b',config:{from:'origin',to:'destination',mode:'owned',capacityMbps:10,latencyMs:40,domain:'failure-domain-b',leadMinutes:1,setupCents:0,periodCents:0,contract:null}},
  {action:'bind',resource:'identity',site:'origin'},{action:'bind',resource:'service',site:'destination'}])root2=SOC.dispatch(root2,{type:'transport',command:c});root2=tick(root2,1);
 root2=SOC.dispatch(root2,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'continuity-case',language:'en'});root2=tick(root2,2);assert.equal(root2.interactions.at(-1).phase,'resolved');root2=tick(root2,1);root2=SOC.dispatch(root2,{type:'service-observation',command:{action:'start'}});root2=SOC.dispatch(root2,{type:'service-observation',command:{action:'open-window',goal:'rd'}});root2=SOC.dispatch(root2,{type:'service-observation',command:{action:'inject-incident'}});
 root2=tick(root2,1);assert.equal(root2.serviceObservation.active.rd.faultSamples,1);root2=SOC.dispatch(root2,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'continuity-case',language:'en'});root2=tick(root2,2);assert.equal(root2.interactions.at(-1).phase,'resolved');root2=SOC.dispatch(root2,{type:'service-observation',command:{action:'recover-incident'}});root2=SOC.dispatch(root2,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'continuity-case',language:'en'});root2=tick(root2,2);assert.equal(root2.interactions.at(-1).phase,'resolved');root2=tick(root2,1);root2=tick(root2,4);
 const proof=root2.serviceObservation.windows[0];assert.equal(proof.status,'passed');assert.equal(proof.result.checks.rdEvidence,true);assert.equal(proof.result.checks.sameTenant,true);assert.equal(proof.result.checks.independentPath,true);assert.equal(proof.result.checks.qualityBudget,true);assert.equal(O.validate(root2),true);
});

test('AC-SOC-183 open-window configuration changes and failed resources cannot be repaired into a pass',()=>{
 let s=begin(ready(),'tb');s=SOC.dispatch(s,{type:'configure',id:'phone',config:{capacity:11}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.ok(s.serviceObservation.active.errors.includes('CONFIGURATION_CHANGED'));
 s=tick(s,9);assert.equal(s.serviceObservation.windows[0].status,'failed');assert.ok(s.serviceObservation.windows[0].result.errors.includes('CONFIGURATION_CHANGED'));
});

test('AC-SOC-184 save validation rejects forged pass statuses and worker source preserves the pure module API',()=>{
 let s=begin(ready(),'tb');s=tick(s,10);const bad=structuredClone(s);bad.serviceObservation.windows[0].status='passed';bad.serviceObservation.windows[0].result.status='passed';
 assert.throws(()=>O.validate(bad),/SERVICE_OBSERVATION_PROOF_MISSING|INVALID_SERVICE_OBSERVATION_PROOF|INVALID_SERVICE_OBSERVATION_RESULT/);
 const context={};vm.createContext(context);vm.runInContext(O.source()+';globalThis.P=SOC_SERVICE_OBSERVATION;',context);
 assert.equal(context.P.PACK,O.PACK);assert.equal(context.P.validate(s),true);assert.deepEqual(JSON.parse(JSON.stringify(context.P.inspect(s))),O.inspect(s));
 const roundTrip=JSON.parse(JSON.stringify(s));assert.equal(O.validate(roundTrip),true);
});
