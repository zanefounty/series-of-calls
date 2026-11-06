"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),SOC=require('../src/game/55-communications'),F=require('../src/game/23-provider-case-followup');
const copy=x=>JSON.parse(JSON.stringify(x)),ID='customer-a';
// Real Lab interactions with isolated Provider adapter contracts. Paid hook facts below
// are fixtures, not a claim that Provider dispatch or earned L8 integration is implemented.
function fixture(){
 let lab=SOC.create({experience:'lab',mode:'sandbox',scenario:'smb',tenant:'orchard-repairs'});
 for(const c of SOC.reference(lab).filter(c=>c.type==='configure'))lab=SOC.dispatch(lab,c);
 lab=SOC.dispatch(lab,{type:'advance',minutes:1});
 for(const type of ['workforce','operations','channels'])lab=SOC.dispatch(lab,{type,command:{action:'start'}});
 for(const c of [{action:'observe',channel:'chatterleaf',authenticated:true,providerAvailable:true,fault:null},{action:'permission',tenant:'orchard-repairs',person:'alex',channel:'chatterleaf',purpose:'service',granted:true,expiresAt:null}])lab=SOC.dispatch(lab,{type:'channels',command:c});
 lab=SOC.dispatch(lab,{type:'advance',minutes:9});lab=SOC.dispatch(lab,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'followup-case',durationMinutes:3});
 const voice=lab.interactions.at(-1),j={id:'job-1',customerId:ID,caseId:voice.caseId,periodIndex:0,channel:'voice',arrivalAt:lab.clock,deadlineAt:45,interactionId:voice.id,status:'pending',settled:false,completedAt:null,voiceMinutes:0,messageUnits:0};
 const workflow={id:'workflow-1',customerId:ID,operationId:F.DIRECT,postingId:'entry-1',acceptedAt:0,completedAt:5,status:'complete',...F.terms(F.DIRECT)},connector={id:'connector-1',customerId:ID,operationId:F.CONNECTOR,postingId:'entry-2',acceptedAt:0,completedAt:6,status:'complete'};
 const s={clock:lab.clock,providerCampaign:{contentVersion:'provider-campaigns-8',caseFollowupVersion:1,customers:[{id:ID,portfolioId:ID,scenario:'smb',market:'au-sydney',status:'active'}],projects:[workflow,connector],jobs:[j,...Array.from({length:23},(_,n)=>({id:`other-job-${n}`,caseId:`other-case-${n}`,customerId:ID,periodIndex:0,status:'pending'}))]},portfolio:{customers:[{id:ID,root:lab}]},business:{balance:{cash:100000}}};
 const auth={version:1,planAt:7,caseIndex:12,caseId:j.caseId,person:'alex',consented:true,connectorId:'social-messaging',account:'chatterleaf',template:'service-outside-window',to:'+61255500201',deadlineAt:45};
 const hooks={customerRoot:(s,id)=>s.portfolio.customers.find(c=>c.id===id)?.root,authoredCase:()=>copy(auth),workflowAt:(s,id,at)=>({ready:true,projectId:'workflow-1',postingId:'entry-1'}),connectorAt:(s,id,at)=>({ready:true,projectId:'connector-1',postingId:'entry-2',generation:1,configuration:{account:'chatterleaf',generation:1}}),connectorAccepted:()=>true,paidProject:()=>true,earnedAt:()=>false,consentAt:()=>true,boundaryAt:()=>true,humanReady:()=>true,retryAt:(s,id,jobId,at)=>{const p=s.providerCampaign.projects.find(p=>p.operationId===F.RETRY&&p.config.jobId===jobId);return p?{projectId:p.id,postingId:p.postingId}:null;}};
 j.followup=F.reserve(s,j,hooks);return {s,j,hooks,auth,workflow,connector};
}
const root=f=>f.s.portfolio.customers[0].root;
function reconcile(f){const o=F.observe(f.s,f.j,f.hooks);for(const k of ['status','completedAt','voiceMinutes','messageUnits'])f.j[k]=o[k];return o;}
function send(f,c){f.s.portfolio.customers[0].root=SOC.dispatch(root(f),c);f.s.clock=root(f).clock;return reconcile(f);}
function until(f,fn,limit=35){for(let n=0;n<limit&&!fn();n++)send(f,{type:'advance',minutes:1});assert.ok(fn(),'actual Lab service completes within bounded ticks');}
const req=(retry=false)=>({action:retry?'retry-case-followup':'followup-case',customerId:ID,jobId:'job-1'});
function voiceDone(f){until(f,()=>root(f).interactions.find(i=>i.id===f.j.interactionId).phase==='resolved');assert.equal(F.observe(f.s,f.j,f.hooks).phase,'awaiting-followup');return f;}
function start(f,retry=false){const r=req(retry),plan=F.startPlan(f.s,r,f.hooks);f.s.portfolio.customers[0].root=SOC.dispatch(root(f),{type:'interact',...plan.interaction});const target=root(f).interactions.at(-1);target.trace.push({...copy(plan.trace),stage:'provider-followup',synthetic:true});f.j.followup=F.recordAttempt(f.s,r,plan,target.id,f.hooks);reconcile(f);return target.id;}
function complete(f){voiceDone(f);const id=start(f);until(f,()=>root(f).interactions.find(i=>i.id===id).phase==='resolved');f.j.settled=true;return f;}

