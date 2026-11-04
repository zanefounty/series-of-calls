// Public synthetic commands only; importing this helper executes no tests.
const SOC=require('../../src/game/55-communications');
const assert=require('node:assert/strict');
const histories=new WeakMap();
const customers=[{id:'leaver-a',tenant:'tenant-leaver-a',name:'Leaver Sydney',market:'au-sydney',scenario:'enterprise'},{id:'leaver-b',tenant:'tenant-leaver-b',name:'Leaver Melbourne',market:'au-melbourne',scenario:'enterprise'}];
function apply(s,command){const next=SOC.dispatch(s,command);histories.set(next,[...(histories.get(s)||[]),structuredClone(command)]);return next;}
const child=(s,id='leaver-a')=>s.portfolio.customers.find(c=>c.id===id).root;
const nested=(s,id,command)=>apply(s,{type:'portfolio',command:{action:'dispatchcustomer',customerId:id,command}});
const pack=(s,id,type,command)=>nested(s,id,{type,command});
const tick=(s,minutes=1)=>apply(s,{type:'advance',minutes});
const managed=(s,command)=>apply(s,{type:'managed-operations',command});
const person={id:'alex',employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:1,entitlements:['seat-01']};
function setup({jurisdiction='AU',history=true,scopes=['identity'],workforce=false,connectorActions=['deprovision']}={}){
 const markets={AU:['au-sydney','au-melbourne'],US:['us-seattle','us-seattle'],JP:['jp-tokyo','jp-tokyo'],EU:['eu-dublin','eu-dublin']};if(!markets[jurisdiction])throw new Error('INVALID_MANAGED_LEAVER_FIXTURE_JURISDICTION');
 const scopedCustomers=customers.map((c,n)=>({...c,market:markets[jurisdiction][n],...(jurisdiction==='AU'?{}:{name:'Leaver '+(n?'Beta':'Alpha')+' '+jurisdiction})}));
 let s=SOC.create({scenario:'enterprise',jurisdiction});histories.set(s,[]);s=apply(s,{type:'portfolio',command:{action:'start'}});
 for(const customer of scopedCustomers)s=apply(s,{type:'portfolio',command:{action:'addcustomer',...customer}});
 for(const customer of scopedCustomers){const id=customer.id;
  s=pack(s,id,'business',{action:'start'});s=pack(s,id,'estate',{action:'start'});
  s=pack(s,id,'estate',{action:'discover',items:[{sourceKey:'directory-alex',kind:'user',observedId:id+'-alex',confidence:1,conflicts:[],unknowns:[]}]});
  s=pack(s,id,'estate',{action:'link',sourceKey:'directory-alex',canonicalId:'identity',resource:'identity'});
  s=pack(s,id,'estate',{action:'connector',connector:{id:'leaver-sync',actions:connectorActions,resourceKinds:['user'],version:1,localDependency:false}});
  s=pack(s,id,'estate',{action:'recover',connector:'leaver-sync',authenticated:true,delegated:true,reachable:true});
  s=pack(s,id,'business',{action:'order',offer:'managed-operations',quantity:1,unit:'managed-operation',currency:'AUD',resources:id==='leaver-a'?scopes:['identity'],customer:'customer',supportOwner:'orchard-msp',price:0,sell:true});
 }
 s=tick(s,2);
 if(workforce)s=addWorkforce(s);
 if(history)s=acceptedHistory(s);
 return managed(s,{action:'start'});
}
function addWorkforce(s,id='leaver-a'){
 s=nested(s,id,{type:'configure',id:'people',config:{operator:'player',people:1,entitlements:1,skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440}});
 s=nested(s,id,{type:'configure',id:'phone',config:{routes:[{prefix:'+61',target:'service'}]}});
 s=pack(s,id,'workforce',{action:'start'});s=pack(s,id,'workforce',{action:'roster',people:[structuredClone(person)],operator:'player'});return tick(s);
}
function acceptedHistory(s,id='leaver-a'){
 s=pack(s,id,'channels',{action:'start'});s=nested(s,id,{type:'configure',id:'engage',config:{template:'service-outside-window',botResolves:false}});
 s=pack(s,id,'operations',{action:'configure',kind:'workflow',config:{deliveryReceipts:false}});s=tick(s);
 for(const channel of SOC.channels.channels)s=pack(s,id,'channels',{action:'observe',channel,authenticated:true,providerAvailable:true,fault:null});
 s=pack(s,id,'channels',{action:'permission',tenant:child(s,id).tenant,person:'alex',channel:'chatterleaf',purpose:'service',granted:true,expiresAt:null});
 s=nested(s,id,{type:'interact',channel:'message',from:'alex',to:'service',caseId:'historic-alex',account:'chatterleaf',purpose:'service',template:'service-outside-window'});s=tick(s);
 const job=child(s,id).operations.jobs.at(-1);if(job.status!=='accepted')throw new Error('FIXTURE_CHANNEL_NOT_ACCEPTED');
 s=tick(s);s=pack(s,id,'operations',{action:'receipt',job:job.id,eventId:'historic-delivery',signature:'synthetic-valid'});return s;
}
function participant(s,id='leaver-a'){
 const c=child(s,id),contract=c.business.contracts.find(x=>x.offer==='managed-operations'&&x.status==='active'),config=structuredClone(c.resources.identity.desired);
 if(!contract)throw new Error('FIXTURE_MANAGED_CONTRACT_NOT_ACTIVE');config.identities=config.identities.filter(x=>x!=='alex');config.entitled=config.entitled.filter(x=>x!=='alex');
 return {customerId:id,contractId:contract.id,connector:'leaver-sync',operation:'leaver',items:[{resource:'identity',config,revocations:['identity']}]};
}
function submit(s,participants=[participant(s)],id='managed-leaver'){return managed(s,{action:'submit',id,participants});}
function retry(s,job='managed-leaver',customerId='leaver-a'){return managed(s,{action:'retry',job,customerId});}
function journey({jurisdiction='AU',variant='success'}={}){
 if(!['success','connector-recovery'].includes(variant))throw new Error('INVALID_MANAGED_LEAVER_FIXTURE_VARIANT');
 const options={scenario:'enterprise',jurisdiction};let s=submit(setup({jurisdiction}));
 if(variant==='connector-recovery'){
  s=pack(s,'leaver-a','estate',{action:'fault',connector:'leaver-sync',fault:'OUTAGE'});s=tick(s);
  assert.equal(s.managedOperations.jobs[0].participants[0].items[0].status,'blocked');
  s=pack(s,'leaver-a','estate',{action:'fault',connector:'leaver-sync',fault:null});s=tick(s,2);
  assert.equal(s.managedOperations.jobs[0].participants[0].items[0].status,'blocked');s=retry(s);s=tick(s);
 }else s=tick(s,2);
 s=nested(s,'leaver-a',{type:'interact',channel:'message',from:'alex',to:'service',caseId:'retired-alex',account:'chatterleaf',purpose:'service',template:'service-outside-window'});
 const c=child(s);assert.equal(c.interactions.at(-1).outcome,'UNKNOWN_CALLER');assert.equal(c.business.managedCharges.length,1);assert.equal(c.channels.acceptances.length,1);assert.equal(c.channels.receipts.length,1);assert.equal(c.cases['historic-alex'].identity,'alex');
 const commands=structuredClone(histories.get(s));assert.deepEqual(commands.map(x=>x),s.commands.map(row=>row.command));assert.deepEqual(commands.reduce(SOC.dispatch,SOC.create(options)),s,'fixture public commands must reproduce the full root');
 return {options,fixtureOptions:{jurisdiction,variant},commands,expectedState:s};
}
module.exports={SOC,customers,apply,child,nested,pack,tick,managed,person,setup,addWorkforce,acceptedHistory,participant,submit,retry,journey};
