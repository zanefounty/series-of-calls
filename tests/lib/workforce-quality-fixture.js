// Public synthetic commands only. Importing this helper registers no tests.
const assert=require('node:assert/strict'),SOC=require('../../src/game/55-communications');
const histories=new WeakMap();
function apply(s,command){const next=SOC.dispatch(s,command);histories.set(next,[...(histories.get(s)||[]),structuredClone(command)]);return next;}
const send=(s,type,command)=>apply(s,{type,command}),quality=(s,action,fields={})=>send(s,'workforce-quality',{action,...fields});
function tick(s,minutes=1){for(let left=minutes;left>0;left-=Math.min(left,1440))s=apply(s,{type:'advance',minutes:Math.min(left,1440)});return s;}
function base({jurisdiction='AU',tenant,business=true,recording=true}={}){
 let s=SOC.create({scenario:'enterprise',jurisdiction,...(tenant===undefined?{}:{tenant})});histories.set(s,[]);
 for(const [id,config] of [['recorder',{identityMapping:true,...(recording?{}:{enabled:false})}],['people',{operator:'player',people:2,entitlements:2,skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440}],['phone',{routes:[{prefix:'+61',target:'service'}]}]])s=apply(s,{type:'configure',id,config});
 for(const type of [...(business?['business']:[]),'workforce','contact','information'])s=send(s,type,{action:'start'});
 s=send(s,'information',{action:'configure',kind:'pipeline',config:{enabled:false}});return tick(s);
}
function record(s=base(),caseId='quality-first'){
 s=apply(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId});return tick(s,6);
}
function failedRecord(s=base(),{consent=true}={}){
 const security=require('../../content/admission-security.json').reference_fixture;
 s=send(s,'admission-security',{action:'start'});for(const command of security.configures)s=send(s,'admission-security',command);
 s=send(s,'admission-security',{action:'configure',control:'destination',config:{windowSpendLimitCents:2}});
 s=apply(s,{type:'configure',id:'people',config:{wrapMinutes:0}});if(!consent)s=apply(s,{type:'configure',id:'recorder',config:{consent:false}});s=tick(s);
 s=apply(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'quality-failed'});s=tick(s);assert.equal(s.interactions.at(-1).phase,'handling');assert.equal(s.interactions.at(-1).agent,'agent-01');
 s=tick(s);assert.equal(s.interactions.at(-1).outcome,'DESTINATION_WINDOW_LIMIT');return s;
}
const interaction=s=>s.interactions.at(-1),recording=s=>s.records.find(r=>r.kind==='recording'&&r.interaction===interaction(s).id);
function order(s){
 if(!s.business)s=send(s,'business',{action:'start'});
 return send(s,'business',{action:'order',offer:'queueberry-quality',quantity:1,unit:'quality-review',currency:'AUD',resources:['service','recorder','archive'],customer:'customer',supportOwner:'orchard-msp',price:0,sell:true});
}
function pending(s=record()){
 s=order(s);const contract=s.business.contracts.at(-1),contractId=contract.id;s=tick(s,Math.max(1,contract.readyAt-s.clock));s=quality(s,'start');return quality(s,'integrate',{contractId});
}
function ready(s=record()){
 s=tick(pending(s));s=quality(s,'observe-integration',{supplierAvailable:true,applicationAvailable:true});return quality(s,'test-integration');
}
const high={opening:5,verification:5,resolution:5,documentation:5},low={opening:1,verification:2,resolution:3,documentation:4};
function review(s,fields={}){return quality(s,'review',{interactionId:interaction(s).id,reviewer:'supervisor',scores:{...high},...fields});}
function journey({jurisdiction='AU',variant='success'}={}){
 if(!['success','low-score','integration-recovery'].includes(variant))throw new Error('INVALID_QUALITY_FIXTURE_VARIANT');const options={scenario:'enterprise',jurisdiction},rejectedAttempts=[];let s;
 if(variant==='integration-recovery'){
  s=tick(pending(record(base(options))));s=quality(s,'observe-integration',{supplierAvailable:false,applicationAvailable:true});s=quality(s,'test-integration');assert.equal(s.workforceQuality.integration.tests.at(-1).status,'failed');
  const command={type:'workforce-quality',command:{action:'review',interactionId:interaction(s).id,reviewer:'supervisor',scores:{...low}}},before=JSON.stringify(s);let expectedError;
  assert.throws(()=>apply(s,command),error=>{expectedError=error.message;return /^QUALITY_/.test(error.message);});assert.equal(JSON.stringify(s),before);assert.equal((s.business.qualityCharges||[]).length,0);
  rejectedAttempts.push({afterCommandCount:histories.get(s).length,command,expectedError});s=quality(s,'observe-integration',{supplierAvailable:true,applicationAvailable:true});s=quality(s,'test-integration');
 }else s=ready(record(base(options)));
 s=review(s,{scores:variant==='success'?{...high}:{...low}});assert.equal(s.workforceOps.coaching.length,0);const commands=structuredClone(histories.get(s));assert.deepEqual(commands.reduce(SOC.dispatch,SOC.create(options)),s,'quality fixture must replay entirely through public commands');return {options,fixtureOptions:{jurisdiction,variant},commands,rejectedAttempts,expectedState:s};
}

module.exports={SOC,apply,send,quality,tick,base,record,failedRecord,interaction,recording,order,pending,ready,review,high,low,journey};