test('AC-SOC-700 real Lab human voice then human digital work completes one isolated Provider obligation with conserved usage',()=>{
 const f=fixture(),before=JSON.stringify(f.s);assert.equal(F.observe(f.s,f.j,f.hooks).status,'pending');assert.equal(JSON.stringify(f.s),before);voiceDone(f);
 assert.equal(f.j.status,'pending','a completed voice leg alone does not discharge the reserved case');assert.equal(F.evidence(f.s,ID,f.hooks),null);const voice=root(f).interactions.find(i=>i.id===f.j.interactionId);assert.equal(voice.agent,'agent-01');assert.equal(voice.usageMinutes,3);
 const id=start(f);assert.equal(f.j.status,'pending');until(f,()=>root(f).interactions.find(i=>i.id===id).phase==='resolved');assert.equal(f.j.status,'completed');assert.equal(f.j.voiceMinutes,3);assert.equal(f.j.messageUnits,1);assert.equal(F.evidence(f.s,ID,f.hooks),null,'settlement is still required');f.j.settled=true;
 const e=F.evidence(f.s,ID,f.hooks);assert.ok(e);assert.equal(e.voice.caseId,e.digital.caseId);assert.equal(e.voice.from,e.digital.from);assert.equal(e.voice.tenant,e.digital.tenant);assert.equal(e.digital.agent,'agent-01');assert.equal(f.s.providerCampaign.jobs.length,24);assert.equal(new Set(f.s.providerCampaign.jobs.map(j=>j.caseId)).size,24);assert.equal(f.s.business.balance.cash,100000,'adapter never funds itself');assert.equal(F.validate(f.s,f.hooks),true);assert.equal(F.validateEvidence(f.s,e,f.hooks),true);
});

test('AC-SOC-701 queued handoff, bot acknowledgements and unrelated person or case do not prove completed voice and human follow-up',()=>{
 const pending=fixture();assert.equal(F.eligibility(pending.s,req(),pending.hooks).eligible,false);const done=complete(fixture()),e=F.evidence(done.s,ID,done.hooks);
 for(const change of [f=>{const i=root(f).interactions.find(i=>i.id===f.j.interactionId);i.phase='failed';i.outcome='CHANNEL_HANDOFF';},f=>root(f).interactions.at(-1).from='bea',f=>root(f).interactions.at(-1).caseId='unrelated',f=>root(f).interactions.at(-1).tenant='foreign',f=>root(f).interactions.at(-1).to='+61255500999',f=>delete root(f).interactions.at(-1).agent,f=>root(f).interactions.at(-1).trace=root(f).interactions.at(-1).trace.filter(t=>t.code!=='HUMAN_HANDOFF')]){const f={...done,s:copy(done.s)};f.j=f.s.providerCampaign.jobs[0];change(f);assert.equal(F.validateEvidence(f.s,e,f.hooks),false);}
});

