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
 w.eval(read('game/93-ui/79-provider-context-actions.js'));
 w.eval(read('game/93-ui/79-provider-resilience.js'));
 w.eval(read('game/93-ui/75-provider-panels.js'));
 return {dom,w};
}

function transport(overrides={}){
 return {
  version:1,
  sites:[
   {id:'orchard-head',name:'Orchard head office',region:'AU',domain:'metro',powerDomain:'east-power',provisioning:{status:'ready',due:10,generation:1},desiredGeneration:1,effective:{generation:1,ready:true,config:{name:'Orchard head office'}},observed:{available:true,power:true,domainFailed:false,ready:true}},
   {id:'orchard-branch',name:'Orchard service branch',region:'AU',domain:'metro',powerDomain:'west-power',provisioning:{status:'ready',due:10,generation:1},desiredGeneration:1,effective:{generation:1,ready:true,config:{name:'Orchard service branch'}},observed:{available:true,power:true,domainFailed:false,ready:true}}
  ],
  links:[
   {id:'orchard-primary',from:'orchard-head',to:'orchard-branch',domain:'metro',provisioning:{status:'ready',due:18,generation:1},desiredGeneration:1,effective:{generation:1,capacityMbps:20,latencyMs:18},observed:{available:true,power:true,domainFailed:false,ready:true},usage:{occupiedKbps:640,remainingKbps:19360}},
   {id:'orchard-backup',from:'orchard-head',to:'orchard-branch',domain:'metro',provisioning:{status:'ready',due:20,generation:1},desiredGeneration:1,effective:{generation:1,capacityMbps:20,latencyMs:22},observed:{available:false,power:true,domainFailed:false,ready:false},usage:{occupiedKbps:0,remainingKbps:20000}}
  ],
  bindings:[{resource:'identity',site:'orchard-head'},{resource:'carrier',site:'orchard-head'},{resource:'service',site:'orchard-branch'},{resource:'desk',site:'orchard-branch'},{resource:'room',site:'orchard-branch'}],
  domains:[{id:'metro',failed:false}],
  paths:{primary:{ready:true,edges:['orchard-primary'],latencyMs:18,kbps:160},diverse:{ready:false,edges:[],latencyMs:null,kbps:160}},
  ...overrides
 };
}

function customer(t=transport()){
 return {id:'orchard',name:'Orchard Repairs',market:'au-sydney',transport:t,services:['identity','carrier','service','desk','room'].map(id=>({id,kind:id,desired:{},provisioning:{status:'ready'},effective:{enabled:true},observed:{ready:true}}))};
}

test('Provider scene projects stable selectable transport objects and typed paths without mutating measured input',()=>{
 const {w}=boot(),model={customers:[customer()]},before=JSON.stringify(model),scene=w.SOCServiceScene.project(model),c=scene.customers[0];
 assert.equal(JSON.stringify(model),before,'projection remains pure');
 assert.equal(c.transportScene.sites[0].id,'orchard:transport-site:orchard-head');
 assert.equal(c.transportScene.sites[0].ready,true,'ready mirrors the explicit observed state');
 assert.equal(c.transportScene.links[0].id,'orchard:transport-link:orchard-primary');
 assert.equal(c.transportScene.links[0].ready,true);
 assert.equal(c.transportScene.links[0].capacityKbps,20000,'20 Mbps is represented as 20,000 Kbps');
 assert.equal(c.transportScene.links[0].effective.generation,1);
 assert.equal(c.transportScene.links[0].desiredGeneration,1);
 assert.ok(scene.edges.some(edge=>edge.id==='orchard:transport-path:orchard-primary'&&edge.type==='transport-path'&&edge.from==='orchard:transport-site:orchard-head'&&edge.to==='orchard:transport-site:orchard-branch'&&edge.ready));
 assert.ok(scene.edges.some(edge=>edge.id==='orchard:transport-binding:service'&&edge.type==='transport-binding'&&edge.to==='orchard:transport-site:orchard-branch'));
 assert.ok(scene.objects.some(object=>object.id==='orchard:transport-link:orchard-primary'&&object.objectType==='transport-link'));
 w.close();
});

test('Provider map exposes site controls and selectable path edges with actual failed state',()=>{
 const {w}=boot(),model={customers:[customer()],projects:[],offers:[],events:[]},view={layer:'services',selection:{customerId:'orchard'},camera:{}};
 const scene=w.SOCServiceScene.project(model),html=w.SOCProviderCanvas.render(model,view),holder=w.document.createElement('div');holder.innerHTML=html;
 const site=holder.querySelector('[data-provider-action="select-path"][data-id="orchard:transport-site:orchard-head"]');
 assert.ok(site,'site is an accessible selectable map object');assert.equal(site.getAttribute('data-customer'),'orchard');
 const primary=holder.querySelector('[data-provider-action="select-path"][data-id="orchard:transport-path:orchard-primary"]');
 assert.ok(primary,'primary path can be selected');assert.equal(primary.getAttribute('role'),'button');assert.equal(primary.getAttribute('tabindex'),'0');assert.ok(primary.classList.contains('is-effective'));
 const linkNode=holder.querySelector('button.provider-transport-link-node[data-id="orchard:transport-path:orchard-primary"]');assert.ok(linkNode,'path also has a full-size native button target');assert.equal(linkNode.getAttribute('data-customer'),'orchard');
 const backup=holder.querySelector('[data-provider-action="select-path"][data-id="orchard:transport-path:orchard-backup"]');
 assert.ok(backup,'failed backup remains visible and selectable');assert.ok(backup.classList.contains('is-pending'));
 assert.equal(scene.edges.find(edge=>edge.id==='orchard:transport-path:orchard-backup').ready,false);
 w.close();
});

