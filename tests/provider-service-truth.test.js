const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
const vm=require('node:vm');
function endpoint(scenario='smb'){
 let s=SOC.create({scenario,mode:'sandbox'});
 for(const c of [{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}},{type:'configure',id:'recorder',config:{identityMapping:true,capacity:1}},{type:'advance',minutes:1}])s=SOC.dispatch(s,c);
 return s;
}
const call=(s,id='conversation',extra={})=>SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:id,durationMinutes:3,...extra});
test('ordinary endpoint service occupies carrier minutes until completion; probes earn no delivery',()=>{
 let s=endpoint();s=call(s);assert.equal(s.interactions.at(-1).phase,'connected');
 s=SOC.dispatch(s,{type:'advance',minutes:2});assert.equal(s.interactions.at(-1).phase,'connected');assert.equal(s.interactions.at(-1).usageMinutes,2);
 s=SOC.dispatch(SOC.restore(JSON.stringify(s)),{type:'advance',minutes:1});assert.equal(s.interactions.at(-1).phase,'resolved');assert.equal(s.interactions.at(-1).usageMinutes,3);
 const revenue=s.totals.revenue;s=SOC.dispatch(s,{type:'probe',channel:'voice',from:'alex',to:'+61255500201',caseId:'diagnostic'});
 assert.equal(s.interactions.at(-1).probe,true);assert.equal(s.interactions.at(-1).phase,'resolved');s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(s.totals.revenue,revenue);
});
test('current effective media loss fails live service while signalling-only loss preserves it',()=>{
 for(const media of [true,false]){
  let s=call(endpoint());s=SOC.dispatch(s,{type:'configure',id:'phone',config:media?{mediaOut:false,mediaIn:false}:{signalling:false}});
  s=SOC.dispatch(s,{type:'advance',minutes:3});assert.equal(s.interactions.at(-1).phase,media?'failed':'resolved');
  if(media)assert.equal(s.interactions.at(-1).outcome,'MEDIA_LOST');
 }
});
test('capacity-one capture cannot record four simultaneous required conversations',()=>{
 let s=endpoint('enterprise');for(let n=0;n<4;n++)s=call(s,'conversation-'+n);
 assert.equal(s.captureReservations.length,1);assert.equal(s.interactions.filter(i=>i.capture.status==='denied').length,3);
 s=SOC.dispatch(s,{type:'advance',minutes:3});assert.equal(s.records.filter(r=>r.kind==='recording').length,1);assert.equal(s.captureReservations.length,0);
 s=call(s,'after-release');assert.equal(s.captureReservations.length,1);s=SOC.dispatch(s,{type:'advance',minutes:3});assert.equal(s.records.filter(r=>r.kind==='recording').length,2);
 assert.doesNotThrow(()=>SOC.restore(JSON.stringify(s)));
});
test('connected calls count against carrier sessions and failed media releases occupancy',()=>{
 let s=endpoint();s=SOC.dispatch(s,{type:'configure',id:'carrier',config:{capacity:1}});s=SOC.dispatch(s,{type:'advance',minutes:1});s=call(s,'first');s=call(s,'second');
 assert.equal(s.interactions.at(-1).outcome,'SESSION_CAPACITY');s=SOC.dispatch(s,{type:'advance',minutes:3});s=call(s,'third');assert.equal(s.interactions.at(-1).phase,'connected');
 const bad=structuredClone(s);bad.interactions.at(-1).due+=1;assert.throws(()=>SOC.validateState(bad),/INVALID_CONNECTED_SESSION/);
});

test('capture interrupted during a call cannot become a complete recording after recovery',()=>{
 let s=call(endpoint('enterprise'));s=SOC.dispatch(s,{type:'fault',id:'recorder',fault:'OUTAGE'});s=SOC.dispatch(s,{type:'advance',minutes:1});
 assert.equal(s.captureReservations.length,0);assert.equal(s.interactions.at(-1).capture.status,'interrupted');
 s=SOC.dispatch(s,{type:'fault',id:'recorder',fault:null});s=SOC.dispatch(s,{type:'advance',minutes:2});assert.equal(s.interactions.at(-1).phase,'resolved');assert.equal(s.records.length,0);assert.ok(s.interactions.at(-1).obligations.includes('CAPTURE_INTERRUPTED'));
 const bad=call(endpoint('enterprise'));bad.captureReservations=[];assert.throws(()=>SOC.restore(JSON.stringify(bad)),/MISSING_CAPTURE_RESERVATION/);
});

