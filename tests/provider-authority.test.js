'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const SOC=require('../src/game/55-communications');
function buy(s,stage='base',planId='swift'){
 const command={action:'purchase',offerId:'starter',planId,stage,...(stage==='base'?{}:{customerId:'starter-customer'}),quoteRevision:s.revision};
 return SOC.dispatch(s,{type:'provider',command,requestId:'provider-'+(s.providerRequestSequence+1)});
}
test('PLAY-002 campaign denies world-authoring on direct, nested and worker boundaries',()=>{
 let s=SOC.create({experience:'campaign'});const raw=[{type:'configure',id:'people',config:{people:100}}, {type:'business',command:{action:'loan',cents:20000}},{type:'fault',id:'carrier',fault:'OUTAGE'}, {type:'portfolio',command:{action:'dispatchcustomer',customerId:'starter-customer',command:{type:'configure',id:'people',config:{people:100}}}}];
 for(const command of raw){assert.throws(()=>SOC.dispatch(s,command),/CAMPAIGN_AUTHORING_FORBIDDEN/);assert.throws(()=>SOC.dispatch(s,command,true),/CAMPAIGN_AUTHORING_FORBIDDEN/,'a third argument cannot grant authority');}
 let message;const context={postMessage:x=>message=x};vm.createContext(context);vm.runInContext(SOC.workerSource(),context);context.onmessage({data:{id:1,state:s,command:raw[0]}});assert.match(message.error,/CAMPAIGN_AUTHORING_FORBIDDEN/);
 s=buy(s);const child=s.portfolio.customers[0].root;assert.equal(child.business,undefined);assert.throws(()=>SOC.dispatch(child,{type:'advance',minutes:1}),/CAMPAIGN_AUTHORING_FORBIDDEN/);
});
test('PLAY-003/005 buying is atomic, stale quotes fail and exact retries cannot mint capital',()=>{
 let s=SOC.create({experience:'campaign'});assert.ok(Object.values(s.resources).every(r=>!r.desired.enabled&&!r.effective));
 const quote=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'}),before=JSON.stringify(s);
 const c={type:'provider',requestId:'provider-1',command:{...quote.request,quoteRevision:quote.atRevision}};
 const next=SOC.dispatch(s,c);assert.equal(JSON.stringify(s),before);assert.equal(next.business.balance.cash,s.business.balance.cash-quote.setupCents);
 assert.deepEqual(SOC.dispatch(next,c),next);assert.throws(()=>SOC.dispatch(next,{...c,requestId:'provider-2'}),/STALE_PROVIDER_QUOTE/);
 assert.throws(()=>SOC.dispatch(s,{...c,command:{...c.command,price:1}}),/INVALID_PROVIDER/);
 assert.equal(SOC.restore(JSON.stringify(next)).business.balance.cash,next.business.balance.cash);
 const unknown=structuredClone(next);unknown.experience.version=999;assert.throws(()=>SOC.restore(JSON.stringify(unknown)),/INVALID_EXPERIENCE/);
});
test('PLAY-009 legacy training and explicit Lab saves preserve their separate experience',()=>{
 const training=SOC.create(),lab=SOC.create({experience:'lab',mode:'sandbox'});assert.equal(training.experience.kind,'training');assert.equal(lab.experience.kind,'lab');assert.equal(lab.experience.custom,true);
 const legacy=structuredClone(training);delete legacy.experience;const restored=SOC.restore(JSON.stringify(legacy));assert.equal(restored.experience.kind,'training');assert.equal(legacy.experience,undefined);
});

test('a customer copied through dispatch becomes a separate custom Lab without mutating career cash or authority',()=>{let s=SOC.create({experience:'campaign'});const q=SOC.provider.quote(s,{action:'purchase',offerId:'starter',planId:'swift',stage:'base'});s=SOC.dispatch(s,{type:'provider',command:{...q.request,quoteRevision:q.atRevision}});const before=JSON.stringify(s),lab=SOC.dispatch(s,{type:'copy-to-lab',customerId:'starter-customer'});assert.deepEqual(lab.experience,{version:1,kind:'lab',custom:true});assert.equal(lab.providerCustomer,undefined);assert.equal(lab.providerCampaign,undefined);assert.equal(lab.business,undefined);const authored=SOC.dispatch(lab,{type:'configure',id:'carrier',config:{capacity:9}});assert.equal(authored.resources.carrier.desired.capacity,9);assert.equal(JSON.stringify(s),before);assert.deepEqual(SOC.restore(JSON.stringify(authored)),authored);});

test('campaign save cannot mint opening capital and difficulty has an authored financial consequence',()=>{const easy=SOC.create({experience:'campaign',difficulty:'easy'}),hard=SOC.create({experience:'campaign',difficulty:'hard'});assert.equal(easy.business.balance.cash,2500000);assert.equal(hard.business.balance.cash,1600000);const bad=structuredClone(hard);bad.business.balance.opening+=100000;bad.business.balance.cash+=100000;assert.throws(()=>SOC.restore(JSON.stringify(bad)),/INVALID_PROVIDER_OPENING_CAPITAL/);});
