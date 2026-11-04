const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications.js');
const CAP=require('../src/game/31-capability-progression.js');
const SITE=require('../src/game/32-site-operations.js');
const marketFixture=require('./helpers/market-fixture');
const siteFixtures=require('./helpers/site-fixture');
const capabilityContent=require('../content/capability-progression.json');

function root(){
 let s=SOC.create({scenario:'smb',mode:'assessed'});
 for(const command of SOC.reference(s))s=SOC.dispatch(s,command);
 return s;
}
function customer(s,id){return s.portfolio.customers.find(x=>x.id===id).root;}
function dispatchCustomer(s,id,command){return SOC.dispatch(s,{type:'portfolio',command:{action:'dispatchcustomer',customerId:id,command}});}
function governmentCustomer(){
 const c=marketFixture.fixtures.find(x=>x.scenario==='government');let s=marketFixture.setup({customers:[c]});
 const sendCustomer=command=>{s=dispatchCustomer(s,c.id,command);},tick=minutes=>{s=SOC.dispatch(s,{type:'advance',minutes});},camp=(action,fields={})=>{s=SOC.dispatch(s,{type:'campaign',command:{action,...fields}});};
 sendCustomer({type:'information',command:{action:'start'}});sendCustomer({type:'information',command:{action:'configure',kind:'pipeline',config:{...SOC.information.schemas.pipeline,steps:['transcription']}}});tick(1);
 sendCustomer({type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'government-customer-record'});tick(12);
 camp('start');
 const prepared=()=>{if(s.scenario==='government'){s=SOC.dispatch(s,{type:'information',command:{action:'start'}});s=SOC.dispatch(s,{type:'information',command:{action:'configure',kind:'pipeline',config:{...SOC.information.schemas.pipeline,steps:['transcription']}}});}for(const command of SOC.reference(s))s=SOC.dispatch(s,command);if(s.scenario==='enterprise'){s=SOC.dispatch(s,{type:'migrate',identities:['bea'],target:'phone'});tick(1);}if(!s.connected){s=SOC.dispatch(s,{type:'connect',connected:true});tick(1);}};
 const journey=label=>{s=SOC.dispatch(s,{type:'interact',channel:s.scenario==='smb'?'message':'voice',from:'alex',to:'+61255500201',caseId:label});};
 const complete=()=>{prepared();camp('open-window',{kind:'baseline'});tick(1);camp('open-window',{kind:'service'});if(s.scenario==='defence')camp('inject-incident');journey('service-'+s.scenario);if(s.scenario==='enterprise'){s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'bea',to:'+61255500124',caseId:'bea-service'});s=SOC.dispatch(s,{type:'meeting'});}tick(SOC.campaign.tracks[s.scenario].windows.service);camp('open-window',{kind:'recovery'});if(s.scenario!=='defence')camp('inject-incident');tick(1);camp('recover-incident');journey('recovery-'+s.scenario);tick(7);s=SOC.dispatch(s,{type:'business',command:{action:'start'}});if(s.scenario==='defence'){s=SOC.dispatch(s,{type:'connect',connected:false});journey('qualification-defence');tick(5);s=SOC.dispatch(s,{type:'meeting'});}if(['government','defence'].includes(s.scenario))s=SOC.dispatch(s,{type:'business',command:{action:'qualify',sector:s.scenario}});if(!s.connected){s=SOC.dispatch(s,{type:'connect',connected:true});}s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'contact',quantity:1,unit:'agent',currency:'AUD',resources:['people','service'],customer:'customer',supportOwner:'orchard-msp',sell:true}});tick(2);camp('open-window',{kind:'economics'});tick(60);camp('assess');assert.ok(s.campaign.progress[s.scenario].award,JSON.stringify(SOC.calculate(s).campaign.assessment));};
 complete();for(const track of ['enterprise','government','defence']){camp('select-track',{track});complete();}camp('select-track',{track:'government'});return s;
}
function siteRoot(){
 const {act,tick,siteFixture}=siteFixtures;let s=siteFixture();
 s=SOC.dispatch(s,{type:'add',id:'spare',kind:'endpoint',config:{identity:'bea',extension:'102',number:'+61255500102'}});
 // SOC.add can create a resource after business.start; seed its customer
 // ownership and scoped configure/fault/migrate delegation in this fixture.
 s.business.ownership.spare='customer';s.business.grants.find(g=>g.id==='customer-service').resources.push('spare');
 s=act(s,'transport',{action:'bind',resource:'spare',site:'office-a'});s=tick(s);
 for(const id of ['site-a','site-b']){const config=structuredClone(s.siteOperations.sites[id].desired);config.endpointResources.push('spare');s=act(s,'site-operations',{action:'site',id,config});s=tick(s);}
 assert.ok(s.siteOperations.sites['site-a'].effective.endpointResources.includes('spare'),JSON.stringify(s.siteOperations.sites['site-a']));
 s=act(s,'site-operations',{action:'bind',resource:'spare',site:'site-a'});
 s=act(s,'site-operations',{action:'plan',id:'capability-migration',fromSite:'site-a',toSite:'site-b',resources:['spare']});s=act(s,'site-operations',{action:'cutover',id:'capability-migration'});
 s=act(s,'site-operations',{action:'exercise',id:'capability-site-failure',kind:'site-failure',sites:['site-a','site-b'],targetSite:'site-a'});s=tick(s,2);
 assert.equal(s.siteOperations.exercises.at(-1).phase,'faulted',JSON.stringify({exercise:SITE.inspect(s).exercises.at(-1),bindings:{site:s.siteOperations.bindings,transport:s.transport.bindings},interactions:s.interactions.slice(-3).map(i=>({id:i.id,from:i.from,to:i.to,direction:i.direction,phase:i.phase,outcome:i.outcome,obligations:i.obligations,destination:i.destination,admission:i.trace.find(t=>t.code==='MEDIA_TRANSPORT_ADMITTED'),trace:i.trace.map(t=>t.code)}))}));
 s=act(s,'site-operations',{action:'recover',kind:'exercise',id:'capability-site-failure'});s=act(s,'site-operations',{action:'restore',kind:'exercise',id:'capability-site-failure'});s=tick(s,2);return {s,hooks:{}};
}
function acceptancePortfolio(){
 const customers=marketFixture.fixtures.filter(x=>['cust-seattle','cust-tokyo'].includes(x.id));let s=marketFixture.setup({customers});
 const add=(id,kind,config)=>{s=SOC.dispatch(s,{type:'add',id,kind,config});};
 for(const [id,kind,config] of [['alexdesk','endpoint',{identity:'alex',extension:'101',number:'+61255500101'}],['spare','endpoint',{identity:'bea',extension:'102',number:'+61255500102'}],['admin-a','infrastructure',{}],['admin-b','infrastructure',{}],['backup-a','archive',{}],['backup-b','archive',{}],['restore-a','infrastructure',{}],['restore-b','infrastructure',{}]])add(id,kind,config);
 s=SOC.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61255500101',target:'alexdesk'},{prefix:'+61255500102',target:'spare'},{prefix:'+61255500201',target:'desk'}]}});
 s=SOC.dispatch(s,{type:'operations',command:{action:'start'}});s=SOC.dispatch(s,{type:'transport',command:{action:'start'}});
 for(const id of ['office-a','office-b','ingress'])s=SOC.dispatch(s,{type:'transport',command:{action:'site',id,config:{name:id,region:'AU',domain:id+'-failure',powerDomain:id+'-power',backupPowerDomain:null}}});
 for(const [id,from,to,domain,latencyMs] of [['between','office-a','office-b','shared-trench',1],['carrier-a','ingress','office-a','shared-trench',2],['carrier-b','ingress','office-b','shared-trench',2],['alternate-a','ingress','office-a','alternate-a-domain',10],['alternate-b','ingress','office-b','alternate-b-domain',10]])s=SOC.dispatch(s,{type:'transport',command:{action:'link',id,config:{from,to,domain,latencyMs,mode:'owned',capacityMbps:10,leadMinutes:1,setupCents:100,periodCents:0,contract:null}}});
 for(const [resource,site] of [['identity','office-a'],['alexdesk','office-a'],['spare','office-a'],['desk','office-b'],['carrier','ingress'],['service','office-b']])s=SOC.dispatch(s,{type:'transport',command:{action:'bind',resource,site}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});s=SOC.dispatch(s,{type:'site-operations',command:{action:'start'}});
 for(const suffix of ['a','b'])s=SOC.dispatch(s,{type:'site-operations',command:{action:'site',id:'site-'+suffix,config:{name:'Office '+suffix,region:'AU',transportSite:'office-'+suffix,ownership:'customer',owner:'customer',powerDomain:'office-'+suffix+'-power',failureDomain:'office-'+suffix+'-failure',sharedDomains:['shared-trench'],adminResource:'admin-'+suffix,endpointResources:suffix==='a'?['alexdesk','spare']:['desk','spare'],backupResource:'backup-'+suffix,restoreResource:'restore-'+suffix}}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});for(const [resource,site] of [['alexdesk','site-a'],['spare','site-a'],['desk','site-b']])s=SOC.dispatch(s,{type:'site-operations',command:{action:'bind',resource,site}});
 s=SOC.dispatch(s,{type:'site-operations',command:{action:'plan',id:'acceptance-migration',fromSite:'site-a',toSite:'site-b',resources:['spare']}});s=SOC.dispatch(s,{type:'site-operations',command:{action:'cutover',id:'acceptance-migration'}});
 s=SOC.dispatch(s,{type:'site-operations',command:{action:'exercise',id:'acceptance-site-failure',kind:'site-failure',sites:['site-a','site-b'],targetSite:'site-a'}});s=SOC.dispatch(s,{type:'advance',minutes:2});s=SOC.dispatch(s,{type:'site-operations',command:{action:'recover',kind:'exercise',id:'acceptance-site-failure'}});s=SOC.dispatch(s,{type:'site-operations',command:{action:'restore',kind:'exercise',id:'acceptance-site-failure'}});s=SOC.dispatch(s,{type:'advance',minutes:2});
 const send=(id,command)=>{s=dispatchCustomer(s,id,command);},tick=minutes=>{s=SOC.dispatch(s,{type:'advance',minutes});};
 for(const c of customers){send(c.id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:`acceptance-${c.id}`});send(c.id,{type:'information',command:{action:'start'}});}
 tick(1);
 for(const c of customers){const childRoot=customer(s,c.id),base=childRoot.boundaries.contracts[0],contract=structuredClone(base.desired),flow=structuredClone(contract.flows.find(x=>x.resource==='service'));contract.id=`meeting-${c.id}`;flow.id=`meeting-room-${c.id}`;flow.resource='room';delete flow.resourceGeneration;contract.flows=[flow];send(c.id,{type:'boundaries',command:{action:'contract',contract}});send(c.id,{type:'boundaries',command:{action:'bind',resource:'room',contract:contract.id}});send(c.id,{type:'boundaries',command:{action:'observe',contract:contract.id,observed:base.observed}});}
 tick(1);
 for(const c of customers){const childRoot=customer(s,c.id);send(c.id,{type:'information',command:{action:'book',start:childRoot.clock+1,end:childRoot.clock+20,attendees:2,event:false,language:'en'}});}
 tick(1);
 for(const c of customers){const booking=customer(s,c.id).information.bookings.at(-1).id;send(c.id,{type:'information',command:{action:'join',booking}});}
 tick(60);
 s=SOC.dispatch(s,{type:'campaign',command:{action:'start'}});
 const completeTrack=()=>{if(s.scenario==='government'){s=SOC.dispatch(s,{type:'information',command:{action:'start'}});s=SOC.dispatch(s,{type:'information',command:{action:'configure',kind:'pipeline',config:{...SOC.information.schemas.pipeline,steps:['transcription']}}});}for(const command of SOC.reference(s))s=SOC.dispatch(s,command);if(s.scenario==='enterprise'){s=SOC.dispatch(s,{type:'migrate',identities:['bea'],target:'phone'});tick(1);}if(!s.connected){s=SOC.dispatch(s,{type:'connect',connected:true});tick(1);}s=SOC.dispatch(s,{type:'campaign',command:{action:'open-window',kind:'baseline'}});tick(1);s=SOC.dispatch(s,{type:'campaign',command:{action:'open-window',kind:'service'}});if(s.scenario==='defence')s=SOC.dispatch(s,{type:'campaign',command:{action:'inject-incident'}});s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'acceptance-service-'+s.scenario});if(s.scenario==='enterprise'){s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'bea',to:'+61255500124',caseId:'acceptance-bea'});s=SOC.dispatch(s,{type:'meeting'});}tick(SOC.campaign.tracks[s.scenario].windows.service);const serviceWindow=s.campaign.progress[s.scenario].windows.find(w=>w.kind==='service');if(serviceWindow?.status!=='passed')throw new Error(`service window failed ${s.scenario}: ${JSON.stringify(serviceWindow?.errors)}`);s=SOC.dispatch(s,{type:'campaign',command:{action:'open-window',kind:'recovery'}});if(s.scenario!=='defence')s=SOC.dispatch(s,{type:'campaign',command:{action:'inject-incident'}});tick(1);s=SOC.dispatch(s,{type:'campaign',command:{action:'recover-incident'}});s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'acceptance-recovery-'+s.scenario});tick(7);if(!s.business)s=SOC.dispatch(s,{type:'business',command:{action:'start'}});if(s.scenario==='defence'){s=SOC.dispatch(s,{type:'connect',connected:false});s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'qualification-defence'});tick(5);s=SOC.dispatch(s,{type:'meeting'});}if(['government','defence'].includes(s.scenario))s=SOC.dispatch(s,{type:'business',command:{action:'qualify',sector:s.scenario}});if(!s.connected)s=SOC.dispatch(s,{type:'connect',connected:true});s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'contact',quantity:1,unit:'agent',currency:'AUD',resources:['people','service'],customer:'customer',supportOwner:'orchard-msp',sell:true}});tick(2);s=SOC.dispatch(s,{type:'campaign',command:{action:'open-window',kind:'economics'}});tick(60);s=SOC.dispatch(s,{type:'campaign',command:{action:'assess'}});assert.ok(s.campaign.progress[s.scenario].award,`${s.scenario}: ${JSON.stringify(SOC.calculate(s).campaign.assessment)}`);};
 completeTrack();for(const track of ['enterprise','government','defence']){s=SOC.dispatch(s,{type:'campaign',command:{action:'select-track',track}});completeTrack();}for(const c of customers){const contracts=customer(s,c.id).business.contracts.filter(x=>x.status==='renewal');for(const contract of contracts)send(c.id,{type:'business',command:{action:'renew',contract:contract.id}});}tick(1);s=SOC.dispatch(s,{type:'campaign',command:{action:'select-track',track:'smb'}});return s;
}

