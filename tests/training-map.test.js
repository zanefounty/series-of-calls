'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {browser,load}=require('./harness');

function tab(t){const b=browser(),x=load({browser:b});t.after(()=>{x.ev('socClose()');b.close(x.dom.window);x.dom.window.close();});return x;}

test('guided and assessed Training open the shared service map with lesson and read-only assessment overlays',async t=>{
 const x=tab(t);await x.ev('socOpen()');let d=x.dom.window.document;
 assert.equal(x.ev('SCT.state.experience.kind'),'training');assert.ok(d.querySelector('.soc-training-map'));
 assert.ok(d.querySelector('.soc-training-lesson'));assert.ok(d.querySelector('.soc-training-result[role="status"]'));
 assert.ok(d.querySelectorAll('#soc-narrative [data-narrative]').length>0,'the map keeps the source-linked narrative library visible');assert.ok(d.querySelector('.soc-flavour'),'the selected service keeps its source-linked flavour');
 assert.ok(d.querySelectorAll('.soc-training-node').length>0);assert.equal(d.querySelector('#soc-config'),null);
 assert.equal(d.querySelector('[data-soc="fault"]'),null);assert.equal(d.querySelector('.soc-admin'),null);
 d.querySelector('[data-training="select"][data-id="people"]').click();
 const lessonAction=d.querySelector('[data-training="guided-setting"][data-id="people"]');assert.ok(lessonAction,'a lesson action is attached to the workforce object');lessonAction.click();
 assert.equal(x.ev('SCT.state.commands.at(-1).command.id'),'people');assert.equal(x.ev('SCT.state.commands.at(-1).command.type'),'configure');
 const selected=x.ev('SCT.selected'),before=x.ev('SCT.view.zoom');d.querySelector('[data-training="zoom"][data-delta="1"]').click();
 assert.equal(x.ev('SCT.selected'),selected);assert.ok(x.ev('SCT.view.zoom')>before,'camera state survives the map rerender');
 d.querySelector('#soc-mode').value='assessed';d.querySelector('#soc-mode').dispatchEvent(new x.dom.window.Event('change'));
 assert.equal(x.ev('SCT.state.mode'),'assessed');assert.equal(x.ev('SCT.state.experience.kind'),'training');assert.ok(d.querySelector('.soc-training-map'));
 assert.equal(d.querySelector('#soc-config'),null);assert.deepEqual(x.errors,[]);
});

test('contextual Training changes use shared dispatch and preserve selection while exposing service truth',async t=>{
 const x=tab(t);await x.ev('socOpen()');const d=x.dom.window.document;
 const target=x.ev('Object.values(SCT.state.resources).find(r=>Number.isSafeInteger(r.desired.capacity))?.id');assert.ok(target);
 d.querySelector(`[data-training="select"][data-id="${target}"]`).click();
 const before=x.ev(`SCT.state.resources[${JSON.stringify(target)}].desired.capacity`);
 d.querySelector(`[data-training="capacity"][data-id="${target}"][data-delta="1"]`).click();
 assert.equal(x.ev(`SCT.state.resources[${JSON.stringify(target)}].desired.capacity`),before+1);
 assert.equal(x.ev('SCT.state.commands.at(-1).command.type'),'configure');assert.equal(x.ev('SCT.selected'),target);
 assert.equal(d.querySelector('#soc-config'),null);assert.ok(d.querySelector('.soc-training-state dd'));
 d.querySelector('[data-training="probe"]').click();
 assert.equal(x.ev('SCT.state.commands.at(-1).command.type'),'probe');assert.deepEqual(x.errors,[]);
});

test('legacy sandbox experience remains the Lab authoring surface',async t=>{
 const x=tab(t);await x.ev('socOpen()');
 x.ev("SCT.state=SOC.create({mode:'sandbox'});socRender()");const d=x.dom.window.document;
 assert.equal(x.ev('SCT.state.experience.kind'),'lab');assert.ok(d.querySelector('#soc-config'));
 assert.equal(d.querySelector('.soc-training-map'),null);assert.ok(d.querySelector('[data-soc="fault"]'));
 assert.deepEqual(x.errors,[]);
});

test('Training import preserves ownership when given a Lab save',async t=>{
 const x=tab(t);await x.ev('socOpen()');const d=x.dom.window.document;
 const legacy=x.ev("JSON.stringify(SOC.create({mode:'sandbox'}))");
 await d.querySelector('#soc-import').onchange({target:{files:[{size:legacy.length,text:async()=>legacy}]}});
 assert.equal(x.ev('SCT.state.experience.kind'),'training');assert.match(x.ev('SCT.error'),/SAVE_EXPERIENCE_MISMATCH/);
 assert.equal(x.ev("localStorage.getItem(SCT_KEY+'main')"),null);assert.deepEqual(x.errors,[]);
});

