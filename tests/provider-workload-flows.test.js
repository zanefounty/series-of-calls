const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..','src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function boot(){
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'dangerously'}),w=dom.window;
 w.W=2000;w.H=1000;w.CITY={syd:{x:1860,y:790}};
 w.eval(read('game/93-ui/70-provider-hud.js'));
 w.eval(read('game/96-map/90-service-scene.js'));
 w.eval(read('game/96-map/95-provider-canvas.js'));
 return {dom,w};
}

function modelFor(journeys){
 return {clock:18,customers:[{id:'orchard',name:'Orchard Repairs',market:'au-sydney',status:'active',services:[
  {id:'phone',name:'Canopy calling',kind:'uc',observed:{ready:true}},
  {id:'carrier',name:'Harbour carrier',kind:'connectivity',observed:{ready:true}},
  {id:'service-queue',name:'Repair queue',kind:'queue',observed:{ready:true}},
  {id:'endpoint',name:'Counter endpoint',kind:'endpoint',observed:{ready:true}},
  {id:'room',name:'Harbour meeting room',kind:'room',observed:{ready:true}}
 ],journeys}],projects:[],offers:[],events:[]};
}

const completedJourney=()=>({id:'job-41',channel:'voice',caseId:'case-41',arrivalAt:0,deadlineAt:30,status:'completed',trace:[
 {at:2,code:'CALL_REQUEST',platform:'phone'},
 {at:3,code:'ORDERED_ROUTE',target:'endpoint'},
 {at:4,code:'CARRIER_PATH_ADMITTED',carrier:'carrier'},
 {at:5,code:'ENQUEUED',queue:'service-queue'},
 {at:6,code:'AGENT_ASSIGNED',agent:'alex'},
 {at:12,code:'WRAP_UP'},
 {at:13,code:'RESOLVED'}
]});

test('[AC860] workload projection is pure, stable, and only follows resources and outcomes evidenced by a real journey trace',()=>{
 const {w}=boot();try{
  const model=modelFor([completedJourney()]),before=JSON.stringify(model),scene=w.SOCServiceScene.project(model),customer=scene.customers[0],flow=customer.workloadFlows[0];
  assert.equal(JSON.stringify(model),before,'scene projection does not mutate simulation input');
  assert.equal(flow.flowId,'job-41');assert.equal(flow.id,'orchard:workload-flow:job-41');
  assert.equal(flow.startedAt,2);assert.equal(flow.finishedAt,13);assert.equal(flow.delivered,true);assert.equal(flow.failed,false);
  assert.deepEqual(Array.from(flow.path,x=>x.resourceId),['phone','carrier','endpoint','service-queue']);
  assert.ok(flow.path.every(x=>customer.services.some(r=>r.id===x.resourceId)),'each path endpoint is an actual customer resource');
  assert.equal(flow.destinationResourceId,'endpoint','destination is only the observed routing target');
  assert.ok(flow.edges.length>0);assert.ok(flow.edges.every(x=>x.type==='workload-flow'&&x.flowId==='job-41'));
  assert.ok(flow.edges.every(x=>x.evidenceCodes.includes('RESOLVED')));
  assert.ok(scene.edges.some(x=>x.id==='orchard:workload-flow:job-41:path:phone:carrier'&&x.from==='orchard:phone'&&x.to==='orchard:carrier'));
 }finally{w.close();}
});

test('[AC861] failed and still-running work keep real failure/progress and never gain a made-up destination or completion',()=>{
 const {w}=boot();try{
  const failed={id:'job-failed',channel:'voice',caseId:'case-failed',arrivalAt:1,status:'failed',failure:'CARRIER_CAPACITY',trace:[
   {at:2,code:'CALL_REQUEST',platform:'phone'},
   {at:3,code:'CARRIER_PATH_ADMITTED',carrier:'carrier'},
   {at:4,code:'CALL_FAILED',reason:'CARRIER_CAPACITY'}
  ]};
  const pending={id:'job-pending',channel:'voice',arrivalAt:6,status:'pending',trace:[{at:7,code:'CALL_REQUEST',platform:'unknown-platform'}]};
  const scene=w.SOCServiceScene.project(modelFor([failed,pending])),[bad,waiting]=scene.workloadFlows;
  assert.equal(bad.failed,true);assert.equal(bad.delivered,false);assert.equal(bad.failure,'CARRIER_CAPACITY');assert.equal(bad.finishedAt,4);
  assert.equal(waiting.delivered,false);assert.equal(waiting.failed,false);assert.equal(waiting.finishedAt,null);assert.equal(waiting.destinationResourceId,null);assert.deepEqual(Array.from(waiting.path),[]);assert.equal(waiting.edges.length,0);
  assert.ok(bad.edges.length>0);assert.ok(bad.edges.every(x=>x.failed&&x.delivered===false));
  assert.ok(bad.edges.every(x=>!x.evidenceCodes.includes('RESOLVED')));
 }finally{w.close();}
});