test('AC-SOC-334 capability overlay declares only the assigned progression rows and preserves partial scope',()=>{
 assert.equal(CAP.PACK,'soc-capability-progression-1');
 assert.deepEqual(CAP.levelIds,[3,4,5,6,8,9,10,11,12].map(x=>`progress.progression-level.${x}`));
 assert.deepEqual(CAP.goalIds,['progress.goal.gi']);
 assert.deepEqual(CAP.implementedLevels,CAP.levelIds);
 assert.deepEqual(CAP.implementedGoals,CAP.goalIds);
 assert.deepEqual(CAP.sourceIds,capabilityContent.runtime.sourceIds);
 for(const key of ['PACK','VERSION','CONTENT','levelIds','goalIds','implementedLevels','implementedGoals','sourceIds'])assert.deepEqual(capabilityContent.runtime[key],CAP[key],`runtime ${key}`);
 assert.equal(CAP.sourceIds.length,32);
 assert.deepEqual(capabilityContent.sourceIds,CAP.sourceIds);
 assert.deepEqual(capabilityContent.implementedSourceIds,[...CAP.implementedLevels,...CAP.implementedGoals]);
 assert.equal(capabilityContent.mechanics.length,10);
});

test('AC-SOC-335 real reference roots do not unlock capabilities from names, defaults, or incomplete configuration',()=>{
 const s=root(),before=JSON.stringify(s),result=CAP.calculate(s);
 for(const id of CAP.levelIds)assert.equal(result.levels[id].status,'incomplete',id);
 assert.equal(result.goals['progress.goal.gi'].status,'incomplete');
 assert.ok(result.pendingBoundaries.includes('DDoS, SIP and destination-spend defence'));
 assert.equal(JSON.stringify(s),before);
 assert.equal(CAP.validate(s),true);
});

