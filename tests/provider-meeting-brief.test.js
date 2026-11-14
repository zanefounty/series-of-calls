'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications.js');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('AC-SOC-891 the enterprise partner brief and distinct paid join paths appear before room purchase without changing state',()=>{
 let state=SOC.create({experience:'campaign',scenario:'enterprise',difficulty:'easy',seed:73});
 const request={action:'purchase',offerId:'starter',planId:'steady',stage:'base'},quote=SOC.provider.quote(state,request);
 assert.deepEqual(quote.blockers,[]);state=SOC.dispatch(state,{type:'provider',command:{...request,quoteRevision:quote.atRevision}});
 const before=JSON.stringify(state),model=SOC.provider.inspect(state),customer=model.customers[0],brief=customer.meetingBrief;
 assert.deepEqual(brief,{version:1,customerId:'starter-customer',periodIndex:0,at:20,durationMinutes:4,attendees:2,guestId:'partner-jules',guestTenant:'synthetic-partner',deadlineAt:60,requiresRecording:true,meetingPlanVersion:1,selectedMinute:20,availableWindows:[{minute:20,at:20},{minute:40,at:40}],canConfigure:true});
 assert.equal(JSON.stringify(state),before);assert.deepEqual(SOC.provider.inspect(state).customers[0].meetingBrief,brief);
 const methods=customer.meetingActions.map(action=>action.quote.commercial.meetingJoin.method);
 assert.deepEqual(methods,['browser','native','bridge']);
 assert.equal(customer.meetingActions[0].quote.commercial.meetingJoin.supports.recording,false);
 assert.equal(customer.meetingActions[1].quote.commercial.meetingJoin.supports.recording,true);
 const dom=new JSDOM('<!doctype html><body></body>',{runScripts:'dangerously'});try{
  const w=dom.window;w.N_=x=>x;w.SOCProviderCanvas={resourceStatus:()=> 'Observed ready'};for(const file of ['src/game/23-provider-variants.js','src/game/93-ui/70-provider-hud.js','src/game/93-ui/75-provider-panels.js'])w.eval(read(file));
  const host=w.document.body;host.innerHTML=w.SOCProviderPanels.inspector(model,{selection:{customerId:customer.id}});
  const card=host.querySelector('.provider-meeting-brief');assert.ok(card);assert.match(card.textContent,/Partner Jules is available/);assert.match(card.textContent,/minute 20/);assert.match(card.textContent,/recorded meeting/);assert.deepEqual([...card.querySelectorAll('[data-provider-form="meeting-plan"] option')].map(option=>option.value),['20','40']);
  const options=[...card.querySelectorAll('.provider-meeting-option')];assert.equal(options.length,3);assert.deepEqual(options.map(node=>node.dataset.meetingOption),['browser-guest-room','room','cisco-meetings-interoperability']);
  assert.equal(host.querySelectorAll('.provider-meeting-option').length,3,'join paths appear once in the customer inspector');
  assert.equal(JSON.stringify(state),before,'rendering remains pure');
 }finally{dom.window.close();}
});
