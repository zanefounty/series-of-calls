const test=require('node:test'),assert=require('node:assert/strict');
const T=require('../src/game/42-transport');
function state(){const s={clock:0,resources:{identity:{},desk:{}},business:null};s.transport=T.create(s);for(const id of ['office','branch'])T.command(s,{action:'site',id,config:{name:id,region:'AU',domain:id+'-power'}});T.command(s,{action:'link',id:'owned',config:{from:'office',to:'branch',mode:'owned',capacityMbps:1,latencyMs:10,domain:'trench',leadMinutes:1,setupCents:100,periodCents:30,contract:null}});for(let i=0;i<2;i++){s.clock++;T.advance(s);}return s;}
test('transport save validation reconciles repair spares with stock purchases',()=>{
 const s=state();T.command(s,{action:'stock',quantity:1});
 const forged=structuredClone(s);forged.transport.spares=100;
 assert.throws(()=>T.validate(forged),/INVALID_TRANSPORT|UNRECONCILED_TRANSPORT|TRANSPORT_HISTORY/);
});
test('transport save validation prevents replaying an already charged billing period',()=>{
 const s=state();
 for(let i=0;i<58;i++){s.clock++;T.advance(s);}
 assert.equal(s.transport.ledger.filter(x=>x.reason==='transport-period').length,1);
 const replay=structuredClone(s);replay.transport.lastBill=0;
 assert.throws(()=>T.validate(replay),/INVALID_TRANSPORT|UNRECONCILED_TRANSPORT/);
});
test('transport save validation rejects deleting a period invoice and reducing the cost total',()=>{
 const s=state();for(let i=0;i<58;i++){s.clock++;T.advance(s);}
 const forged=structuredClone(s),index=forged.transport.ledger.findIndex(x=>x.reason==='transport-period');
 assert.notEqual(index,-1);const [invoice]=forged.transport.ledger.splice(index,1);forged.transport.totalCosts-=invoice.cents;
 assert.throws(()=>T.validate(forged),/INVALID_TRANSPORT|UNRECONCILED_TRANSPORT|TRANSPORT_HISTORY/);
});