test('AC-SOC-336 stale or missing typed source records cannot support a derived capability',()=>{
 const s=root();assert.equal(CAP.calculate(s).levels['progress.progression-level.3'].status,'incomplete');
 const bad=structuredClone(s);bad.clock=-1;assert.throws(()=>CAP.calculate(bad),/INVALID_CAPABILITY_PROGRESSION_ROOT/);
 const forged=structuredClone(s);forged.products={pack:'soc-products-1',version:1,nextId:1,offers:[],deployments:[],integrations:[{id:'listed-integration',source:'missing-a',target:'missing-b',features:[],result:{status:'scenario-verified',synthetic:true,externalSupportClaim:false,reasons:[],checks:[]}}],events:[]};
 assert.throws(()=>CAP.calculate(forged),/INVALID_PRODUCT/);
});

test('AC-SOC-337 inspection, fingerprint, restore shape, and worker source remain pure and deterministic',()=>{
 const s=root(),before=JSON.stringify(s),report=CAP.inspect(s),fingerprint=CAP.fingerprint(s);
 assert.deepEqual(CAP.inspect(SOC.restore(before)),report);
 assert.equal(CAP.fingerprint(SOC.restore(before)),fingerprint);
 assert.equal(JSON.stringify(s),before);
 const context={};vm.createContext(context);vm.runInContext(CAP.source()+';globalThis.capabilityPack=SOC_CAPABILITY_PROGRESSION;',context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.capabilityPack.calculate(s))),report);
});

test('AC-SOC-338 trusted hooks can narrow eligibility but cannot fill missing local evidence',()=>{
 const s=root(),hooks={validateRoot:()=>true,integrationStatus:()=>({status:'scenario-verified'}),boundaryAssessment:()=>({eligible:true})};
 assert.equal(CAP.calculate(s,hooks).levels['progress.progression-level.3'].status,'incomplete');
 assert.equal(CAP.calculate(s,hooks).levels['progress.progression-level.6'].status,'incomplete');
});