test('Resilience inspector consumes measured summaries and only renders supplied eligible paid quotes',()=>{
 const {w}=boot(),summary=transport(),html=w.SOCProviderResilienceUI.render({transport:summary,customerId:'orchard',selection:{type:'transport-path',linkId:'orchard-primary'},actions:[
  {id:'diverse-upstream',name:'Diverse upstream',available:true,quote:{setupCents:24000,periodCents:3000,workMinutes:8,engineers:1,support:0}},
  {id:'managed-diverse-upstream',name:'Managed diverse upstream',available:false,blockers:['PRIMARY_REQUIRED'],quote:{setupCents:8000,periodCents:6000}},
  {id:'invented-free-link',name:'Invented link',available:true,quote:{setupCents:0,periodCents:0}}
 ]}),holder=w.document.createElement('div');holder.innerHTML=html;
 assert.ok(holder.querySelector('[data-transport-link="orchard-primary"]'));
 assert.match(holder.textContent,/20 Mbps/);assert.match(holder.textContent,/640 Kbps/);assert.match(holder.textContent,/19,360 Kbps|19360 Kbps/);
 assert.match(holder.textContent,/Shared failure dependency/);assert.match(holder.textContent,/metro/);
 assert.ok(holder.querySelector('[data-provider-action="operation"][data-operation="diverse-upstream"][data-id="orchard"]'));
 assert.ok(holder.querySelector('[data-provider-action="operation"][data-operation="managed-diverse-upstream"]:disabled'));
 assert.equal(holder.querySelector('[data-operation="invented-free-link"]'),null,'renderer does not invent unrecognized offers');
 assert.match(holder.textContent,/8 min/);assert.match(holder.textContent,/1 \/ 0/);
 w.close();
});

test('Absent or unknown resilience marker never creates map objects or paid controls',()=>{
 const {w}=boot();
 for(const marker of [undefined,{version:2,sites:[{id:'fake'}]}]){
  const c=customer();if(marker===undefined)delete c.transport;else c.transport=marker;
  const scene=w.SOCServiceScene.project({customers:[c]});assert.equal(scene.customers[0].transportScene.objects.length,0);assert.equal(scene.edges.filter(edge=>edge.type.startsWith('transport-')).length,0);
  assert.equal(w.SOCProviderResilienceUI.render({transport:marker,customerId:'orchard',actions:[{id:'primary-upstream',available:true}]}),'');
 }
 w.close();
});

test('Provider inspector wires selected transport edges, contextual quotes, failure repair and authored workload',()=>{
 const {w}=boot(),c=customer();c.resilienceActions=[
  {id:'primary-upstream',available:true,blockers:[],quote:{setupCents:48000,periodCents:0,workMinutes:8,engineers:1,support:0}},
  {id:'diverse-upstream',available:false,blockers:['PAID_PRIMARY_REQUIRED'],quote:{setupCents:24000,periodCents:0,workMinutes:8,engineers:1,support:0}},
  {id:'managed-diverse-upstream',available:true,blockers:[],quote:{setupCents:8000,periodCents:5000,workMinutes:10,engineers:0,support:1}},
  {id:'upstream-binding-extension',available:true,blockers:[],quote:{setupCents:8000,periodCents:0,workMinutes:3,engineers:1,support:0}},
  {id:'transport-repair',available:true,blockers:[],quote:{setupCents:10000,periodCents:0,workMinutes:4,engineers:1,support:0}}
 ];
 c.resilienceWorkload={version:1,dueCases:24,primaryFunded:true,followupDurationMinutes:3,deadlineMinutes:24,windowMinutes:10,maximumLatencyMs:500,sequences:[{jobId:'sequence-1',status:'complete',caseId:'case-1',deadlineAt:24,windowStart:0,phaseCount:3}]};
 const model={customers:[c],projects:[],incidents:[],offers:[],events:[],operations:[]};
 const customerHtml=w.SOCProviderPanels.inspector(model,{selection:{customerId:'orchard'}}),holder=w.document.createElement('div');holder.innerHTML=customerHtml;
 assert.match(holder.textContent,/24 due cases/);assert.match(holder.textContent,/24-minute due deadline/);assert.match(holder.textContent,/10-minute continuity window/);assert.match(holder.textContent,/three-call sequence/);
 assert.equal(holder.querySelectorAll('.provider-resilience-offer').length,5);
 assert.ok(holder.querySelector('[data-provider-action="operation"][data-operation="primary-upstream"][data-id="orchard"]'));
 assert.ok(holder.querySelector('[data-provider-action="operation"][data-operation="transport-repair"][data-id="orchard"]'));
 assert.match(holder.textContent,/Direct primary upstream/);assert.match(holder.textContent,/Repair an acknowledged supported transport fault/);
 const edge=w.SOCServiceScene.project(model).edges.find(x=>x.id==='orchard:transport-path:orchard-primary');
 const pathHtml=w.SOCProviderPanels.inspector(model,{selection:{customerId:'orchard',pathId:edge.id}}),pathHolder=w.document.createElement('div');pathHolder.innerHTML=pathHtml;
 assert.ok(pathHolder.querySelector('[data-transport-link="orchard-primary"]'),'selected link opens the path inspector');
 assert.ok(pathHolder.querySelector('[data-operation="transport-repair"]'),'incident response remains reachable from selected path');
 w.close();
});
