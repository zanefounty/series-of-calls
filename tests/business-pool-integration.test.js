const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications'),B=SOC.business;
const dispatch=(s,type,command)=>SOC.dispatch(s,{type,...(command?{command}:{})});
function setup(){let s=SOC.dispatch(SOC.create({scenario:'enterprise',jurisdiction:'AU'}),{type:'add',id:'phone-two',kind:'uc'});s=dispatch(s,'business',{action:'start'});s=dispatch(s,'business',{action:'allowancePool',id:'voice-pack',customer:'customer',owner:'orchard-msp',currency:'AUD',unit:'minute',periodMinutes:60,allowance:8});for(let n=0;n<2;n++)s=dispatch(s,'business',{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:[n===0?'phone':'phone-two'],sell:true,allowancePool:'voice-pack'});return s;}
test('AC-SOC-369 SOC commands provision shared allowances and the boundary bill retains wholesale charges once',()=>{
 let s=setup();assert.equal(s.business.allowancePools[0].status,'provisioning');s=SOC.dispatch(s,{type:'advance',minutes:2});s=SOC.dispatch(s,{type:'fault',id:'phone',fault:'OUTAGE'});assert.equal(s.business.allowancePools[0].status,'active');
 const [first,second]=s.business.contracts;B.meterResource(s,'minute',5,['phone']);B.meterResource(s,'minute',5,['phone-two']);s=SOC.dispatch(s,{type:'advance',minutes:60});
 const retail=s.business.ledger.filter(x=>x.category==='revenue'&&x.contract&&x.period!==undefined);assert.equal(retail.length,2);assert.equal(retail.reduce((n,x)=>n+x.overage,0),2);
 const wholesale=s.business.ledger.filter(x=>x.reason==='wholesale');assert.equal(wholesale.length,2);assert.equal(wholesale.reduce((n,x)=>n+x.usage,0),10);assert.equal(new Set(wholesale.map(x=>x.id)).size,2);
 const count=s.business.ledger.filter(x=>x.reason==='wholesale').length;s=SOC.dispatch(s,{type:'advance',minutes:1});assert.equal(s.business.ledger.filter(x=>x.reason==='wholesale').length,count);
});
test('AC-SOC-370 worker advance, save restore and rejected scope commands preserve pool state',()=>{
 let s=SOC.create({scenario:'enterprise',jurisdiction:'AU'});s=SOC.dispatch(s,{type:'business',command:{action:'start'}});s=SOC.dispatch(s,{type:'business',command:{action:'allowancePool',id:'voice-pack',customer:'customer',owner:'orchard-msp',currency:'AUD',unit:'minute',periodMinutes:60,allowance:8}});
 const before=JSON.stringify(s);assert.throws(()=>SOC.dispatch(s,{type:'business',command:{action:'order',offer:'messaging',quantity:100,unit:'message',currency:'AUD',resources:['messages','engage','cases'],sell:true,allowancePool:'voice-pack'}}),/ALLOWANCE_POOL_SCOPE_MISMATCH/);assert.equal(JSON.stringify(s),before);
 s=SOC.dispatch(s,{type:'advance',minutes:2});const expected=SOC.dispatch(s,{type:'advance',minutes:60});let result;const context={postMessage:r=>result=r};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:s,command:{type:'advance',minutes:60}}});assert.deepEqual(JSON.parse(JSON.stringify(result.state)),expected);assert.deepEqual(SOC.restore(JSON.stringify(expected)),expected);
});
