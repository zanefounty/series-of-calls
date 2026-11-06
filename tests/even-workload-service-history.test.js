const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const SOC=require('../src/game/55-communications');
const clone=x=>JSON.parse(JSON.stringify(x));
const tick=(s,minutes=1)=>SOC.dispatch(s,{type:'advance',minutes});
function opening(){
 let s=SOC.create({experience:'lab',mode:'sandbox',scenario:'smb'});
 s=SOC.dispatch(s,{type:'business',command:{action:'start'}});
 s=SOC.dispatch(s,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'desk'}]}});
 s=SOC.dispatch(s,{type:'business',command:{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone'],sell:true}});
 assert.equal(s.experience.kind,'lab');assert.equal(s.providerCampaign,undefined);
 s=tick(s,60);const c=s.business.contracts[0];assert.equal(c.status,'active');assert.equal(c.nextBill,120);assert.ok(s.business.ledger.some(x=>x.contract===c.id&&x.reason==='wholesale'&&x.cents>0));assert.ok(s.business.ledger.some(x=>x.contract===c.id&&x.category==='revenue'&&x.cents>0));return s;
}
function workerStep(s,command){let result;const context={postMessage:r=>{result=r;}};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:684,state:s,command}});assert.equal(result.error,undefined);return clone(result.state);}
function period(kind){
 let s=opening();const samples=[];let beforeSettlement;
 for(let at=60;at<120;at++){
  assert.equal(s.clock,at);
  if(kind==='long'&&at===62||kind==='last'&&at===119)s=SOC.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});
  if(kind==='long'&&at===119)s=SOC.dispatch(s,{type:'fault',id:'phone',fault:null});
  s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'even-'+at,durationMinutes:1});
  const i=s.interactions.at(-1);assert.notEqual(i.probe,true);assert.equal(i.startedAt,at);assert.equal(i.durationMinutes,1);
  samples.push({at,interactionId:i.id,admissionPhase:i.phase,ready:SOC.observe(s,'phone').ready});
  if(at===119)beforeSettlement=SOC.restore(JSON.stringify(s));
  s=tick(s);
 }
 const direct=tick(beforeSettlement),restored=tick(SOC.restore(JSON.stringify(beforeSettlement))),worker=workerStep(beforeSettlement,{type:'advance',minutes:1});assert.deepEqual(s,direct);assert.deepEqual(restored,direct);assert.deepEqual(worker,direct);
 return {s,samples};
}
function reconcile(s,samples,unavailable){
 assert.equal(s.clock,120);const c=s.business.contracts[0],h=c.settlements.find(x=>x.from===60&&x.to===120),calls=s.interactions.filter(i=>i.caseId.startsWith('even-'));
 assert.equal(calls.length,60);assert.equal(new Set(calls.map(i=>i.caseId)).size,60);assert.deepEqual(calls.map(i=>i.startedAt),Array.from({length:60},(_,i)=>60+i));assert.equal(samples.filter(x=>!x.ready).length,unavailable);
 assert.equal(h.serviceMinutes,60);assert.equal(h.unavailableMinutes,unavailable);assert.equal(h.readyMinutes,60-unavailable);
 const failed=calls.filter(i=>i.phase==='failed'),completed=calls.filter(i=>i.phase==='resolved');assert.equal(failed.length,unavailable);assert.equal(completed.length,60-unavailable);assert.ok(failed.every(i=>i.trace.some(t=>t.stage==='outcome')));assert.ok(completed.every(i=>i.outcome==='CONNECTED'&&i.finishedAt===i.startedAt+1&&i.usageMinutes===1&&i.trace.some(t=>t.code==='CARRIER_PATH_ADMITTED')));assert.ok(failed.every(i=>(i.usageMinutes||0)===0));
 const usage=calls.reduce((n,i)=>n+(i.usageMinutes||0),0);assert.equal(h.usage,usage);assert.equal(h.serviceCredit,Math.floor(c.price*unavailable/60));const price=SOC.business.offers.workplace;assert.equal(h.wholesale,price.wholesale*c.quantity+usage*Math.ceil(price.overage/2));assert.equal(h.overage,Math.max(0,usage-price.allowance*c.quantity));assert.equal(h.retail,c.price+h.overage*price.overage);assert.equal(h.netRetail,h.retail-h.serviceCredit);
 const rows=s.business.ledger.filter(e=>e.contract===c.id&&e.period===h.period),retail=rows.filter(e=>e.category==='revenue'),wholesale=rows.filter(e=>e.reason==='wholesale');assert.equal(retail.length,1);assert.equal(wholesale.length,1);assert.equal(retail[0].cents,h.netRetail);assert.equal(retail[0].serviceCredit,h.serviceCredit);assert.equal(wholesale[0].cents,h.wholesale);assert.equal(retail[0].usage,usage);assert.equal(wholesale[0].usage,usage);assert.equal(retail[0].settlementBasis,'period-history-v1');
 const before=JSON.stringify(s);SOC.calculate(s);SOC.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(SOC.restore(before),s);return {h,calls,rows};
}

test('AC-SOC-684 even ordinary Lab demand retains 57 failed service minutes despite final-minute repair and settles actual prior usage',()=>{
 const {s,samples}=period('long'),{h,calls,rows}=reconcile(s,samples,57);assert.deepEqual(samples.filter(x=>x.ready).map(x=>x.at),[60,61,119]);assert.equal(SOC.observe(s,'phone').ready,true);assert.equal(h.readyMinutes,3);assert.equal(h.usage,3);assert.ok(h.serviceCredit>0);assert.equal(calls.at(-1).phase,'resolved');assert.deepEqual(calls.slice(0,2).map(i=>i.usageMinutes),[1,1]);
 const later=tick(s,3);assert.deepEqual(later.business.contracts[0].settlements.find(x=>x.period===h.period),h);assert.deepEqual(later.business.ledger.filter(e=>rows.some(row=>row.id===e.id)),rows);assert.equal(later.business.ledger.filter(e=>e.contract===s.business.contracts[0].id&&e.period===h.period).length,2,'later recovery never reposts or erases the settled bill');
});

test('AC-SOC-685 even final-minute-only outage preserves 59 completed calls and reconciled usage, then fresh real recovery',()=>{
 const {s,samples}=period('last'),{h,calls,rows}=reconcile(s,samples,1);assert.deepEqual(samples.filter(x=>!x.ready).map(x=>x.at),[119]);assert.equal(h.readyMinutes,59);assert.equal(h.usage,59);assert.ok(h.overage>0,'actual calls exceed the bought retail allowance while supplier usage remains charged');assert.equal(calls.at(-1).phase,'failed');const failed=clone(calls.at(-1));
 let recovered=SOC.dispatch(s,{type:'fault',id:'phone',fault:null});recovered=SOC.dispatch(recovered,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'recovery-after-period',durationMinutes:2});assert.equal(recovered.interactions.at(-1).phase,'connected');recovered=tick(recovered,2);assert.equal(recovered.interactions.at(-1).phase,'resolved');assert.equal(recovered.interactions.at(-1).usageMinutes,2);assert.deepEqual(recovered.interactions.find(i=>i.id===failed.id),failed);assert.deepEqual(recovered.business.contracts[0].settlements.find(x=>x.period===h.period),h);assert.deepEqual(recovered.business.ledger.filter(e=>rows.some(row=>row.id===e.id)),rows);assert.deepEqual(SOC.restore(JSON.stringify(recovered)),recovered);
});
