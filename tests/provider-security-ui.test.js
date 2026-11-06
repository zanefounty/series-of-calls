'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
function fixture(language='en'){
 const dom=new JSDOM('<!doctype html><main></main>',{runScripts:'dangerously'}),w=dom.window;
 w.N_=value=>value;w.eval(fs.readFileSync(path.join(ROOT,language==='en'?'src/i18n/en.js':`site/i18n/${language}.js`),'utf8'));
 w.tr=(key,vars)=>String(w.I18N[language][key]||key).replace(/\{(\w+)\}/g,(match,name)=>vars?.[name]??match);
 w.SOCProviderCanvas={resourceStatus:()=> 'Ready'};
 for(const file of ['93-ui/70-provider-hud.js','93-ui/74-provider-security.js','93-ui/79-provider-context-actions.js','96-map/90-service-scene.js','93-ui/75-provider-panels.js'])w.eval(fs.readFileSync(path.join(ROOT,'src/game',file),'utf8'));
 return {dom,w,host:w.document.querySelector('main')};
}
const controls={
 network:{id:'provider-security-network',plans:{'edge-basic':{capacityPps:1000,mitigationPps:10000,activationMode:'always'},'edge-resilient':{capacityPps:5000,mitigationPps:50000,activationMode:'always'}}},
 sip:{id:'provider-security-sip',plans:{'sip-standard':{attemptsPerSecond:10,maxMessageBytes:2048,allowedMethods:['INVITE'],requireAuthenticatedPeer:true},'sip-restricted':{attemptsPerSecond:5,maxMessageBytes:1024,allowedMethods:['INVITE'],requireAuthenticatedPeer:true}}},
 destination:{id:'provider-security-destination',plans:{'australia-guard':{allowedPrefixes:['+61'],perCallMaxCents:100,windowSpendLimitCents:120,windowMinutes:60},'australia-tight-guard':{allowedPrefixes:['+61'],perCallMaxCents:20,windowSpendLimitCents:30,windowMinutes:60}}}
};
function offers(customerId='customer-a'){
 const rows=[];
 for(const [control,definition] of Object.entries(controls))for(const [planId,nativeConfig] of Object.entries(definition.plans)){
  const setupCents=planId==='edge-basic'?26000:planId==='edge-resilient'?42000:planId==='sip-standard'?18000:planId==='sip-restricted'?26000:planId==='australia-guard'?14000:22000;
  const periodCents=planId==='edge-basic'?6000:planId==='edge-resilient'?9500:planId==='sip-standard'?4500:planId==='sip-restricted'?6500:planId==='australia-guard'?3500:6000;
  const operationId=definition.id,plan={control,planId,nativeConfig},security={plan,totalMinimumSetupCents:planId==='edge-resilient'?74000:planId==='sip-restricted'?66000:planId==='australia-tight-guard'?66000:58000,totalMinimumPeriodCents:planId==='edge-resilient'?17500:planId==='sip-restricted'?16000:planId==='australia-tight-guard'?16500:14000,nativeUsageCentsPerMinute:2,providerWholesaleUsageSeparate:true,interruptionStartsAtPurchase:true};
  rows.push({id:operationId,operationId,securityControl:control,planId,selection:{planId},name:planId,setupCents,periodCents,workMinutes:planId.includes('resilient')?8:5,engineers:1,support:1,available:true,quote:{action:'operation',request:{action:'operation',operationId,customerId,config:{planId}},setupCents,periodCents,workMinutes:5,engineers:1,support:1,blockers:[],commercial:{security}}});
 }
 return rows;
}
function model(){
 const customer={id:'customer-a',name:'Canopy Mutual',market:'au-sydney',scenario:'smb',status:'active',security:{version:1,customerId:'customer-a',requiredControlCount:3,effectiveControlCount:0,voiceAdmissionReady:false,nativePackStarted:false,voiceAdmissionBlocked:false,controls:{network:{status:'not-purchased'},sip:{status:'not-purchased'},destination:{status:'not-purchased'}}},services:['carrier','phone','access','archive'].map(id=>({id,name:id,desired:{},effective:{capacity:4},provisioning:{status:'ready'},observed:{ready:true}}))};
 return {clock:20,customers:[customer],operations:[{id:'provider-security-network',name:'Edge packet scrubbing',kind:'operation'},{id:'provider-security-sip',name:'Authenticated SIP admission',kind:'operation'},{id:'provider-security-destination',name:'Destination guard',kind:'operation'},{id:'repair',kind:'operation',setupCents:1000}],contextualOperations:offers(),projects:[],incidents:[],offers:[]};
}
function inspect(f,m,serviceId){f.host.innerHTML=f.w.SOCProviderPanels.inspector(m,{selection:{customerId:'customer-a',...(serviceId?{serviceId}:{})}});return f.host;}