test('AC-SOC-702 quotes require explicit consent, paid current connector, boundary and human eligibility without granting capacity or extending deadlines',()=>{
 const f=voiceDone(fixture()),before=JSON.stringify(f.s);assert.equal(F.quoteDetails(f.s,req(),f.hooks).deadlineAt,45);assert.equal(F.quoteDetails(f.s,req(),f.hooks).deadlineExtensionMinutes,0);assert.equal(JSON.stringify(f.s),before);
 for(const key of ['consentAt','boundaryAt','humanReady']){assert.equal(F.eligibility(f.s,req(),{...f.hooks,[key]:()=>false}).eligible,false);const h={...f.hooks};delete h[key];assert.throws(()=>F.eligibility(f.s,req(),h),/HOOK_REQUIRED/);}
 assert.equal(F.eligibility(f.s,req(),{...f.hooks,connectorAt:()=>({ready:false})}).eligible,false);assert.equal(F.canOrder(f.s,{customerId:ID,operationId:F.MANAGED},f.hooks).eligible,false);assert.equal(F.canOrder(f.s,{customerId:ID,operationId:F.MANAGED},{...f.hooks,earnedAt:()=>true}).eligible,true);assert.deepEqual(F.operationPlan(f.s,{customerId:ID,operationId:F.DIRECT},f.hooks).terms,F.terms(F.DIRECT));assert.equal(f.s.business.balance.cash,100000);
});

test('AC-SOC-703 failed accepted Lab message retains its unit and needs one scoped paid retry before real same-case recovery',()=>{
 const f=voiceDone(fixture()),first=start(f);until(f,()=>root(f).interactions.find(i=>i.id===first).trace.some(t=>t.code==='CHANNEL_ACCEPTED'));
 send(f,{type:'workforce',command:{action:'roster',people:root(f).workforceOps.roster.desired.map(p=>({...p,available:false}))}});until(f,()=>root(f).interactions.find(i=>i.id===first).phase==='failed');assert.equal(f.j.messageUnits,1);assert.equal(F.observe(f.s,f.j,f.hooks).phase,'retry-required');assert.ok(F.eligibility(f.s,req(true),f.hooks).blockers.includes('FOLLOWUP_PAID_RETRY_REQUIRED'));const retryQuote=F.quoteDetails(f.s,req(true),f.hooks);assert.equal(retryQuote.eligible,true);assert.equal(retryQuote.incrementalSetupCents,4000);assert.equal(retryQuote.fundingRequired,true);assert.throws(()=>F.startPlan(f.s,req(true),f.hooks),/INVALID_PROVIDER_CASE_FOLLOWUP/);
 const at=f.s.clock,p={id:'retry-1',customerId:ID,operationId:F.RETRY,postingId:'entry-3',config:{jobId:f.j.id},acceptedAt:at,completedAt:at+2,status:'complete',...F.terms(F.RETRY)};f.s.providerCampaign.projects.push(p);send(f,{type:'workforce',command:{action:'roster',people:root(f).workforceOps.roster.desired.map(p=>({...p,available:true}))}});send(f,{type:'advance',minutes:2});assert.equal(F.quoteDetails(f.s,req(true),f.hooks).incrementalSetupCents,0,'the funded retry is not charged twice');const next=start(f,true);until(f,()=>root(f).interactions.find(i=>i.id===next).phase==='resolved');assert.equal(f.j.messageUnits,2);assert.equal(f.j.voiceMinutes,3);assert.equal(f.j.deadlineAt,45);assert.equal(f.j.followup.attempts.length,2);assert.equal(F.eligibility(f.s,req(true),f.hooks).eligible,false);f.j.settled=true;assert.equal(F.validate(f.s,f.hooks),true);assert.ok(F.evidence(f.s,ID,f.hooks));
 const forged=copy(f.s);forged.providerCampaign.jobs[0].followup.attempts[1].retry=null;forged.providerCampaign.projects=forged.providerCampaign.projects.filter(p=>p.operationId!==F.RETRY);assert.throws(()=>F.validate(forged,f.hooks),/INVALID_PROVIDER_CASE_FOLLOWUP/,'coherently removing both retry receipt and paid project must not authorize a second attempt');
});