test('Training graph layout is deterministic, sized to the dependency graph, and keeps every node reachable',async t=>{
 const x=tab(t);await x.ev('socOpen()');
 const scene={trainingResources:[
  {id:'training:a',resourceId:'a',name:'Identity',kind:'identity'},
  {id:'training:b',resourceId:'b',name:'Carrier',kind:'connectivity'},
  {id:'training:c',resourceId:'c',name:'Platform',kind:'uc'},
  {id:'training:d',resourceId:'d',name:'People',kind:'people'},
  {id:'training:e',resourceId:'e',name:'Queue',kind:'queue'}
 ],edges:[
  {id:'ab',from:'training:a',to:'training:c',type:'depends-on'},
  {id:'bb',from:'training:b',to:'training:c',type:'depends-on'},
  {id:'cd',from:'training:c',to:'training:d',type:'depends-on'},
  {id:'de',from:'training:d',to:'training:e',type:'uses-workforce'}
 ]};
 const encoded=JSON.stringify(scene),graph=x.ev(`SOCTrainingMap.layout(${encoded})`),again=x.ev(`SOCTrainingMap.layout(${JSON.stringify({...scene,trainingResources:[...scene.trainingResources].reverse()})})`);
 assert.equal(graph.nodes.length,5);assert.deepEqual(JSON.parse(JSON.stringify(graph.nodes.map(n=>[n.resource.id,n.position.x,n.position.y]))),JSON.parse(JSON.stringify(again.nodes.map(n=>[n.resource.id,n.position.x,n.position.y]))));
 assert.ok(graph.width>184&&graph.height>300,'the graph canvas grows to include its longest path');
 for(let i=0;i<graph.nodes.length;i++)for(let j=i+1;j<graph.nodes.length;j++){
  const a=graph.nodes[i].position,b=graph.nodes[j].position;
  assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,`${graph.nodes[i].resource.id} overlaps ${graph.nodes[j].resource.id}`);
 }
 assert.equal(graph.edges.length,4);for(const edge of graph.edges){assert.ok(edge.x1>=0&&edge.x1<=graph.width);assert.ok(edge.y2>=0&&edge.y2<=graph.height);}
 const many={trainingResources:Array.from({length:20},(_,i)=>({id:`training:r${i}`,resourceId:`r${i}`})),edges:[]},large=x.ev(`SOCTrainingMap.layout(${JSON.stringify(many)})`);
 assert.equal(large.nodes.length,20);assert.ok(large.width<=3*184+2*34+56,'large exercises wrap into reachable rows instead of stretching beyond the world');assert.ok(large.height>500);
 const manyRects=large.nodes.map(n=>n.position);for(let i=0;i<manyRects.length;i++)for(let j=i+1;j<manyRects.length;j++){const a=manyRects[i],b=manyRects[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'large graph resource hit targets never overlap');}
 assert.deepEqual(x.errors,[]);
});

test('Training exposes typed dependency paths and puts condition and permitted actions ahead of raw state',async t=>{
 const x=tab(t);await x.ev('socOpen()');
 const scene={trainingResources:[
  {id:'training:identity',resourceId:'identity',name:'Identity service',kind:'identity',desired:{enabled:true},effective:{enabled:true},observed:{status:'available'}},
  {id:'training:phone',resourceId:'phone',name:'Customer phones',kind:'phone',desired:{directory:'identity',capacity:6},effective:{directory:'identity'},observed:{status:'degraded'}}
 ],edges:[{id:'training:phone->training:identity',scope:'training-exercise',from:'training:phone',to:'training:identity',type:'depends-on'}]};
 const output=x.ev(`SOCTrainingMap.render(${JSON.stringify(scene)},{selected:'phone',selectedPath:'training:phone->training:identity',inspectorOpen:true,labels:{purpose:'Purpose',condition:'Observed condition',path:'Selected path',dependency:'Depends on',configurationDetail:'Configuration details'}})`);
 assert.match(output,/data-training="select-path"/);assert.match(output,/data-id="training:phone-&gt;training:identity"|data-id="training:phone-&gt;training:identity"/);
 assert.match(output,/aria-label="Depends on: Customer phones → Identity service"/);assert.match(output,/soc-training-selected-path/);
 assert.match(output,/Observed condition/);assert.match(output,/degraded/);assert.ok(output.indexOf('soc-training-actions')<output.indexOf('soc-training-state'),'actions appear before advanced read-only configuration');
 assert.match(output,/<details class="soc-training-state"><summary>Configuration details/);assert.match(output,/data-training="open-inspector"/);assert.match(output,/data-training="close-inspector"/);
 assert.deepEqual(x.errors,[]);
});