test('AC-SOC-339 wholesaler and delegated administration levels require real multi-tenant contracts and ledgers',()=>{
 const customers=marketFixture.fixtures.slice(0,2);
 let s=marketFixture.setup({customers,viaCustomers:customers.map(x=>x.id)});
 assert.equal(CAP.calculate(s).levels['progress.progression-level.10'].status,'incomplete','unbilled contract is not wholesale operation');
 s=marketFixture.dispatch(s,{type:'advance',minutes:60});
 let report=CAP.calculate(s);
 assert.equal(report.levels['progress.progression-level.10'].status,'ready');
 const earnedEvidence=report.levels['progress.progression-level.10'].evidence;
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.10',earnedEvidence),true);
 let closed=SOC.dispatch(s,{type:'portfolio',command:{action:'dispatchcustomer',customerId:customers[0].id,command:{type:'business',command:{action:'cancel',contract:earnedEvidence.customers.find(x=>x.id===customers[0].id).contractIds[0].id}}}});
 closed=SOC.dispatch(closed,{type:'portfolio',command:{action:'dispatchcustomer',customerId:customers[0].id,command:{type:'business',command:{action:'revoke',grant:earnedEvidence.customers.find(x=>x.id===customers[0].id).authority[0].id}}}});
 assert.equal(CAP.validateEvidence(closed,'progress.progression-level.10',earnedEvidence,{archived:true}),true,'closing a contract and revoking a once-valid grant do not erase earned historical evidence');
 const stale=structuredClone(s);stale.portfolio.customers[0].root.business.ledger=[];
 assert.equal(CAP.calculate(stale).levels['progress.progression-level.10'].status,'incomplete');
 assert.equal(CAP.validateEvidence(stale,'progress.progression-level.10',earnedEvidence),false);
 assert.equal(CAP.validateEvidence(stale,'progress.progression-level.10',earnedEvidence,{archived:true}),false,'deleted revenue receipts cannot verify historical award evidence');
 const forgedEvidence=structuredClone(earnedEvidence);forgedEvidence.customers[0].billing=[];
 assert.equal(CAP.validateEvidence(stale,'progress.progression-level.10',forgedEvidence,{archived:true}),false);
 const aged=structuredClone(s),agedCustomer=aged.portfolio.customers.find(x=>x.id===customers[0].id),agedProof=earnedEvidence.customers.find(x=>x.id===customers[0].id).billing[0];
 const agedBilling=earnedEvidence.customers.find(x=>x.id===customers[0].id).billing,oldSerials=agedBilling.map(x=>Number(/^entry-(\d+)$/.exec(x.id)[1])),firstRetained=Math.max(...oldSerials)+500;agedCustomer.root.business.ledger=Array.from({length:1000},(_,i)=>({...agedProof,id:`entry-${firstRetained+i}`,period:agedProof.period,at:agedCustomer.root.clock}));
 assert.equal(CAP.validateEvidence(aged,'progress.progression-level.10',earnedEvidence,{archived:true}),true,'a retained contract and a full ledger with only later entry IDs can preserve an aged receipt');
 const recentMissing=structuredClone(earnedEvidence),ledgerIds=agedCustomer.root.business.ledger.map(x=>Number(/^entry-(\d+)$/.exec(x.id)[1]));recentMissing.customers.find(x=>x.id===customers[0].id).billing[0].id=`entry-${Math.max(...ledgerIds)+5}`;
 assert.equal(CAP.validateEvidence(aged,'progress.progression-level.10',recentMissing,{archived:true}),false,'a missing recent receipt is not treated as aged out');
 const forged=structuredClone(s),c=forged.portfolio.customers[0],receipt=c.root.business.ledger.find(x=>x.category==='revenue'&&x.contract);
 c.root.business.ledger=c.root.business.ledger.filter(x=>x.id!==receipt.id);
 assert.equal(CAP.calculate(forged).levels['progress.progression-level.10'].status,'incomplete');
 const expired=structuredClone(s);for(const customer of expired.portfolio.customers){for(const grant of customer.root.business.grants)grant.expires=customer.root.clock;}
 assert.equal(CAP.calculate(expired).levels['progress.progression-level.10'].status,'incomplete','expired grants cannot authorize wholesaler operations');
 const outOfScope=structuredClone(s);for(const customer of outOfScope.portfolio.customers){for(const grant of customer.root.business.grants)grant.resources=[];}
 assert.equal(CAP.calculate(outOfScope).levels['progress.progression-level.10'].status,'incomplete','grant must cover the active contract resource');
});

test('AC-SOC-340 national provider evidence needs separately scoped billed tenants, wholesale cost and resolved voice cases',()=>{
 const customers=marketFixture.fixtures.slice(0,2);
 let s=marketFixture.setup({customers});
 for(const c of customers)s=marketFixture.dispatchCustomer(s,c.id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:`wholesale-call-${c.id}`});
 s=marketFixture.dispatch(s,{type:'advance',minutes:60});
 let evidence=CAP.calculate(s).levels['progress.progression-level.5'];
 assert.equal(evidence.status,'ready');assert.equal(new Set(evidence.evidence.customers.map(x=>x.tenant)).size,2);
 const forged=structuredClone(s),child=forged.portfolio.customers[0].root,contract=child.business.contracts.find(x=>x.status==='active');
 child.business.ledger=child.business.ledger.filter(x=>!(x.contract===contract.id&&x.category==='cost'&&x.reason==='wholesale'));
 assert.equal(CAP.calculate(forged).levels['progress.progression-level.5'].status,'incomplete');
 const archived=structuredClone(evidence.evidence),firstCall=archived.customers[0].callProofs[0];
 for(let i=0;i<205;i++){s=marketFixture.dispatchCustomer(s,customers[0].id,{type:'interact',channel:'message',from:'alex',to:'workforce',caseId:`pruned-case-${i}`});s=marketFixture.dispatch(s,{type:'advance',minutes:4});}
 const aged=marketFixture.child(s,customers[0].id);assert.equal(aged.interactions.some(x=>x.id===firstCall.id),false);assert.ok(aged.tracePrunedThrough>=Number(firstCall.id.split('-')[1]));
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.5',archived,{archived:true}),true,'typed resolved-call proof survives only an actual core trace eviction watermark');
 const forgedWatermark=structuredClone(s);forgedWatermark.portfolio.customers.find(x=>x.id===customers[0].id).root.tracePrunedThrough=0;
 assert.equal(CAP.validateEvidence(forgedWatermark,'progress.progression-level.5',archived,{archived:true}),false,'a missing recent call cannot be excused by a deleted or lowered watermark');
 let closed=s;for(const c of customers){const live=customer(closed,c.id).business.contracts.find(x=>x.status==='active');if(live)closed=dispatchCustomer(closed,c.id,{type:'business',command:{action:'cancel',contract:live.id}});}assert.equal(CAP.validateEvidence(closed,'progress.progression-level.5',evidence.evidence,{archived:true}),true,'later cancellation preserves retained billed wholesale evidence');
});