test('AC-SOC-704 follow-up receipts reject coherent scope, history, funding and premature-completion edits while historical retirement remains valid',()=>{
 const f=complete(fixture()),e=F.evidence(f.s,ID,f.hooks);for(const change of [s=>s.providerCampaign.jobs[0].followup.deadlineAt++,s=>s.providerCampaign.jobs[0].followup.authored.consented=false,s=>s.providerCampaign.jobs[0].followup.workflow.postingId='unpaid',s=>s.providerCampaign.jobs[0].followup.attempts[0].at--,s=>s.providerCampaign.jobs[0].messageUnits=0,s=>s.providerCampaign.jobs[0].followup.attempts[0].connector.generation++,s=>s.providerCampaign.caseFollowupVersion=2]){const s=copy(f.s);change(s);assert.throws(()=>F.validate(s,f.hooks),/INVALID_PROVIDER_CASE_FOLLOWUP/);assert.equal(F.validateEvidence(s,e,f.hooks),false);}
 const queued=voiceDone(fixture());queued.j.status='completed';queued.j.completedAt=queued.s.clock;assert.throws(()=>F.validate(queued.s,queued.hooks),/INVALID_PROVIDER_CASE_FOLLOWUP/);
 f.connector.retirement={effectiveAt:f.s.clock+1};f.workflow.retirement={effectiveAt:f.s.clock+1};f.s.clock+=2;assert.equal(F.validateEvidence(f.s,e,f.hooks),true,'later retirement does not erase historical permission');assert.equal(F.validateEvidence(f.s,e,{...f.hooks,connectorAccepted:()=>false}),false,'a paid connector alone does not prove the actual digital path used it');
});

test('AC-SOC-705 same-case adapter serialization, real Lab save restoration and bounded retained-job pins remain deterministic',()=>{
 const f=complete(fixture()),e=F.evidence(f.s,ID,f.hooks),context={};vm.createContext(context);vm.runInContext(F.source()+';globalThis.api=SOC_PROVIDER_CASE_FOLLOWUP;',context);assert.deepEqual(copy(context.api.evidence(f.s,ID,f.hooks)),e);assert.equal(context.api.validate(f.s,f.hooks),true);
 assert.deepEqual(SOC.restore(JSON.stringify(root(f))),root(f));const restored=copy(f.s);assert.equal(F.validate(restored,f.hooks),true);assert.deepEqual(F.pins(f.s,ID).interactionIds,[e.voice.id,e.digital.id]);f.s.providerCampaign.jobs=[];assert.deepEqual(F.pins(f.s,ID),{jobIds:[],caseIds:[],interactionIds:[]});assert.equal(F.evidence(f.s,ID,f.hooks),null);
});

// Isolate only the unrelated progression facts. The actual follow-up evaluator,
// receipt maker, restore validator and unlock adapter execute unchanged.
function receiptAdapter(f){
 const receipts=require('../src/game/23-provider-progression-receipts'),facts={LEVELS:[F.SOURCE_ID],GOALS:[],decodeSupportObservation:()=>[],evaluate:s=>({levels:{[F.SOURCE_ID]:{id:F.SOURCE_ID,name:'Omnichannel platform operator',...F.evaluate(s,ID,f.hooks)}},goals:{}})},context={SOC_PROVIDER_PROGRESSION_FACTS:facts,SOC_PROVIDER_CASE_FOLLOWUP:F};vm.createContext(context);vm.runInContext(receipts.source()+';globalThis.api=SOC_PROVIDER_PROGRESSION_RECEIPTS;',context);return {R:context.api,hooks:{caseFollowupHooks:()=>f.hooks}};
}
function reseal(r){const v={...r};delete v.integrity;let hash=0x811c9dc5;for(const c of JSON.stringify(v)){hash^=c.charCodeAt(0);hash=Math.imul(hash,0x01000193);}r.integrity=(hash>>>0).toString(16).padStart(8,'0');}

