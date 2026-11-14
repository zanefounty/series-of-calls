'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer';
const child=s=>s.portfolio.customers.find(row=>row.id===customerId).root;
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[],JSON.stringify({clock:s.clock,request,blockers:q.blockers}));return send(s,{...request,quoteRevision:q.atRevision});}
function until(s,condition,limit=150){for(let i=0;i<limit&&!condition(s);i++)s=SOC.dispatch(s,{type:'advance',minutes:1});assert.ok(condition(s),`condition not reached by minute ${s.clock}`);return s;}
function recordedOpening(){
 let s=SOC.create({experience:'campaign',scenario:'enterprise',difficulty:'easy',meetingContinuityVersion:1});
 for(const stage of ['base','carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'steady',stage,...(stage==='base'?{}:{customerId})});
 s=until(s,x=>x.providerCampaign.customers[0].status==='active');
 s=buy(s,{action:'meeting-plan',customerId,periodIndex:0,minute:40});
 for(const operationId of ['recording','room']){
  s=until(s,x=>SOC.provider.quote(x,{action:'operation',operationId,customerId}).blockers.length===0);
  s=buy(s,{action:'operation',operationId,customerId});
  s=until(s,x=>x.providerCampaign.projects.findLast(p=>p.operationId===operationId)?.status==='complete');
 }
 s=until(s,x=>x.clock>=60);
 const first=child(s).information.meetingSessions.find(m=>m.status==='completed'&&m.captureRecordId);
 assert.ok(first,'the first real partner meeting has a retained recording');
 return {s,first};
}

test('AC-SOC-903 a later Enterprise meeting requires the prior recorded decision and retains its promise through save and Worker',()=>{
 const {s:opening,first}=recordedOpening(),request={action:'meeting-plan',customerId,periodIndex:1,minute:20,recordId:first.captureRecordId};
 const snapshot=JSON.stringify(opening),missing=SOC.provider.quote(opening,{action:'meeting-plan',customerId,periodIndex:1,minute:20});
 assert.ok(missing.blockers.includes('PRIOR_MEETING_RECORD_REQUIRED'));
 assert.ok(SOC.provider.quote(opening,{...request,recordId:'record-unknown'}).blockers.includes('PRIOR_MEETING_RECORD_UNAVAILABLE'));
 const quote=SOC.provider.quote(opening,request);assert.deepEqual(quote.blockers,[]);assert.equal(JSON.stringify(opening),snapshot,'inspection and quote are pure');
 const model=SOC.provider.inspect(opening),dom=new JSDOM('<!doctype html><body></body>',{runScripts:'dangerously'});
 try{const w=dom.window;w.N_=x=>x;w.SOCProviderCanvas={resourceStatus:()=> 'Observed ready'};for(const file of ['src/game/23-provider-variants.js','src/game/93-ui/70-provider-hud.js','src/game/93-ui/75-provider-panels.js'])w.eval(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
  w.document.body.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId}});
  const form=w.document.querySelector('[data-provider-form="meeting-plan"]'),checkbox=form.querySelector('[name="carryDecision"]');assert.equal(form.dataset.record,first.captureRecordId);assert.equal(checkbox.required,true);assert.match(form.textContent,/earlier partner meeting/);
  const quoteHtml=w.SOCProviderPanels.quote(quote,{quoteRequest:request});assert.match(quoteHtml,new RegExp(first.captureRecordId));assert.equal(JSON.stringify(opening),snapshot,'rendering stays pure');
  assert.match(w.SOCProviderPanels.quote(missing,{quoteRequest:missing.request}),/Select the earlier partner recording/);
 }finally{dom.window.close();}
 const stale=SOC.dispatch(opening,{type:'advance',minutes:1});assert.throws(()=>send(stale,{...request,quoteRevision:quote.atRevision}),/STALE_PROVIDER_QUOTE/);
 const unpromised=until(opening,x=>x.clock>=82);assert.equal(unpromised.providerCampaign.meetings.find(m=>m.periodIndex===1).reason,'PRIOR_MEETING_DECISION_REQUIRED');
 let promised=buy(opening,request),plan=promised.providerCampaign.meetingPlans.find(p=>p.periodIndex===1);
 assert.deepEqual({recordId:plan.priorRecordId,sessionId:plan.priorSessionId,promise:plan.promise},{recordId:first.captureRecordId,sessionId:first.id,promise:'carry-prior-partner-decision'});
 assert.deepEqual(SOC.restore(JSON.stringify(promised)),promised);
 const command={type:'advance',minutes:1},expected=SOC.dispatch(promised,command);let reply;
 const context={postMessage:x=>reply=x};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:'continuity',state:promised,command}});
 assert.equal(reply.error,undefined);assert.deepEqual(JSON.parse(JSON.stringify(reply.state)),expected);
 const incident=promised.providerCampaign.incidents.find(i=>i.status==='active'&&i.resource==='room');assert.ok(incident);
 promised=buy(promised,{action:'respond-incident',incidentId:incident.id,operationId:'repair'});
 promised=until(promised,x=>x.providerCampaign.incidents.find(i=>i.id===incident.id)?.status==='resolved');
 promised=until(promised,x=>x.clock>=85);assert.equal(promised.providerCampaign.meetings.find(m=>m.periodIndex===1).status,'scheduled');
 const second=child(promised).information.meetingSessions.find(m=>m.scheduledAt===80);assert.equal(second?.status,'completed');assert.ok(second.captureRecordId);
 const badPeriod=until(unpromised,x=>x.clock>=120).providerCampaign.customers[0].history.find(h=>h.period===1),goodPeriod=until(promised,x=>x.clock>=120).providerCampaign.customers[0].history.find(h=>h.period===1);
 assert.equal(badPeriod.evidence.meetingSessions.length,0);assert.ok(goodPeriod.evidence.meetingSessions.some(row=>row.id===second.id&&row.recordId===second.captureRecordId));
 for(const change of [p=>p.priorRecordId='record-unknown',p=>p.priorSessionId='meeting-session-unknown',p=>p.promise='none',p=>delete p.priorRecordId]){
  const forged=structuredClone(promised);change(forged.providerCampaign.meetingPlans.find(p=>p.periodIndex===1));assert.throws(()=>SOC.restore(JSON.stringify(forged)),/INVALID_PROVIDER_MEETING_PLAN/);
 }
});
