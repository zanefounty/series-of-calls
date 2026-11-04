const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications.js');
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