test('AC-SOC-782 contextual paid security comparison is reachable from customer and service selections',()=>{
 const f=fixture(),m=model(),before=JSON.stringify(m);
 for(const serviceId of [undefined,'carrier','phone','access']){
  const host=inspect(f,m,serviceId),panel=host.querySelector('[data-provider-security]');assert.ok(panel,`security comparison should render for ${serviceId||'customer'} selection`);
  assert.equal(panel.querySelectorAll('[data-security-control]').length,3);
  for(const control of ['network','sip','destination'])assert.equal(panel.querySelectorAll(`[data-security-offer^="${control}:"]`).length,2);
  assert.match(panel.textContent,/Ordinary voice admission continues until you begin the first paid control purchase/);assert.match(panel.textContent,/Before the first control purchase, drain active calls/);assert.match(panel.textContent,/Minimum combined three-control commitment: A\$580 setup · A\$140 \/ period/);
  assert.match(panel.querySelector('[data-security-offer="sip:sip-standard"]').textContent,/10 attempts per second/);assert.match(panel.querySelector('[data-security-offer="sip:sip-standard"]').textContent,/2,048 bytes/);assert.match(panel.querySelector('[data-security-offer="destination:australia-guard"] .provider-security-native').textContent,/60 minutes/);assert.match(panel.querySelector('[data-security-offer="network:edge-basic"]').textContent,/Always/);
  const button=panel.querySelector('[data-operation="provider-security-network"]');assert.ok(button);assert.equal(button.dataset.id,'customer-a');assert.deepEqual(JSON.parse(button.dataset.operationConfig),{planId:'edge-basic'});assert.equal(button.dataset.providerAction,'operation');
  assert.equal(host.querySelectorAll('.provider-more-actions [data-operation^="provider-security-"]').length,0,'security controls stay out of generic action lists');
 }
 inspect(f,m,'archive');assert.equal(f.host.querySelector('[data-provider-security]'),null,'unrelated service selections do not offer security purchases');
 f.host.innerHTML=f.w.SOCProviderPanels.rail({...m,operations:m.operations},{drawer:'operations',selection:{customerId:'customer-a'}});
 assert.equal(f.host.querySelectorAll('[data-operation^="provider-security-"]').length,0,'unconfigured global operations never expose customer security purchases');
 const onDemand=structuredClone(m);onDemand.contextualOperations.find(row=>row.planId==='edge-basic').quote.commercial.security.plan.nativeConfig.activationMode='on-demand';inspect(f,onDemand);assert.match(f.host.querySelector('[data-security-offer="network:edge-basic"]').textContent,/On demand/);
 const partial=structuredClone(m);partial.customers[0].security.nativePackStarted=true;partial.customers[0].security.voiceAdmissionBlocked=true;partial.customers[0].security.effectiveControlCount=1;partial.customers[0].security.controls.network={status:'effective',planId:'edge-basic'};inspect(f,partial);assert.match(f.host.querySelector('[data-provider-security]').textContent,/A partial deployment blocks voice admission/,'a partial installation remains visibly unable to admit voice');
 assert.equal(JSON.stringify(m),before,'all contextual UI rendering is pure');f.dom.window.close();
});

