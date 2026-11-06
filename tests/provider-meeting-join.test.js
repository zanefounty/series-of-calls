'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications.js');

test('AC-SOC-818 customer inspector compares actual browser, native and bridge meeting quotes with scoped controls',()=>{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window;
 try{
  w.SOCProviderHud={esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),money:value=>Number.isSafeInteger(value)?`A$${(value/100).toFixed(2)}`:'—'};w.N_=value=>value;w.tr=(key)=>key;
  w.eval(fs.readFileSync(path.join(__dirname,'../src/game/93-ui/75-provider-panels.js'),'utf8'));
  const state=SOC.create({experience:'campaign'}),model=SOC.provider.inspect(state),customer={id:'room-customer',name:'Room tenant',scenario:'enterprise',market:'au-sydney',status:'active',services:[],stages:{},meetingActions:[
   {id:'browser-guest-room',name:'Browser guest meeting room',available:true,blockers:[],quote:{setupCents:12000,periodCents:800,workMinutes:3,engineers:0,support:1,minimumPeriods:1,commercial:{minimumTermPeriods:1,meetingJoin:{version:1,method:'browser',participantCapacity:2,totalLeadMinutes:4,mediaPlacement:'cloud',supports:{recording:false,captions:false,externalGuests:true,events:false},capturePrerequisites:['native platform required'],captionPrerequisites:['caption service required'],retainedCommitments:[]}}}},
   {id:'ms-meetings-room',name:'Native room profile',available:true,blockers:[],quote:{setupCents:65000,periodCents:9000,workMinutes:8,engineers:1,support:1,minimumPeriods:3,commercial:{minimumTermPeriods:3,meetingJoin:{version:1,method:'native',participantCapacity:8,totalLeadMinutes:10,mediaPlacement:'room device',supports:{recording:true,captions:true,externalGuests:true,events:false},capturePrerequisites:['recording service required'],captionPrerequisites:[],retainedCommitments:[{projectId:'provider-project-13',operationId:'ms-meetings-room',periodCents:2000,commitmentEndsAt:240}]}}}},
   {id:'cisco-meetings-interoperability',name:'Interoperability bridge',available:false,blockers:['ROOM_LICENSE_REQUIRED'],quote:{setupCents:40000,periodCents:5000,workMinutes:6,engineers:1,support:1,minimumPeriods:3,commercial:{minimumTermPeriods:3,meetingJoin:{version:1,method:'bridge',participantCapacity:8,totalLeadMinutes:17,mediaPlacement:'bridge',supports:{recording:true,captions:true,externalGuests:true,events:false},capturePrerequisites:['bridge and recorder'],captionPrerequisites:['speech model'],retainedCommitments:[]}}}}
  ]};
  const before=JSON.stringify(customer),html=w.SOCProviderPanels.inspector({...model,customers:[customer]},{selection:{customerId:customer.id}}),host=w.document.createElement('div');host.innerHTML=html;
  assert.equal(JSON.stringify(customer),before,'rendering leaves authored quote and customer data unchanged');
  const cards=[...host.querySelectorAll('[data-meeting-option]')];assert.deepEqual(cards.map(card=>card.dataset.meetingOption),['browser-guest-room','ms-meetings-room','cisco-meetings-interoperability']);
  assert.match(host.textContent,/Browser guest meeting room/);assert.match(host.textContent,/A\$120\.00/);assert.match(host.textContent,/A\$80\.00/);assert.match(host.textContent,/17 sim min/);assert.match(host.textContent,/ms-meetings-room/);assert.match(host.textContent,/provider-project-13/);assert.match(host.textContent,/Minute 240/);assert.match(host.textContent,/ROOM LICENSE REQUIRED/i);
  const buttons=[...host.querySelectorAll('.provider-meeting-option button')];assert.equal(buttons.length,3);assert.equal(buttons[0].dataset.providerAction,'operation');assert.equal(buttons[0].dataset.operation,'browser-guest-room');assert.equal(buttons[0].dataset.id,customer.id);assert.equal(buttons[0].disabled,false);assert.equal(buttons[2].disabled,true);
  assert.match(cards[0].textContent,/Not supported/);assert.match(cards[0].textContent,/External guests/);
  const request={action:'operation',customerId:customer.id,operationId:'integrator-room',config:{version:1,roomMode:'bridge'}},bridge={...customer.meetingActions[2],id:'integrator-room',name:'Integrator-supported room service',available:true,blockers:[],quote:{...customer.meetingActions[2].quote,request,setupCents:65000,periodCents:10000}};
  customer.meetingActions=[bridge];host.innerHTML=w.SOCProviderPanels.inspector({...model,customers:[customer]},{selection:{customerId:customer.id}});
  const bridgeButton=host.querySelector('[data-meeting-option="integrator-room-bridge"] button');assert.ok(bridgeButton);assert.equal(bridgeButton.dataset.operation,'integrator-room');assert.deepEqual(JSON.parse(bridgeButton.dataset.operationConfig),request.config);assert.equal(bridgeButton.disabled,false);
  host.innerHTML=w.SOCProviderPanels.quote(bridge.quote,{quoteRequest:request});assert.match(host.textContent,/retaining the existing licensed bridge/);assert.match(host.textContent,/Existing supplier commitments remain payable/);
  bridge.available=false;bridge.blockers=['PAID_ROOM_BRIDGE_REQUIRED'];host.innerHTML=w.SOCProviderPanels.inspector({...model,customers:[customer]},{selection:{customerId:customer.id}});assert.equal(host.querySelector('[data-meeting-option="integrator-room-bridge"] button').disabled,true);assert.match(host.textContent,/Commission the paid room interoperability product/);

 }finally{w.close();}
});
