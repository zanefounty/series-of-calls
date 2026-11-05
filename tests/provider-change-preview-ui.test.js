'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../src/game/93-ui/79-provider-change-preview.js'),'utf8');
function ui(){const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),markers=[];dom.window.N_=key=>{markers.push(key);return key;};dom.window.tr=key=>key;dom.window.eval(source);return {dom,api:dom.window.SOCProviderChangePreview,markers};}
function model(){return {version:1,customerId:'starter-customer',operationId:'migration',mode:'coexistence',cohort:[{id:'bea',present:true,entitled:true,currentPlatform:'phone',targetPlatform:'migration-phone',numbers:[{number:'+61255500201',status:'active',holder:'bea'}]}],activeCalls:[{id:'actual-call',caseId:'retained-case',reasons:['COHORT_PLACEMENT_CHANGE']}],unaffectedActiveCallIds:['alex-call'],room:{dependency:{version:1,resourceId:'phone'},currentGeneration:4,disposition:'retained',activeSessions:[{id:'actual-meeting',reservationHeld:true,reasons:[]}]},obligations:{unchanged:true,remainingMinimumCents:19500,projects:[{id:'paid-project',operationId:'room',setupCents:75000,periodCents:9000,commitmentEndsAt:210,remainingMinimumCents:19500}]},proofRequired:{inboundCalls:['bea'],roomGeneration:true}};}
function freeze(x){if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}

test('migration inspector explains scoped live work and retained supplier terms before technical evidence without commands',()=>{
 const {dom,api}=ui(),m=freeze(model()),before=JSON.stringify(m),host=dom.window.document.createElement('div');host.innerHTML=api.render(m);
 assert.equal(JSON.stringify(m),before);assert.equal(host.querySelector('.provider-change-preview').dataset.customer,'starter-customer');
 assert.match(host.textContent,/bea: phone → migration-phone/);assert.match(host.textContent,/\+61255500201 \(active\)/);assert.match(host.textContent,/identity in the migration cohort/);assert.match(host.textContent,/1 other active calls/);assert.match(host.textContent,/room platform is retained/);assert.match(host.textContent,/phone, current generation 4/);
 assert.ok(host.querySelector('[data-interaction-id="actual-call"]'));assert.ok(host.querySelector('[data-meeting-id="actual-meeting"]'));assert.match(host.textContent,/Capture reservation: Held/);
 assert.match(host.textContent,/A\$750\.00/);assert.match(host.textContent,/A\$90\.00/);assert.match(host.textContent,/210/);assert.match(host.textContent,/Total remaining minimum supplier cost: A\$195\.00/);assert.match(host.textContent,/does not cancel supplier commitments/);
 assert.match(host.textContent,/no fixed outage duration is guaranteed/);assert.match(host.textContent,/project alone does not prove continuity/);assert.match(host.textContent,/actual inbound work/);assert.match(host.textContent,/completed meeting after cutover/);
 assert.equal(host.querySelectorAll('button,input,select,form,[data-provider-action]').length,0,'a preview exposes no mutation path');assert.ok(host.textContent.indexOf('Existing supplier obligations')<host.textContent.indexOf('Technical change evidence'));dom.window.close();
});

test('consolidated and unknown dependency presentations avoid claiming every call fails and escape retained IDs',()=>{
 const {dom,api}=ui(),m=model();m.mode='consolidated';m.operationId='migration-consolidated';m.room.disposition='reconfigured';m.room.activeSessions[0].reasons=['DECLARED_PLATFORM_RECONFIGURED'];m.activeCalls[0]={id:'<img src=x onerror=boom>',caseId:'<script>bad()</script>',reasons:['COHORT_PLACEMENT_CHANGE','DECLARED_PLATFORM_RECONFIGURED']};
 const host=dom.window.document.createElement('div');host.innerHTML=api.render(m);assert.equal(host.querySelector('img,script'),null);assert.match(host.textContent,/platform that this change reconfigures/);assert.match(host.textContent,/still active when its generation changes can fail/);assert.match(host.textContent,/This active meeting uses the platform/);assert.doesNotMatch(host.textContent,/all calls (fail|interrupted)/i);
 m.room.disposition='unproven';m.room.dependency=null;m.room.activeSessions=[];m.activeCalls=[];m.cohort[0].numbers=[];m.cohort[0].present=false;m.cohort[0].entitled=false;host.innerHTML=api.render(m);assert.match(host.textContent,/continuity is unproven/);assert.match(host.textContent,/No actual meeting is active/);assert.match(host.textContent,/No active calls match/);assert.match(host.textContent,/No number assignment/);assert.match(host.textContent,/Identity is not effective/);dom.window.close();
});

test('every visible static label uses the translation marker and unsupported previews render nothing',()=>{
 const {dom,api,markers}=ui();assert.equal(api.render(null),'');assert.equal(api.render({version:2}),'');const keys=Object.values(api.keys);assert.ok(keys.length>30);assert.deepEqual(markers,keys);assert.ok(keys.every(k=>k.startsWith('provider.change.')&&typeof api.labelFallbacks[k]==='string'));dom.window.close();
});