test('Training map camera applies to nodes and dependency paths in one coordinate space',async t=>{
 const x=tab(t);await x.ev('socOpen()');
 const scene={trainingResources:[{id:'training:a',resourceId:'a',name:'A'},{id:'training:b',resourceId:'b',name:'B'}],edges:[{id:'a-b',from:'training:a',to:'training:b',type:'depends-on'}]};
 const html=x.ev(`SOCTrainingMap.render(${JSON.stringify(scene)},{camera:{zoom:1.2,x:12,y:-4}})`);
 assert.match(html,/class="soc-training-scene" style="width:\d+px;height:\d+px;transform:translate\(12px,-4px\) scale\(1\.2\)"/);
 assert.match(html,/<svg class="soc-training-links" viewBox="0 0 \d+ \d+"/);assert.match(html,/class="soc-training-nodes"/);
 const css=require('node:fs').readFileSync(require('node:path').join(__dirname,'../src/styles/99-training-map.css'),'utf8');
 assert.doesNotMatch(css,/\.soc-training-links\s*\{[^}]*display:\s*none/s);assert.match(css,/\.soc-training-edge\s*\{[^}]*width:44px;height:44px/s);
 assert.deepEqual(x.errors,[]);
});


test('Training settings use explicit open and close state without advancing the lesson or replacing map selection',async t=>{
 const x=tab(t);await x.ev('socOpen()');const d=x.dom.window.document,original=x.ev('JSON.stringify(SCT.state)');
 assert.ok(d.querySelector('#soc-console.is-training-map'));assert.equal(d.querySelector('#soc-training-settings').hidden,true);
 d.querySelector('[data-training="open-settings"]').click();assert.equal(d.querySelector('#soc-training-settings').hidden,false);assert.equal(d.querySelector('[data-training="open-settings"]').getAttribute('aria-expanded'),'true');
 const selected=x.ev('SCT.selected');d.querySelector('#soc-scenario').focus();d.querySelector('[data-training="close-settings"]').click();
 assert.equal(d.querySelector('#soc-training-settings').hidden,true);assert.equal(d.activeElement.dataset.training,'open-settings','closing settings returns keyboard focus to its opening control');assert.equal(x.ev('SCT.selected'),selected);assert.equal(x.ev('JSON.stringify(SCT.state)'),original);
 d.querySelector('[data-training="open-settings"]').click();d.querySelector('#soc-mode').value='assessed';d.querySelector('#soc-mode').dispatchEvent(new x.dom.window.Event('change'));
 assert.equal(d.querySelector('#soc-training-settings').hidden,false,'changing exercise settings keeps the explicit sheet open');assert.equal(x.ev('SCT.state.mode'),'assessed');
 x.ev("SCT.state=SOC.create({mode:'sandbox'});socRender()");assert.equal(d.querySelector('#soc-console').classList.contains('is-training-map'),false);assert.ok(d.querySelector('#soc-config'));assert.deepEqual(x.errors,[]);
});


test('Training presentation preferences persist through the shared store without creating service work or altering its save',async t=>{
 const x=tab(t);await x.ev('socOpen()');const d=x.dom.window.document,before=x.ev('JSON.stringify(SCT.state)');d.querySelector('[data-training="open-settings"]').click();
 for(const [key,value] of [['sound',true],['animation',false],['reducedMotion',true],['alerts',false],['inputHelp',false]]){const input=d.querySelector(`[data-training-preference="${key}"]`);assert.ok(input);if(input.checked!==value)input.click();assert.equal(x.ev(`SOCServicePreferences.read(localStorage)[${JSON.stringify(key)}]`),value);}
 assert.equal(x.ev('JSON.stringify(SCT.state)'),before);assert.ok(d.querySelector('#soc-console.reduce-motion'));assert.equal(d.querySelector('.soc-status').getAttribute('aria-live'),'off');assert.equal(x.ev('providerPreferences().sound'),true);
 x.ev('socRender()');assert.equal(d.querySelector('[data-training-preference="animation"]').checked,false);assert.equal(d.querySelector('#soc-training-settings').hidden,false);
 d.querySelector('[data-training="close-settings"]').click();assert.equal(x.ev('JSON.stringify(SCT.state)'),before);x.ev('providerHome()');assert.equal(x.ev('SOC_PROVIDER_UI.view().preferences.reducedMotion'),true,'Provider refreshes the shared settings after leaving Training');assert.equal(x.ev('SOC_PROVIDER_UI.view().preferences.animation'),false);assert.deepEqual(x.errors,[]);
});