test('AC-SOC-783 security quotes show paid interruption, aggregate costs, selected native limits and readable blockers',()=>{
 const f=fixture(),m=model(),before=JSON.stringify(m),rows=offers(),first=rows.find(row=>row.planId==='edge-basic'),saved=JSON.stringify(first.quote);
 f.host.innerHTML=f.w.SOCProviderPanels.quote(first.quote,{});assert.equal(f.host.querySelector('#quote-title').textContent,'Network packet filtering');
 assert.match(f.host.textContent,/Edge Basic/);assert.match(f.host.textContent,/This first purchase requires active calls to be drained/);assert.match(f.host.textContent,/Minimum combined three-control commitment: A\$580 setup · A\$140 \/ period/);assert.match(f.host.textContent,/A\$0\.02 per voice minute/);assert.match(f.host.textContent,/Provider wholesale usage is billed separately/);assert.match(f.host.textContent,/1,000 PPS/);assert.match(f.host.textContent,/10,000 PPS/);assert.equal(JSON.stringify(first.quote),saved,'the renderer does not modify quote evidence');
 const blocked={...first.quote,blockers:['SECURITY_ACTIVE_CALLS']};f.host.innerHTML=f.w.SOCProviderPanels.quote(blocked,{});assert.equal(f.host.querySelector('[data-provider-action="confirm-quote"]').disabled,true);assert.match(f.host.textContent,/active calls to be drained/);assert.doesNotMatch(f.host.textContent,/SECURITY_ACTIVE_CALLS/);
 const premium=rows.find(row=>row.planId==='edge-resilient');f.host.innerHTML=f.w.SOCProviderPanels.quote(premium.quote,{});assert.match(f.host.textContent,/Minimum combined three-control commitment: A\$740 setup · A\$175 \/ period/,'quote totals must reflect the selected premium plan');
 const invalid={...first,available:false,blockers:['SECURITY_CONTROL_ALREADY_ORDERED'],quote:{...first.quote,blockers:['SECURITY_CONTROL_ALREADY_ORDERED']}};const blockedRows=[...rows.filter(row=>row!==first),invalid];m.contextualOperations=blockedRows;f.host.innerHTML=f.w.SOCProviderPanels.inspector(m,{selection:{customerId:'customer-a'}});const button=f.host.querySelector('[data-security-offer="network:edge-basic"] button');assert.equal(button.disabled,true);assert.match(f.host.querySelector('[data-security-offer="network:edge-basic"]').textContent,/This control already has a funded purchase/);assert.doesNotMatch(f.host.querySelector('[data-security-offer="network:edge-basic"]').textContent,/project in progress/);m.contextualOperations=rows;assert.equal(JSON.stringify(m),before,'displaying a blocked quote cannot claim installation or mutate the customer model');
 f.dom.window.close();
});


test('AC-SOC-809 the selected customer shows observed attacks separately from later delivered voice without mutating evidence',()=>{
 const f=fixture(),m=model();m.customers[0].security.abuse=[{at:41,status:'waiting-for-delivery',filteredPackets:7500,blockedInteractionId:'interaction-12',eventIds:{destination:'security-event-7'},deliveredAt:null,jobId:null}];
 const before=JSON.stringify(m);inspect(f,m);let panel=f.host.querySelector('[data-security-abuse]');assert.ok(panel);assert.match(panel.textContent,/7,500 PPS/);assert.match(panel.textContent,/Resume time/);assert.doesNotMatch(panel.textContent,/actual voice usage settled once/);assert.equal(JSON.stringify(m),before);
 m.customers[0].security.abuse[0]={...m.customers[0].security.abuse[0],status:'delivered',deliveredAt:48,jobId:'provider-job-19'};const completed=JSON.stringify(m);inspect(f,m);panel=f.host.querySelector('[data-security-abuse]');assert.match(panel.textContent,/finished at minute 48/);assert.match(panel.textContent,/actual voice usage settled once/);assert.match(panel.querySelector('details').textContent,/provider-job-19/);assert.equal(JSON.stringify(m),completed);f.dom.window.close();
});