test('AC-SOC-673 established single-direction loss ends one real conversation, releases capture once and permits fresh recovery',()=>{
 for(const lost of ['mediaIn','mediaOut']){
  // Fault authoring belongs to Lab. This exercises the shared live-call engine,
  // not an invented Provider fault-injection control or a successful probe.
  let s=endpoint('enterprise');
  s=SOC.dispatch(s,{type:'configure',id:'carrier',config:{capacity:1}});
  s=SOC.dispatch(s,{type:'advance',minutes:1});
  s=call(s,'established-'+lost.toLowerCase(),{durationMinutes:6});
  const id=s.interactions.at(-1).id,at=s.clock;
  s=SOC.dispatch(s,{type:'advance',minutes:1});
  const before=s.interactions.find(i=>i.id===id);
  assert.equal(before.phase,'connected');assert.equal(before.usageMinutes,1);
  assert.notEqual(before.probe,true);assert.deepEqual([before.media.in,before.media.out],[true,true]);
  assert.equal(s.captureReservations.filter(r=>r.id===id).length,1);
  const revenue=s.totals.revenue;
  s=SOC.dispatch(s,{type:'configure',id:'phone',config:{[lost]:false}});
  const saved=SOC.restore(JSON.stringify(s)),command={type:'advance',minutes:1};
  let response;const worker={postMessage:r=>{response=r;}};vm.createContext(worker);
  vm.runInContext(SOC.workerSource(),worker);worker.onmessage({data:{id:673,state:saved,command}});
  assert.equal(response.error,undefined);
  s=SOC.dispatch(s,command);assert.deepEqual(JSON.parse(JSON.stringify(response.state)),s);
  const failed=s.interactions.find(i=>i.id===id);
  assert.equal(failed.phase,'failed');assert.equal(failed.outcome,'ONE_WAY_MEDIA');
  assert.equal(failed.media.in,lost!=='mediaIn');assert.equal(failed.media.out,lost!=='mediaOut');
  assert.equal(failed.finishedAt,at+2);assert.ok(failed.finishedAt<failed.due);
  assert.equal(failed.usageMinutes,1,'the failed minute adds no conversation usage');
  assert.equal(s.ledger.at(-1).usage,0);assert.equal(s.totals.revenue,revenue);
  assert.equal(failed.capture.status,'released');assert.equal(failed.capture.endedAt,s.clock);
  assert.equal(s.captureReservations.some(r=>r.id===id),false);
  assert.equal(s.records.some(r=>r.interaction===id),false);
  assert.equal(failed.trace.filter(t=>t.stage==='outcome').length,1);
  const receipt=JSON.stringify(failed);
  s=SOC.dispatch(SOC.restore(JSON.stringify(s)),{type:'advance',minutes:2});
  assert.equal(JSON.stringify(s.interactions.find(i=>i.id===id)),receipt);
  s=SOC.dispatch(s,{type:'configure',id:'phone',config:{[lost]:true}});
  s=SOC.dispatch(s,{type:'advance',minutes:1});s=call(s,'recovered-'+lost.toLowerCase());
  const recoveredId=s.interactions.at(-1).id;
  assert.equal(s.interactions.at(-1).phase,'connected','the capacity-one carrier is reusable');
  assert.equal(s.captureReservations.length,1);assert.equal(s.captureReservations[0].id,recoveredId);
  s=SOC.dispatch(s,{type:'advance',minutes:3});
  const recovered=s.interactions.find(i=>i.id===recoveredId);
  assert.equal(recovered.outcome,'CONNECTED');assert.equal(recovered.usageMinutes,3);
  assert.equal(s.captureReservations.length,0);
  assert.equal(s.records.filter(r=>r.kind==='recording'&&r.interaction===recoveredId).length,1);
  assert.equal(JSON.stringify(s.interactions.find(i=>i.id===id)),receipt);
  assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
 }
});