test('AC-SOC-341 UC and contact centre integration level needs tested supported deployments, resolved human work and a joined meeting',()=>{
 const c=marketFixture.fixtures[2];let s=marketFixture.setup({customers:[c],productsFor:[c.id]});
 s=dispatchCustomer(s,c.id,{type:'configure',id:'room',config:{calendar:true}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=dispatchCustomer(s,c.id,{type:'business',command:{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone','carrier'],customer:'customer',supportOwner:'orchard-msp',price:5000,sell:true}});
 s=dispatchCustomer(s,c.id,{type:'business',command:{action:'order',offer:'rooms',quantity:1,unit:'room',currency:'AUD',resources:['room'],customer:'customer',supportOwner:'orchard-msp',price:5000,sell:true}});
 s=SOC.dispatch(s,{type:'advance',minutes:60});
 s=dispatchCustomer(s,c.id,{type:'outcomes',command:{action:'start'}});
 s=dispatchCustomer(s,c.id,{type:'outcomes',command:{action:'configure',config:{supportedIntents:['appointment-change'],taskIntegrations:[{intent:'appointment-change',integration:'cases',evidence:['slot-updated','notice-sent']}],handoffDestination:'service-desk',maxAttempts:2,repeatInterval:2,repeatEffort:2,contextLossEffort:3,maxRepeatEmissionsPerAdvance:1}}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=dispatchCustomer(s,c.id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'integrator-case'});
 const need=dispatchCustomer(s,c.id,{type:'outcomes',command:{action:'need',tenant:c.tenant,person:'alex',caseId:'integrator-case',purpose:'Change an appointment',intent:'appointment-change',permittedChannels:['voice']}});
 s=dispatchCustomer(need,c.id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'integrator-case',needId:'need-1'});
 const active=customer(s,c.id).interactions.find(i=>i.needId==='need-1');
 s=dispatchCustomer(s,c.id,{type:'outcomes',command:{action:'task-result',needId:'need-1',interactionId:active.id,intent:'appointment-change',integration:'cases',succeeded:true,botAnswered:false,evidence:['slot-updated','notice-sent']}});
 s=SOC.dispatch(s,{type:'advance',minutes:8});
 s=dispatchCustomer(s,c.id,{type:'information',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.equal(customer(s,c.id).resources.room.effective.calendar,true,JSON.stringify(customer(s,c.id).resources.room));
 assert.equal(customer(s,c.id).information.meeting.effective.calendarAuthorised,true,JSON.stringify(customer(s,c.id).information.meeting));
 s=dispatchCustomer(s,c.id,{type:'information',command:{action:'book',start:customer(s,c.id).clock+1,end:customer(s,c.id).clock+20,attendees:2,event:false,language:'en'}});
 s=SOC.dispatch(s,{type:'advance',minutes:1});
 const booking=customer(s,c.id).information.bookings.at(-1).id;
 s=dispatchCustomer(s,c.id,{type:'information',command:{action:'join',booking}});
 // The shared progression bridge requires both integration directions to be
 // bound to live, provisioned core resources, not merely feature-tested.
 s=dispatchCustomer(s,c.id,{type:'products',command:{action:'configure',id:'suite-deployment',config:{bindings:[{feature:'multitenant-calling',resources:['phone']}]}}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=dispatchCustomer(s,c.id,{type:'products',command:{action:'rebase-integration',id:'suite-to-phone'}});s=dispatchCustomer(s,c.id,{type:'products',command:{action:'test-integration',id:'suite-to-phone'}});
 const hooks={integrationStatus:(r,id)=>SOC.products.compatibilityStatus(r,id)};
 const report=CAP.calculate(s,hooks).levels['progress.progression-level.3'];
 assert.equal(report.status,'ready',JSON.stringify({root:customer(s,c.id).outcomes,interactions:customer(s,c.id).interactions.map(i=>({id:i.id,phase:i.phase,needOutcome:i.needOutcome})),meeting:customer(s,c.id).information.bookings,deployments:customer(s,c.id).products.deployments.map(d=>({id:d.id,generation:d.generation,bindings:d.effective?.bindings})),integrations:customer(s,c.id).products.integrations.map(i=>({id:i.id,result:i.result}))}));
 assert.equal(report.evidence.integrations.length>0,true);
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.3',report.evidence,{hooks}),true,JSON.stringify(report.evidence));
 const unknownIntegration=structuredClone(report.evidence);unknownIntegration.integrations[0].id='invented-integration';
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.3',unknownIntegration,{archived:true,hooks}),false,'archive validation binds the proof to a retained tested integration and support contract');
 const archived=structuredClone(report.evidence);s=dispatchCustomer(s,c.id,{type:'products',command:{action:'configure',id:'suite-deployment',config:{productVersion:'scenario-2'}}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.equal(CAP.calculate(s,hooks).levels['progress.progression-level.3'].status,'incomplete','new generation changes current assessment');
 s=dispatchCustomer(s,c.id,{type:'products',command:{action:'rebase-integration',id:'suite-to-phone'}});s=dispatchCustomer(s,c.id,{type:'products',command:{action:'test-integration',id:'suite-to-phone'}});
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.3',archived,{archived:true,hooks}),true,'the retained prior integration result remains verifiable after a valid reconfigure and rebase');
 s=SOC.dispatch(s,{type:'campaign',command:{action:'start'}});s=SOC.dispatch(s,{type:'progression',command:{action:'start'}});
 assert.equal(SOC.calculate(s).progression.levels['progress.progression-level.3'].status,'ready',JSON.stringify({direct:CAP.calculate(s).levels['progress.progression-level.3'],progression:SOC.calculate(s).progression.levels['progress.progression-level.3'],products:customer(s,c.id).products.integrations,services:SOC.calculate(customer(s,c.id)).services,resource:customer(s,c.id).resources.phone}));
 s=SOC.dispatch(s,{type:'progression',command:{action:'claim-level',level:'progress.progression-level.3'}});
 assert.equal(s.progression.levels['progress.progression-level.3'].status,'earned');
 assert.equal(SOC.validateState(s),s,'the 41 bridge validates the actual retained integration, customer work, and guest meeting evidence');
});

test('AC-SOC-342 omnichannel capability needs two human-resolved channel journeys on one canonical case',()=>{
 let s=root();s=SOC.dispatch(s,{type:'outcomes',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'outcomes',command:{action:'configure',config:{supportedIntents:['appointment-change'],taskIntegrations:[{intent:'appointment-change',integration:'cases',evidence:['slot-updated']}],handoffDestination:'service-desk',maxAttempts:2,repeatInterval:2,repeatEffort:1,contextLossEffort:2,maxRepeatEmissionsPerAdvance:1}}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'same-customer-case'});
 const tenant=s.interactions.at(-1).tenant;
 for(const channel of ['voice','message'])s=SOC.dispatch(s,{type:'outcomes',command:{action:'need',tenant,person:'alex',caseId:'same-customer-case',purpose:'Change an appointment',intent:'appointment-change',permittedChannels:[channel]}});
 for(const [channel,index] of [['voice',1],['message',2]]){const id=`need-${index}`;s=SOC.dispatch(s,{type:'interact',channel,from:'alex',to:channel==='voice'?'+61255500201':'service',caseId:'same-customer-case',needId:id});const interaction=s.interactions.find(x=>x.needId===id);s=SOC.dispatch(s,{type:'outcomes',command:{action:'task-result',needId:id,interactionId:interaction.id,intent:'appointment-change',integration:'cases',succeeded:true,botAnswered:false,evidence:['slot-updated']}});}
 for(let n=0;n<20&&s.outcomes.needs.some(x=>x.status!=='resolved');n++)s=SOC.dispatch(s,{type:'advance',minutes:1});
 const report=CAP.calculate(s).levels['progress.progression-level.8'];assert.equal(report.status,'ready',JSON.stringify(s.outcomes));
 assert.equal(report.evidence.tenant,tenant);assert.equal(report.evidence.caseId,'same-customer-case');assert.equal(new Set(report.evidence.attempts).size,2);
});

test('AC-SOC-343 government capability needs the assessed government track, eligible boundary, processed in-region record and case',()=>{
 const s=governmentCustomer(),gov=s;
 assert.ok(gov.campaign.progress.government.award,JSON.stringify(gov.campaign.progress.government));
 assert.ok(gov.information.jobs.some(j=>j.status==='complete'));
 const hooks={boundaryAssessment:(r,id)=>marketFixture.hooks.boundaryAssessment(r,id)};
 const report=CAP.calculate(s,hooks).levels['progress.progression-level.6'];assert.equal(report.status,'ready',JSON.stringify({boundary:SOC.calculate(gov).boundaries,information:gov.information.jobs,records:gov.records.map(r=>({id:r.id,region:r.region,deleted:r.deleted}))}));
 assert.ok(report.evidence.processedRecords.every(id=>gov.records.some(r=>r.id===id&&!r.deleted&&r.region===gov.jurisdiction)));
 assert.equal(CAP.calculate(s,{boundaryAssessment:()=>({eligible:false})}).levels['progress.progression-level.6'].status,'incomplete');
});

test('AC-SOC-344 major acceptance needs all four awarded tracks plus billed enterprise and public customers and real site recovery',()=>{
 let s=acceptancePortfolio();const hooks={siteHooks:siteFixtures.hooks};
 const report=CAP.calculate(s,hooks).goals['progress.goal.gi'];
 assert.equal(report.status,'ready',JSON.stringify({tracks:Object.fromEntries(Object.entries(s.campaign.progress).map(([k,v])=>[k,!!v.award])),snapshots:Object.fromEntries(Object.entries(s.campaign.snapshots).map(([k,v])=>[k,{site:!!v.root.siteOperations,exercises:v.root.siteOperations?.exercises?.map(x=>[x.id,x.status,x.phase]),migrations:v.root.siteOperations?.migrations?.map(x=>[x.id,x.phase])}])),customers:s.portfolio.customers.map(c=>({id:c.id,scenario:c.scenario,activeContracts:c.root.business.contracts.filter(x=>x.status==='active').length,resolvedCases:c.root.interactions.filter(x=>x.phase==='resolved').length,joinedMeetings:c.root.information.bookings.filter(x=>x.lastJoin?.success).length})),report}));
 assert.equal(report.evidence.tracks.length,4);assert.equal(report.evidence.customers.length,2);
 assert.equal(CAP.validateEvidence(s,'progress.goal.gi',report.evidence,{hooks}),true);
 s=SOC.dispatch(s,{type:'progression',command:{action:'start'}});assert.equal(SOC.calculate(s).progression.goals['progress.goal.gi'].status,'ready');s=SOC.dispatch(s,{type:'progression',command:{action:'claim-goal',goal:'progress.goal.gi'}});assert.equal(s.progression.goals['progress.goal.gi'].status,'earned');for(const c of s.portfolio.customers){const live=c.root.business.contracts.find(x=>x.status==='active');if(live)s=dispatchCustomer(s,c.id,{type:'business',command:{action:'cancel',contract:live.id}});}assert.equal(CAP.calculate(s,hooks).goals['progress.goal.gi'].status,'incomplete','cancelled contracts are no longer current readiness');s=SOC.restore(JSON.stringify(s));assert.equal(SOC.validateState(s),s);assert.equal(s.progression.goals['progress.goal.gi'].status,'earned','the historic award survives cancellation and normal save/restore');
 const omittedTrack=structuredClone(s);delete omittedTrack.campaign.snapshots.defence;assert.equal(CAP.calculate(omittedTrack,hooks).goals['progress.goal.gi'].status,'incomplete','an award without its retained track evidence root does not qualify');
});

test('AC-SOC-345 enterprise service level accepts completed site migration plus fault, continuity and restore receipts',()=>{
 const {s,hooks}=siteRoot();try{SITE.validate(s);}catch(e){throw new Error(`${e.message}: ${JSON.stringify(s.siteOperations.exercises[0])}`);}
 const report=CAP.calculate(s,{siteHooks:hooks});assert.equal(report.levels['progress.progression-level.4'].status,'ready',JSON.stringify(SITE.inspect(s,hooks)));
 const proof=report.levels['progress.progression-level.4'].evidence;assert.equal(proof.exercise.kind,'site-failure');assert.equal(proof.migration.phase,'complete');
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.4',proof,{archived:true,hooks:{siteHooks:hooks}}),true,'typed archive schema');
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.4',proof,{hooks:{siteHooks:hooks}}),true,JSON.stringify(proof));
 const stale=SOC.dispatch(structuredClone(s),{type:'site-operations',command:{action:'site',id:'site-b',config:{...s.siteOperations.sites['site-b'].desired,name:'Replacement site'}}});const staleAfter=SOC.dispatch(stale,{type:'advance',minutes:1});
 assert.equal(CAP.validateEvidence(staleAfter,'progress.progression-level.4',proof),false);
 assert.equal(CAP.validateEvidence(staleAfter,'progress.progression-level.4',proof,{archived:true,hooks:{siteHooks:hooks}}),true);
 const uncontrolled=structuredClone(s);uncontrolled.siteOperations.exercises[0].completion.ownershipControlled=false;
 assert.equal(CAP.calculate(uncontrolled).levels['progress.progression-level.4'].status,'incomplete','a completed journey without proved control is not enterprise operation');
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.4',{...proof,exercise:{...proof.exercise,completion:{...proof.exercise.completion,backup:false}}},{archived:true}),false,'archived evidence must preserve successful custody checks');
});

test('AC-SOC-346 critical-service level requires a retained processed record with an actual authorised read',()=>{
 let {s}=siteRoot();s.scenario='government';s=SOC.dispatch(s,{type:'information',command:{action:'start'}});s=SOC.dispatch(s,{type:'information',command:{action:'configure',kind:'pipeline',config:{...SOC.information.schemas.pipeline,steps:['transcription']}}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'critical-record-case'});s=SOC.dispatch(s,{type:'advance',minutes:10});
 const job=s.information.jobs.find(x=>x.status==='complete'),record=s.records.find(x=>x.id===job?.parent);assert.ok(record,JSON.stringify({jobs:s.information.jobs,interaction:s.interactions.at(-1),info:s.information}));
 s=SOC.dispatch(s,{type:'information',command:{action:'read',record:record.id,role:'supervisor',region:record.region}});
 const result=CAP.calculate(s).levels['progress.progression-level.12'];assert.equal(result.status,'ready',JSON.stringify({job,record,site:SITE.inspect(s).exercises}));
 const forged=structuredClone(s);forged.information.audit=[];assert.equal(CAP.calculate(forged).levels['progress.progression-level.12'].status,'incomplete');
 const archived=result.evidence;const deleted=structuredClone(s);deleted.records.find(x=>x.id===archived.processedRecords[0]).deleted=true;assert.equal(CAP.validateEvidence(deleted,'progress.progression-level.12',archived,{archived:true}),true,'deleted data does not erase the retained historical custody receipt');const falsified=structuredClone(archived);falsified.informationCustody.auditId+=1;assert.equal(CAP.validateEvidence(s,'progress.progression-level.12',falsified,{archived:true}),false,'custody proof remains tied to its exact audit event');
});

test('AC-SOC-347 multi-region level requires four effective deployment modes with live directional integrations and scoped evidence',()=>{
 const customers=marketFixture.fixtures,ids=customers.map(x=>x.id);let s=marketFixture.setup({customers});
 const profile=(customerId,{id,family,feature,dependencyRefs,mode,bindings,evidenceType})=>{
  const send=command=>{s=dispatchCustomer(s,customerId,{type:'products',command});};
  send({action:'start'});send({action:'offer',offer:{id:'suite-offer',family:'cisco:suite-calling',edition:'scenario',unit:'seat',quantity:4,features:['pstn-supply'],dependencies:{carrier:'carrier'}}});s=SOC.dispatch(s,{type:'advance',minutes:1});
  send({action:'deploy',id:'suite-deployment',offer:'suite-offer',productVersion:'scenario-1',mode:'multitenant',region:customer(s,customerId).jurisdiction,bindings:[{feature:'pstn-supply',resources:['carrier']}]});s=SOC.dispatch(s,{type:'advance',minutes:1});
  send({action:'offer',offer:{id:`offer-${id}`,family,edition:'scenario',unit:'seat',quantity:4,features:[feature],dependencies:dependencyRefs}});s=SOC.dispatch(s,{type:'advance',minutes:1});
  send({action:'deploy',id,offer:`offer-${id}`,productVersion:'scenario-1',mode,region:customer(s,customerId).jurisdiction,features:[feature],dependencies:dependencyRefs,bindings:[{feature,resources:bindings}]});
  if(evidenceType){s=dispatchCustomer(s,customerId,{type:'product-evidence',command:{action:'start'}});s=dispatchCustomer(s,customerId,{type:'product-evidence',command:{action:'request',id:`evidence-${id}`,deploymentId:id,feature,dependency:evidenceType,resourceId:dependencyRefs[evidenceType]}});}
  s=SOC.dispatch(s,{type:'advance',minutes:1});
  send({action:'integration',id:`link-${id}`,source:'suite-deployment',target:id,features:[{sourceFeature:'pstn-supply',targetFeature:feature}]});send({action:'test-integration',id:`link-${id}`});
 };
 const attempt=(id,config)=>{try{profile(id,config);}catch(e){throw new Error(`${config.id}: ${e.message}`);}};
 attempt('cust-sydney',{id:'profile-commercial',family:'microsoft:government-clouds',feature:'regional-evidence',dependencyRefs:{'jurisdiction-evidence':'phone'},mode:'commercial',bindings:['phone'],evidenceType:'jurisdiction-evidence'});
 attempt('cust-melbourne',{id:'profile-private',family:'cisco:contact-center',feature:'quality-review',dependencyRefs:{identity:'identity',recording:'recorder'},mode:'premises',bindings:['recorder']});
 attempt('cust-tokyo',{id:'profile-sovereign',family:'microsoft:government-clouds',feature:'eligibility-evidence',dependencyRefs:{'eligibility-evidence':'phone'},mode:'gcc-high',bindings:['phone'],evidenceType:'eligibility-evidence'});
 attempt('cust-dublin',{id:'profile-local',family:'microsoft:local',feature:'licensing-connectivity',dependencyRefs:{'licensing-service':'local'},mode:'customer-operated-local',bindings:['local']});
 const hooks={integrationStatus:(r,id)=>{const status=SOC.products.compatibilityStatus(r,id);if(status.status!=='scenario-verified')return status;const edge=r.products.integrations.find(x=>x.id===id);for(const [deploymentId,key] of [[edge.source,'sourceFeature'],[edge.target,'targetFeature']]){const d=r.products.deployments.find(x=>x.id===deploymentId),feature=edge.features[0][key],binding=d.effective?.bindings.find(x=>x.feature===feature);if(!binding||binding.resources.some(resource=>SOC.calculate(r).services[resource]?.ready!==true))return {status:'unavailable'};}return status;},productBindingAvailable:(r,deploymentId,feature,resource)=>{const calc=SOC.calculate(r),proof=calc.productEvidence?.requests.find(x=>x.desired.deploymentId===deploymentId&&x.desired.feature===feature&&x.desired.resourceId===resource);return proof?proof.availability.ready===true:calc.services[resource]?.ready===true;}};
 const report=CAP.calculate(s,hooks).levels['progress.progression-level.9'];assert.equal(report.status,'ready',JSON.stringify(Object.fromEntries(ids.map(id=>[id,customer(s,id).products?.deployments.map(d=>({id:d.id,mode:d.effective?.mode,status:d.provisioning.status,errors:d.provisioning.errors}))]))));const proof=report.evidence;
 assert.deepEqual(new Set(Object.values(report.evidence.profiles).map(x=>x.mode)).size,4);
 s=dispatchCustomer(s,'cust-dublin',{type:'products',command:{action:'configure',id:'profile-local',config:{productVersion:'scenario-2'}}});s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.equal(CAP.calculate(s,hooks).levels['progress.progression-level.9'].status,'incomplete','a configured profile with a stale test is not current');
 s=dispatchCustomer(s,'cust-dublin',{type:'products',command:{action:'rebase-integration',id:'link-profile-local'}});s=dispatchCustomer(s,'cust-dublin',{type:'products',command:{action:'test-integration',id:'link-profile-local'}});
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.9',proof,{archived:true,hooks}),true,'the product integration history preserves the original profile award proof');
 let blocked=SOC.dispatch(structuredClone(s),{type:'portfolio',command:{action:'dispatchcustomer',customerId:'cust-tokyo',command:{type:'product-evidence',command:{action:'revoke',id:'evidence-profile-sovereign',reason:'evidence-withdrawn'}}}});
 assert.equal(CAP.calculate(blocked,hooks).levels['progress.progression-level.9'].status,'incomplete','a revoked eligibility proof removes the sovereign deployment from current readiness');
});

test('AC-SOC-348 AI operator level combines sustained measured workload, human task resolution and effective assistance processing',()=>{
 let s=SOC.create({scenario:'smb',mode:'sandbox'});s=SOC.dispatch(s,{type:'campaign',command:{action:'start'}});s=SOC.dispatch(s,{type:'campaign',command:{action:'select-track',track:'enterprise'}});for(const c of SOC.reference(s))s=SOC.dispatch(s,c);const tick=n=>{for(let i=0;i<n;i++)s=SOC.dispatch(s,{type:'advance',minutes:1});};
 s=SOC.dispatch(s,{type:'configure',id:'people',config:{people:4,entitlements:4,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:1}});s=SOC.dispatch(s,{type:'workforce',command:{action:'start'}});
 const roster=['agent-a','agent-b','agent-c','agent-d'].map((id,i)=>({id,employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:1,entitlements:[`seat-0${i+1}`]}));s=SOC.dispatch(s,{type:'workforce',command:{action:'roster',people:roster}});
 s=SOC.dispatch(s,{type:'contact',command:{action:'start'}});s=SOC.dispatch(s,{type:'information',command:{action:'start'}});s=SOC.dispatch(s,{type:'information',command:{action:'configure',kind:'pipeline',config:{...SOC.information.schemas.pipeline,steps:['transcription']}}});s=SOC.dispatch(s,{type:'outcomes',command:{action:'start'}});s=SOC.dispatch(s,{type:'outcomes',command:{action:'configure',config:{supportedIntents:['appointment-change'],taskIntegrations:[{intent:'appointment-change',integration:'cases',evidence:['slot-updated','notice-sent']}],handoffDestination:'service',maxAttempts:2,repeatInterval:2,repeatEffort:1,contextLossEffort:2,maxRepeatEmissionsPerAdvance:1}}});tick(1);s=SOC.dispatch(s,{type:'service-observation',command:{action:'start'}});s=SOC.dispatch(s,{type:'service-observation',command:{action:'open-window',goal:'t10'}});
 const scheduleMeeting=()=>{s=SOC.dispatch(s,{type:'information',command:{action:'book',start:s.clock,end:s.clock+1,attendees:2,event:false,language:'en'}});s=SOC.dispatch(s,{type:'information',command:{action:'schedule',booking:s.information.bookings.at(-1).id}});};
 for(let n=0;n<15;n++){for(let j=0;j<2;j++)s=SOC.dispatch(s,{type:'interact',channel:'voice',from:j?'bea':'alex',to:'+61255500201',caseId:`ai-voice-${n}-${j}`,language:'en',durationMinutes:1});for(let j=0;j<2;j++)s=SOC.dispatch(s,{type:'interact',channel:'message',from:j?'bea':'alex',to:'service',caseId:`ai-digital-${n}-${j}`,language:'en'});if(n===2||n===7)scheduleMeeting();tick(1);}
 tick(1);
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'assisted-human-case'});const canonical=s.interactions.at(-1);const needResult=s=SOC.dispatch(s,{type:'outcomes',command:{action:'need',tenant:canonical.tenant,person:'alex',caseId:'assisted-human-case',purpose:'Change appointment',intent:'appointment-change',permittedChannels:['voice']}});
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'assisted-human-case',needId:needResult.outcomes.needs.at(-1).id});const call=s.interactions.at(-1);
 s=SOC.dispatch(s,{type:'outcomes',command:{action:'task-result',needId:needResult.outcomes.needs.at(-1).id,interactionId:call.id,intent:'appointment-change',integration:'cases',succeeded:true,botAnswered:false,evidence:['slot-updated','notice-sent']}});tick(8);
 s=SOC.dispatch(s,{type:'products',command:{action:'start'}});s=SOC.dispatch(s,{type:'products',command:{action:'offer',offer:{id:'ai-offer',family:'cisco:contact-center',edition:'fictional',unit:'agent-seat',quantity:4,features:['ai-assistance'],dependencies:{identity:'identity',processing:'speech'}}}});tick(1);
 s=SOC.dispatch(s,{type:'products',command:{action:'deploy',id:'ai-deployment',offer:'ai-offer',productVersion:'scenario-1',mode:'multitenant',region:s.jurisdiction,bindings:[{feature:'ai-assistance',resources:['speech']}]}});tick(1);
 const productHooks={observeDependency:(r,kind,resource)=>{const result=SOC.observe(r,resource);return {ready:result.ready,generation:r.resources[resource]?.generation,reason:result.reasons[0]||null};},validateBinding:(r,d,b)=>b.resources.length>0&&b.resources.every(resource=>SOC.observe(r,resource).ready)};
 const productBindingAvailable=(r,deployment,feature,resource)=>{const d=r.products?.deployments.find(x=>x.id===deployment);return !!d&&d.provisioning.status==='ready'&&d.provisioning.generation===d.generation&&SOC.products.bindingStatus(r,deployment,feature,resource,productHooks).available;};
 const hooks={productBindingAvailable};
 const report=CAP.calculate(s,hooks).levels['progress.progression-level.11'];assert.equal(report.status,'ready',JSON.stringify({observation:s.serviceObservation?.proofs.map(x=>x.result),job:s.information.jobs,needs:s.outcomes.needs,deploy:s.products.deployments}));
 assert.equal(CAP.validateEvidence(s,'progress.progression-level.11',report.evidence,{hooks,archived:true}),true);
 s=SOC.dispatch(s,{type:'progression',command:{action:'start'}});assert.equal(SOC.calculate(s).progression.levels['progress.progression-level.11'].status,'ready');s=SOC.dispatch(s,{type:'progression',command:{action:'claim-level',level:'progress.progression-level.11'}});assert.equal(s.progression.levels['progress.progression-level.11'].status,'earned');
 const removed=structuredClone(s);removed.interactions=removed.interactions.filter(x=>x.id!==call.id);assert.equal(CAP.calculate(removed,hooks).levels['progress.progression-level.11'].status,'incomplete');
 const pending=SOC.dispatch(structuredClone(s),{type:'products',command:{action:'configure',id:'ai-deployment',config:{productVersion:'scenario-2'}}});assert.equal(CAP.calculate(pending,hooks).levels['progress.progression-level.11'].status,'incomplete','an old effective profile does not qualify during a pending generation');
 const unavailableHooks={productBindingAvailable:()=>false};assert.equal(CAP.calculate(s,unavailableHooks).levels['progress.progression-level.11'].status,'incomplete','a declared binding without trusted current feature availability does not qualify');
 let unbound=SOC.dispatch(structuredClone(s),{type:'products',command:{action:'configure',id:'ai-deployment',config:{bindings:[]}}});unbound=SOC.dispatch(unbound,{type:'advance',minutes:1});assert.equal(CAP.calculate(unbound,hooks).levels['progress.progression-level.11'].status,'incomplete','an effective product without the bound AI feature is not an AI operator deployment');
 const staleProcessor=SOC.dispatch(structuredClone(s),{type:'configure',id:'speech',config:{...s.resources.speech.effective,enabled:false}});assert.equal(CAP.calculate(staleProcessor,hooks).levels['progress.progression-level.11'].status,'incomplete','a stale or unavailable bound processor does not qualify');
 let historical=SOC.dispatch(structuredClone(s),{type:'configure',id:'speech',config:{...s.resources.speech.effective,enabled:false}});historical=SOC.dispatch(historical,{type:'products',command:{action:'configure',id:'ai-deployment',config:{productVersion:'scenario-2'}}});assert.equal(CAP.calculate(historical,hooks).levels['progress.progression-level.11'].status,'incomplete');historical=SOC.restore(JSON.stringify(historical));assert.equal(SOC.validateState(historical),historical);assert.equal(historical.progression.levels['progress.progression-level.11'].status,'earned','disable and upgrade preserve the historic award');
 const deletedHistory=structuredClone(historical);deletedHistory.products.deployments.find(x=>x.id==='ai-deployment').effectiveHistory=[];assert.throws(()=>SOC.validateState(deletedHistory),/INVALID_PROGRESSION_LEVEL/);
 const forgedHistory=structuredClone(historical);forgedHistory.products.deployments.find(x=>x.id==='ai-deployment').effectiveHistory[0].effective.bindings=[];assert.throws(()=>SOC.validateState(forgedHistory),/INVALID_PROGRESSION_LEVEL/);
});
