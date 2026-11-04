const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const SOC=require('../src/game/55-communications.js');

const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
function boot(){
 const dom=new JSDOM('<!doctype html><html><body><div id="app"></div><div id="modal" hidden></div></body></html>',{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'}),w=dom.window;
 w.__TUBES_TEST__=true;w.SOC=SOC;w.ACT={};w.UI={speed:0};w.SCT={};w.socClose=()=>{};
 let acquired=0;Object.defineProperty(w.navigator,'locks',{value:{request:async(_name,_options,callback)=>{acquired++;await callback({name:'provider'});}}});
 w.eval(read('src/game/93-ui/10-dom.js'));
 for(const file of ['src/game/93-ui/70-provider-hud.js','src/game/93-ui/75-provider-panels.js','src/game/96-map/95-provider-canvas.js','src/game/97-provider-shell.js'])w.eval(read(file));
 w.eval(read('src/game/98-provider-runtime.js')+';globalThis.__SCP=SCP;');
 return {dom,w,acquired:()=>acquired};
}

test('provider runtime creates campaigns through visible new-game controls and stores an owned save',async()=>{
 const {dom,w}=boot();try{
  const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();
  w.document.querySelector('[data-provider-action="show-new-game"]').click();const form=w.document.querySelector('[data-provider-form="new-game"]');
  form.elements.providerName.value='Runtime Test MSP';form.elements.market.value='us-seattle';form.elements.difficulty.value='normal';form.elements.scenario.value='smb';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  await new Promise(r=>setTimeout(r,10));const state=()=>w.__SCP;assert.equal(state().state.providerCampaign.providerName,'Runtime Test MSP');assert.equal(state().state.providerCampaign.market,'us-seattle');assert.equal(state().state.clock,0);assert.equal(state().locked,true);
  w.document.querySelector('[data-provider-action="drawer"][data-provider-value="finance"]').click();w.document.querySelector('[data-provider-action="save"]').click();
  const envelope=JSON.parse(w.localStorage.getItem('series-of-calls:provider:v1'));assert.equal(envelope.version,1);assert.equal(envelope.seq,2);assert.equal(envelope.state.providerCampaign.providerName,'Runtime Test MSP');
 }finally{dom.window.close();}
});

test('provider worker failure uses the deterministic synchronous advance fallback and save restore',async()=>{
 const {dom,w}=boot();try{
  const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();await w.providerNew({providerName:'Fallback MSP',scenario:'smb',market:'au-sydney',difficulty:'normal'});const state=()=>w.__SCP;
  assert.equal(state().locked,true);assert.equal(state().state.clock,0);w.Worker=undefined;
  w.providerTick();assert.equal(state().busy,false);assert.equal(state().state.clock,1);assert.equal(state().seq,2);
  const before=JSON.stringify(state().state);w.providerHome();assert.equal(state().locked,false);await new Promise(r=>setTimeout(r,5));await w.providerOpen();assert.equal(state().locked,true);assert.equal(JSON.stringify(state().state),before);
  assert.equal(state().state.providerCampaign.providerName,'Fallback MSP');
 }finally{dom.window.close();}
});

test('opening a costed quote invalidates a delayed worker tick and still permits a current quote commit',async()=>{
 const {dom,w}=boot();try{
  const delayed=[];w.URL.createObjectURL=()=> 'blob:delayed-worker';w.URL.revokeObjectURL=()=>{};w.Worker=class {postMessage(message){this.message=message;this.state=SOC.dispatch(message.state,message.command);delayed.push(this);}terminate(){this.terminated=true;}reply(){this.onmessage?.({data:{id:this.message.id,revision:this.message.command.expectedRevision,state:this.state}});}};
  const host=w.document.createElement('section');host.id='provider-campaign';w.document.body.append(host);w.providerHome();
  w.document.querySelector('[data-provider-action="show-new-game"]').click();const form=w.document.querySelector('[data-provider-form="new-game"]');form.elements.providerName.value='Delayed Worker MSP';form.elements.market.value='au-sydney';form.elements.difficulty.value='normal';form.elements.scenario.value='smb';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await new Promise(r=>setTimeout(r,10));
  assert.equal(w.__SCP.locked,true);const before={clock:w.__SCP.state.clock,revision:w.__SCP.state.revision,seq:w.__SCP.seq};w.providerTick();assert.equal(w.__SCP.busy,true,`provider tick should remain pending (${typeof w.Worker}, ${typeof w.eval('Worker')}, ${delayed.length})`);assert.equal(delayed.length,1);
  w.document.querySelector('[data-provider-action="drawer"][data-provider-value="deals"]').click();w.document.querySelector('[data-provider-action="quote"][data-offer="starter"][data-plan="swift"]').click();assert.equal(w.__SCP.busy,false,'opening a decision must cancel pending work');assert.equal(delayed[0].terminated,true);
  delayed[0].reply();await new Promise(r=>setTimeout(r,10));assert.deepEqual({clock:w.__SCP.state.clock,revision:w.__SCP.state.revision,seq:w.__SCP.seq},before,'a delayed worker result cannot advance or persist after a quote opens');
  const retail=w.document.querySelector('[data-provider-form="retail-quote"]');assert.ok(retail,'base quote should show customer retail acceptance');retail.elements.retailPrice.value='1800';retail.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  w.document.querySelector('[data-provider-action="confirm-quote"]').click();assert.ok(w.__SCP.state.providerCampaign.projects.some(x=>x.kind==='stage'&&x.stage==='base'));assert.equal(w.__SCP.state.clock,0);assert.equal(JSON.parse(w.localStorage.getItem('series-of-calls:provider:v1')).state.revision,w.__SCP.state.revision);
 }finally{dom.window.close();}
});
