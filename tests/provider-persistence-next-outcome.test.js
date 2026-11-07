'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const SOC=require('../src/game/55-communications');
const customerId='starter-customer';
const child=s=>s.portfolio.customers.find(c=>c.id===customerId).root;
const send=(s,command)=>SOC.dispatch(s,{type:'provider',command});
const tick=s=>SOC.dispatch(s,{type:'advance',minutes:1});
function buy(s,request){const q=SOC.provider.quote(s,request);assert.deepEqual(q.blockers,[]);return send(s,{...q.request,quoteRevision:q.atRevision});}
function until(s,predicate,limit,label){for(let n=0;n<limit&&!predicate(s);n++)s=tick(s);assert.ok(predicate(s),label);return s;}
function replayWorker(state,commands){let result;const context={postMessage:value=>{result=value;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);let next=state;
 for(const [index,command] of commands.entries()){result=null;context.onmessage({data:{id:index+1,state:next,command}});assert.ok(result);assert.equal(result.error,undefined);next=JSON.parse(JSON.stringify(result.state));}return next;}
function compareNext(t,state,label,continueOriginal){
 const saved=JSON.stringify(state),restored=SOC.restore(saved),commands=[];assert.equal(JSON.stringify(restored),saved,label+' restores byte-for-byte');
 const dispatch=(current,command)=>{commands.push(structuredClone(command));return SOC.dispatch(current,command);};
 const expected=continueOriginal(state,dispatch);assert.ok(commands.length>0);assert.equal(JSON.stringify(state),saved,label+' preserves original checkpoint');
 let replay=restored;for(const command of commands)replay=SOC.dispatch(replay,command);
 assert.equal(JSON.stringify(replay),JSON.stringify(expected),label+' exact original/restored next outcome');
 assert.deepEqual(replay.business.ledger,expected.business.ledger);assert.deepEqual(replay.business.solvency,expected.business.solvency);
 assert.deepEqual(replayWorker(SOC.restore(saved),commands),expected,label+' actual worker outcome');
 assert.equal(JSON.stringify(SOC.restore(JSON.stringify(expected))),JSON.stringify(expected),label+' resulting save remains exact');
 const digest=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
 t.diagnostic(JSON.stringify({checkpoint:label,clock:state.clock,nextClock:expected.clock,commands,stateSha256:digest(state),nextStateSha256:digest(expected),ledgerBefore:state.business.ledger.length,ledgerAfter:expected.business.ledger.length,solvency:expected.business.solvency.status}));
 return expected;
}

test('AC-SOC-876 paid Provider save/restore reproduces connected-call, running-project, active-incident and pending-bill next outcomes',t=>{
 let s=SOC.create({experience:'campaign',scenario:'smb',market:'au-sydney',difficulty:'normal',seed:73});
 s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});
 const base=s.providerCampaign.projects[0];assert.equal(base.status,'running');assert.ok(s.business.ledger.some(e=>e.id===base.postingId&&e.cents===base.setupCents));
 s=compareNext(t,s,'running paid base project',(current,dispatch)=>{
  for(let n=0;n<10&&current.providerCampaign.projects.find(p=>p.id===base.id).status!=='complete';n++)current=dispatch(current,{type:'advance',minutes:1});
  assert.equal(current.providerCampaign.projects.find(p=>p.id===base.id).status,'complete');assert.equal(current.providerCampaign.customers[0].stages.base.status,'effective');return current;
 });
 for(const stage of ['carrier','partner'])s=buy(s,{action:'purchase',offerId:'starter',planId:'swift',stage,customerId});
 s=until(s,x=>x.providerCampaign.customers[0].status==='active',12,'paid service becomes active');
 // Provider voice to a service queue is an established call in handling phase,
 // with actual bidirectional media and usage; queued/wrap work cannot qualify.
 const live=x=>child(x).interactions.find(i=>i.channel==='voice'&&i.phase==='handling'&&i.providerContext?.connected===true&&i.media?.in===true&&i.media?.out===true&&i.usageMinutes>0&&i.agent&&i.trace.some(row=>row.code==='200_OK')&&i.trace.some(row=>row.code==='CARRIER_PATH_ADMITTED')&&x.providerCampaign.jobs.some(j=>j.interactionId===i.id&&j.status==='pending'));
 s=until(s,x=>!!live(x),30,'actual connected voice call required, not queued work');const callId=live(s).id;
 s=compareNext(t,s,'connected paid voice call',(current,dispatch)=>{
  for(let n=0;n<12&&current.providerCampaign.jobs.find(j=>j.interactionId===callId).status==='pending';n++)current=dispatch(current,{type:'advance',minutes:1});
  const call=child(current).interactions.find(i=>i.id===callId),job=current.providerCampaign.jobs.find(j=>j.interactionId===callId);assert.equal(call.phase,'resolved');assert.ok(Number.isInteger(call.finishedAt));assert.ok(call.usageMinutes>0);assert.equal(job.status,'completed');return current;
 });
 s=until(s,x=>x.providerCampaign.incidents.some(i=>i.status==='active'),40,'actual authored incident occurs');const incident=s.providerCampaign.incidents.find(i=>i.status==='active');
 s=compareNext(t,s,'active authored carrier incident',(current,dispatch)=>{
  current=dispatch(current,{type:'provider',command:{action:'acknowledge-incident',incidentId:incident.id}});
  const request={action:'operation',operationId:'repair',customerId},q=SOC.provider.quote(current,request);assert.deepEqual(q.blockers,[]);
  current=dispatch(current,{type:'provider',command:{...q.request,quoteRevision:q.atRevision}});
  for(let n=0;n<10&&current.providerCampaign.incidents.find(i=>i.id===incident.id).status!=='resolved';n++)current=dispatch(current,{type:'advance',minutes:1});
  assert.equal(current.providerCampaign.incidents.find(i=>i.id===incident.id).status,'resolved');assert.ok(current.providerCampaign.projects.some(p=>p.operationId==='repair'&&p.status==='complete'));return current;
 });
 assert.ok(s.clock<59);s=until(s,x=>x.clock===59,59-s.clock,'immediately before first settlement');
 const payroll=s.providerCampaign.payroll;assert.ok(payroll.personMinutes>payroll.billedMinutes,'real staffed minutes have accrued but not been billed');assert.equal(payroll.billedMinutes,0);
 assert.equal(s.providerCampaign.customers[0].history.length,0);assert.ok(Object.values(s.providerCampaign.customers[0].stages).every(stage=>stage.periodCents>0));
 assert.equal(s.business.ledger.some(e=>e.reason==='provider-wholesale-period'||e.reason==='staff'),false,'setup and usage do not masquerade as the pending recurring bill');
 const beforeLedger=s.business.ledger.map(e=>e.id),beforeCash=s.business.balance.cash;
 s=compareNext(t,s,'pending accrued bill at minute 59',(current,dispatch)=>dispatch(current,{type:'advance',minutes:1}));
 assert.equal(s.clock,60);const posted=s.business.ledger.filter(e=>!beforeLedger.includes(e.id));
 assert.equal(posted.filter(e=>e.reason==='staff').length,1);assert.equal(posted.filter(e=>e.reason==='provider-wholesale-period').length,1);
 assert.ok(posted.find(e=>e.reason==='staff').cents>0);assert.ok(posted.find(e=>e.reason==='provider-wholesale-period').cents>0);
 assert.equal(s.providerCampaign.customers[0].history.length,1);assert.equal(s.providerCampaign.payroll.billedMinutes,s.providerCampaign.payroll.personMinutes);
 assert.equal(s.business.balance.cash,beforeCash+posted.reduce((sum,e)=>sum+(e.category==='revenue'?e.cents:e.category==='cost'?-e.cents:0),0));
 assert.equal(s.business.solvency.status,'current');
});
