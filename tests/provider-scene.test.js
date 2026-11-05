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

test('shared scene projection preserves actual estate states and separates funded product project status',()=>{
 const {w}=boot();
 const source={customers:[{id:'orchard',name:'Orchard Repairs',market:'au-sydney',services:[{id:'phone',kind:'uc',desired:{connectivity:'access'},provisioning:{status:'ready'},effective:{enabled:true},observed:{ready:true}}],estateResources:{access:{id:'access',kind:'connectivity',name:'Sydney carrier',desired:{enabled:true},provisioning:{status:'ready'},effective:{enabled:true},observed:{ready:false,reasons:['CAPACITY_EXHAUSTED']}}}}],projects:[{id:'provider-project-3',customerId:'orchard',kind:'operation',operationId:'recording',productId:'scenario-recording',resources:['archive'],status:'complete'}]};
 const before=JSON.stringify(source),scene=w.SOCServiceScene.project(source);
 assert.equal(JSON.stringify(source),before,'projection is pure');
 assert.equal(scene.customers[0].services.find(x=>x.id==='access').observed.ready,false);
 assert.deepEqual(JSON.parse(JSON.stringify(scene.customers[0].projects[0])),{id:'orchard:project:provider-project-3',sourceRecordId:'provider-project-3',scope:'orchard',name:'Funded project: Scenario recording',kind:'product',objectType:'product',status:'complete',resources:['archive'],resourceIds:['orchard:archive']});
 assert.equal(scene.customers[0].projects[0].effective,undefined,'project completion does not invent effective service state');
 assert.ok(scene.edges.some(x=>x.from==='orchard:phone'&&x.to==='orchard:access'));
 assert.ok(scene.objects.some(x=>x.id==='orchard:project:provider-project-3'&&x.objectType==='product'));
 w.close();
});

test('Training root projection exposes typed resources, observed status and selectable dependency edges',()=>{
 const {w}=boot(),root={resources:{identity:{kind:'directory',desired:{enabled:true},provisioning:{status:'ready'},effective:{enabled:true},observed:{ready:true}},phone:{kind:'uc',desired:{identity:'identity'},provisioning:{status:'pending'},effective:null,observed:{ready:false,reasons:['IDENTITY_NOT_READY']}}}};
 const scene=w.SOCServiceScene.project(root);
 assert.equal(scene.trainingResources.length,2);assert.equal(scene.trainingResources[1].id,'training:phone');
 assert.equal(scene.trainingResources[1].observed.reasons[0],'IDENTITY_NOT_READY');
 assert.ok(scene.edges.some(x=>x.id==='training:phone->training:identity'&&x.type==='depends-on'));
 assert.equal(scene.customers.length,0);w.close();
});

test('portfolio card bounds do not overlap at mobile and desktop widths across markets',()=>{
 const {w}=boot();try{
  for(const width of [390,900,1342])for(const count of [1,2,20])for(const mixed of [false,true]){
   const customers=Array.from({length:count},(_,i)=>({id:`customer-${i}`,market:mixed?['au-sydney','au-melbourne','us-seattle','jp-tokyo','eu-dublin'][i%5]:'au-sydney'}));
   const layout=w.SOCProviderCanvas.portfolioPositions(customers,{width,height:300});
   const rectangles=customers.map(c=>{const [x,y]=layout.positions.get(c.id);return {x:x/100*layout.width-100,y:y/100*layout.height-42,width:200,height:84};});
   for(const [index,a] of rectangles.entries()){
    assert.ok(a.x>=0&&a.x+a.width<=layout.width&&a.y>=0&&a.y+a.height<=layout.height,'card fits scrollable world');
    for(const b of rectangles.slice(index+1))assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${width}/${count}/${mixed}: card hit targets cannot overlap`);
   }
  }
 }finally{w.close();}
});

test('Provider map shows funded product objects and marks dependency paths as keyboard actions',()=>{
 const {w}=boot(),model={customers:[{id:'orchard',name:'Orchard Repairs',market:'au-sydney',stages:{base:{status:'effective'}},services:[{id:'phone',kind:'uc',desired:{connectivity:'access'},provisioning:{status:'ready'},effective:{enabled:true},observed:{ready:true}},{id:'access',kind:'connectivity',desired:{},provisioning:{status:'ready'},effective:{enabled:true},observed:{ready:true}}]}],projects:[{id:'project-recording',customerId:'orchard',kind:'operation',operationId:'recording',productId:'scenario-recording',resources:['access'],status:'complete'}],offers:[],events:[]};
 const html=w.SOCProviderCanvas.render(model,{layer:'services',selection:{customerId:'orchard'},camera:{}}),holder=w.document.createElement('div');holder.innerHTML=html;
 assert.ok(holder.querySelector('.provider-resource-node[aria-label*="recording"]'));
 const path=holder.querySelector('[data-provider-action="select-path"]');assert.ok(path);assert.equal(path.getAttribute('role'),'button');assert.equal(path.getAttribute('tabindex'),'0');
 assert.match(holder.querySelector('.provider-resource-node[aria-label*="recording"]').textContent,/Funded project · complete/);
 w.close();
});