test('AC-SOC-708 settled same-case facts earn one paid market-scoped L8 offer without funds or capacity awards',()=>{
 const f=voiceDone(fixture()),{R,hooks}=receiptAdapter(f);assert.equal(R.eligibility(f.s,F.SOURCE_ID,hooks).status,'incomplete');assert.throws(()=>R.claim(f.s,F.SOURCE_ID,hooks),/EVIDENCE_REQUIRED/);
 const id=start(f);until(f,()=>root(f).interactions.find(i=>i.id===id).phase==='resolved');assert.equal(R.eligibility(f.s,F.SOURCE_ID,hooks).status,'incomplete');f.j.settled=true;const before=copy(f.s),claimed=R.claim(f.s,F.SOURCE_ID,hooks);assert.deepEqual(f.s,before);assert.equal(claimed.receipt.unlock.operationId,F.MANAGED);assert.deepEqual(copy(claimed.receipt.unlock.allowedMarkets),['au-sydney']);assert.deepEqual(copy(claimed.state.business),before.business);assert.deepEqual(copy(claimed.state.portfolio),before.portfolio);assert.equal(R.claim(claimed.state,F.SOURCE_ID,hooks).idempotent,true);
 let quoted=null;const quoteHooks={...hooks,providerQuote:(s,r)=>{quoted=r;return {request:r,blockers:[],...F.terms(F.MANAGED)};}};const offer=R.unlockProposal(claimed.state,F.SOURCE_ID,quoteHooks);assert.equal(offer.status,'available');assert.deepEqual(copy(quoted),{action:'operation',operationId:F.MANAGED,customerId:ID});assert.equal(offer.quote.setupCents,9000);assert.equal(offer.quote.periodCents,6500);assert.equal(offer.quote.workMinutes,7);
 claimed.state.providerCampaign.customers.push({id:'customer-foreign',portfolioId:'foreign-portfolio',market:'jp-tokyo'});quoted=null;assert.equal(R.unlockProposal(claimed.state,F.SOURCE_ID,{...quoteHooks,customerId:'customer-foreign'}).status,'blocked');assert.equal(quoted,null);assert.deepEqual(copy(R.caseFollowupRetentionPins(claimed.receipt,ID).interactionIds),[f.j.interactionId,id]);
});

test('AC-SOC-709 L8 historical receipt survives later retirement but rejects rehashed case, paid scope, units and removed live proof',()=>{
 const f=complete(fixture()),{R,hooks}=receiptAdapter(f),claimed=R.claim(f.s,F.SOURCE_ID,hooks),s=copy(claimed.state);s.clock+=3;for(const p of s.providerCampaign.projects)p.retirement={effectiveAt:claimed.receipt.at+1};assert.equal(R.validate(s,hooks),true);
 for(const change of [r=>r.sourceEvidence.job.followup.person='bea',r=>r.sourceEvidence.job.followup.attempts[0].connector.projectId='unpaid',r=>r.sourceEvidence.job.messageUnits=2,r=>r.sourceEvidence.market='jp-tokyo',r=>r.sourceEvidence.digital.agent='bot']){const forged=copy(s),r=forged.providerCampaign.progressionReceipts.receipts[0];change(r);reseal(r);assert.throws(()=>R.validate(forged,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);}
 const missing=copy(s);missing.providerCampaign.jobs=[];assert.throws(()=>R.validate(missing,hooks),/INVALID_PROVIDER_PROGRESSION_RECEIPT/);assert.equal(R.validate(s,hooks),true,'negative copies never mutate the lawful receipt');
});