test('[AC862] workloads layer renders stable keyboard-selectable paths and event-derived status without changing model or geometry',()=>{
 const {w}=boot();try{
  const model=modelFor([completedJourney()]),view={layer:'workloads',selection:{customerId:'orchard'},camera:{x:0,y:0,zoom:1}},before=JSON.stringify(model),scene=w.SOCServiceScene.project(model),edge=scene.edges.find(x=>x.type==='workload-flow'),html=w.SOCProviderCanvas.render(model,view),holder=w.document.createElement('div');holder.innerHTML=html;
  const query=`[data-provider-action="select-path"][data-id="${edge.id}"]`,path=holder.querySelector(query);
  assert.ok(path,'actual workload route is selectable');assert.equal(path.getAttribute('role'),'button');assert.equal(path.getAttribute('tabindex'),'0');assert.equal(path.getAttribute('data-workload-flow'),'job-41');
  assert.ok(path.classList.contains('is-effective'));assert.match(path.getAttribute('aria-label'),/Delivered/);
  assert.match(holder.querySelector('.provider-map-node').textContent,/1 journeys/);assert.match(holder.querySelector('.provider-map-node').textContent,/Delivered/);
  const geometry=path.getAttribute('d');model.customers[0].journeys[0].trace.at(-1).code='WRAP_UP';model.customers[0].journeys[0].status='pending';const beforeRender=JSON.stringify(model);
  const updated=w.document.createElement('div');updated.innerHTML=w.SOCProviderCanvas.render(model,view);const pending=updated.querySelector(query);
  assert.ok(pending.classList.contains('is-pending'));assert.equal(pending.getAttribute('d'),geometry,'same observed route retains its map geometry as status changes');
  assert.equal(JSON.stringify(model),beforeRender,'renderer is read only');assert.notEqual(JSON.stringify(model),before,'test mutation was outside the renderer');
 }finally{w.close();}
});

test('[AC863] failed journey remains selectable with its actual failure and resource pressure evidence',()=>{
 const {w}=boot();try{
  const journey={...completedJourney(),status:'failed',failure:'CARRIER_CAPACITY',trace:[{at:2,code:'CALL_REQUEST',platform:'phone'},{at:3,code:'CARRIER_PATH_ADMITTED',carrier:'carrier'},{at:4,code:'CALL_FAILED',reason:'CARRIER_CAPACITY'}]},model=modelFor([journey]),scene=w.SOCServiceScene.project(model),edge=scene.edges.find(x=>x.type==='workload-flow'),holder=w.document.createElement('div');holder.innerHTML=w.SOCProviderCanvas.render(model,{layer:'workloads',selection:{customerId:'orchard'},camera:{}});
  const path=holder.querySelector(`[data-provider-action="select-path"][data-id="${edge.id}"]`);
  assert.ok(path);assert.ok(path.classList.contains('is-failed'));assert.match(path.getAttribute('aria-label'),/Failed/);
  assert.equal(edge.failure,'CARRIER_CAPACITY');assert.equal(edge.finishedAt,4);assert.equal(edge.delivered,false);
  assert.match(holder.querySelector('.provider-map-node').textContent,/CARRIER_CAPACITY/);
 }finally{w.close();}
});

test('[AC864] channel delivery is earned by its delivery trace and stale completed totals cannot invent success',()=>{
 const {w}=boot();try{
  const delivered={id:'message-7',channel:'message',caseId:'case-message-7',arrivalAt:2,status:'completed',completedAt:20,trace:[{at:3,code:'CHANNEL_ACCEPTED'},{at:8,code:'CHANNEL_DELIVERY_RECORDED'}]},stale={id:'message-stale',channel:'message',arrivalAt:9,status:'completed',completedAt:20,trace:[{at:10,code:'CHANNEL_ACCEPTED'}]},scene=w.SOCServiceScene.project(modelFor([delivered,stale]));
  assert.equal(scene.workloadFlows[0].delivered,true);assert.equal(scene.workloadFlows[0].finishedAt,8);
  assert.equal(scene.workloadFlows[1].delivered,false);assert.equal(scene.workloadFlows[1].finishedAt,null);
 }finally{w.close();}
});

test('[MAP-01] native meeting sessions project room and actual platform dependencies without synthesizing a call-resolution event',()=>{
 const {w}=boot();try{
  const meeting={id:'mission-meeting-2',bookingId:'booking-2',roomId:'room',status:'completed',scheduledAt:4,startedAt:8,endsAt:17,endedAt:17,reasons:[],platformDependency:{resourceId:'phone',ready:true},captureRecordId:'recording-2',audit:[]},model=modelFor([]);
  model.customers[0].meetingJourneys=[{id:'mission-meeting-2',sourceKind:'mission-meeting',channel:'meeting',arrivalAt:4,deadlineAt:null,status:'completed',failure:null,meeting,trace:[]}];
  const scene=w.SOCServiceScene.project(model),flow=scene.workloadFlows[0];
  assert.equal(flow.delivered,true);assert.equal(flow.finishedAt,17);assert.equal(flow.meeting.id,'mission-meeting-2');assert.deepEqual(Array.from(flow.path,x=>x.resourceId),['phone','room']);
  assert.equal(flow.trace.some(t=>t.code==='RESOLVED'),false,'meeting evidence remains the actual meeting summary');
  assert.ok(scene.edges.some(e=>e.type==='workload-flow'&&e.from==='orchard:phone'&&e.to==='orchard:room'));
  const holder=w.document.createElement('div');holder.innerHTML=w.SOCProviderCanvas.render(model,{layer:'workloads',selection:{customerId:'orchard'},camera:{}});
  const journeyButton=holder.querySelector('button.provider-workload-journey[data-workload-flow="mission-meeting-2"]');assert.ok(journeyButton,'touch target selects the retained meeting');assert.equal(journeyButton.getAttribute('data-provider-action'),'select-path');assert.ok(Number.parseFloat(journeyButton.style.minHeight)>=44);
 }finally{w.close();}
});

test('[MAP-02] active workload motion is decorative, preference-gated, and parallel journey controls stay individually selectable',()=>{
 const {w}=boot();try{
  const first={...completedJourney(),status:'pending',trace:completedJourney().trace.slice(0,5)},second={...first,id:'job-42',caseId:'case-42'},model=modelFor([first,second]),view={layer:'workloads',selection:{customerId:'orchard'},camera:{},preferences:{animation:true,reducedMotion:false}};
  const html=w.SOCProviderCanvas.render(model,view),holder=w.document.createElement('div');holder.innerHTML=html;
  assert.equal(holder.querySelectorAll('button.provider-workload-journey[data-workload-flow]').length,2,'each retained journey has a dedicated touch selection control');
  const paths=[...holder.querySelectorAll('.provider-workload-path')];assert.equal(paths.length,6);assert.notEqual(paths[0].getAttribute('d'),paths[3].getAttribute('d'),'parallel same-resource routes receive separate lanes');
  assert.ok(holder.querySelector('animateMotion'),'active real trace displays a decorative particle');
  const still=w.document.createElement('div');still.innerHTML=w.SOCProviderCanvas.render(model,{...view,preferences:{animation:false,reducedMotion:false}});assert.equal(still.querySelector('animateMotion'),null);
  const reduced=w.document.createElement('div');reduced.innerHTML=w.SOCProviderCanvas.render(model,{...view,preferences:{animation:true,reducedMotion:true}});assert.equal(reduced.querySelector('animateMotion'),null);
  w.matchMedia=()=>({matches:true});const operatingSystemReduced=w.document.createElement('div');operatingSystemReduced.innerHTML=w.SOCProviderCanvas.render(model,{...view,preferences:{animation:true,reducedMotion:false}});assert.equal(operatingSystemReduced.querySelector('animateMotion'),null,'system reduced-motion preference is honored even with default saved settings');
 }finally{w.close();}
});

test('[MAP-03] geography layer caption names geography rather than reusing the services caption',()=>{
 const {w}=boot();try{
  const holder=w.document.createElement('div');holder.innerHTML=w.SOCProviderCanvas.render({customers:[],offers:[],events:[]},{layer:'geography',selection:null,camera:{}});
  assert.match(holder.querySelector('.provider-world-layers span').textContent,/geography view/i);
 }finally{w.close();}
});
