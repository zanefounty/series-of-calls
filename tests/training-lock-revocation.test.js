'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {load,browser,flush}=require('./harness');

function tab(t,b){const x=load({browser:b});t.after(()=>{x.ev('socClose()');b.close(x.dom.window);x.dom.window.close();});return x;}
function installPendingWorker(x){
 x.ev(`window.__trainingWorker=null;URL.createObjectURL=()=> 'blob:training-worker';URL.revokeObjectURL=()=>{};window.Worker=class{constructor(){window.__trainingWorker=this;}postMessage(message){this.message=message;}terminate(){this.terminated=true;}};`);
 x.ev('socAdvance(1)');
 return x.ev('__trainingWorker');
}

test('AC-SOC-787 stolen Training lease cancels worker, pauses edits, and leaves the state exportable',async t=>{
 const b=browser(),owner=tab(t,b),stealer=tab(t,b);await owner.ev('socOpen()');
 owner.ev("socClick('interaction')");
 const saved=owner.ev('JSON.stringify(SCT.state)');assert.ok(owner.ev("localStorage.getItem(SCT_KEY+'main')"));
 const stored=owner.ev("localStorage.getItem(SCT_KEY+'main')"),sequence=owner.ev('SCT.seq');
 const worker=installPendingWorker(owner);assert.equal(owner.ev('SCT.busy'),true);
 stealer.ev(`window.__stolenTrainingLock=navigator.locks.request('series-of-calls:training-lock:main',{steal:true},()=>new Promise(resolve=>window.__releaseStolenTrainingLock=resolve));`);
 await flush(5);
 assert.equal(owner.ev('SCT.locked'),false,'a native lock steal revokes edit authority');
 assert.equal(owner.ev('SCT.busy'),false,'revocation cancels pending worker work');
 assert.equal(owner.ev('SCT.worker'),null);
 assert.equal(owner.ev('window.__trainingWorker.terminated'),true);
 assert.match(owner.ev('SCT.error'),/ownership.*lost|lost.*ownership/i);
 owner.ev(`window.__trainingWorker.onmessage({data:{revision:window.__trainingWorker.message.state.revision,state:SOC.dispatch(window.__trainingWorker.message.state,window.__trainingWorker.message.command)}})`);
 assert.equal(owner.ev('JSON.stringify(SCT.state)'),saved,'a late result cannot replace the retained state');
 owner.ev('window.__trainingWorker.onerror()');
 assert.throws(()=>owner.ev("socApply({type:'advance',minutes:1})"),/read.only/i);
 assert.equal(owner.ev('socStore()'),undefined);
 assert.equal(owner.ev("localStorage.getItem(SCT_KEY+'main')"),stored,'revocation prevents stale writes');
 assert.equal(owner.ev('SCT.seq'),sequence);

 owner.ev(`HTMLAnchorElement.prototype.click=function(){window.__trainingDownload=this.download;};socClick('export');`);
 assert.equal(owner.ev('__trainingDownload'),'series-of-calls-exercise.json','the read-only state remains exportable');
 stealer.ev('window.__releaseStolenTrainingLock()');await flush();
});

test('AC-SOC-788 a stale Training lock rejection cannot revoke a reacquired lease or its worker',async t=>{
 const b=browser(),owner=tab(t,b),stealer=tab(t,b),nativeLocks=owner.dom.window.navigator.locks;
 let first=true,deliverOldRejection=null;
 Object.defineProperty(owner.dom.window.navigator,'locks',{configurable:true,value:{request(name,options,callback){
  const request=nativeLocks.request(name,options,callback);
  if(!first)return request;
  first=false;
  return request.catch(error=>new owner.dom.window.Promise((_resolve,reject)=>{deliverOldRejection=()=>reject(error);}));
 }}});
 await owner.ev('socOpen()');owner.ev("socClick('interaction')");
 stealer.ev(`window.__stolenTrainingLock=navigator.locks.request('series-of-calls:training-lock:main',{steal:true},()=>new Promise(resolve=>window.__releaseStolenTrainingLock=resolve));`);
 await flush(5);assert.equal(typeof deliverOldRejection,'function','the stolen old native request has a delayed rejection');
 owner.ev('socClose()');stealer.ev('window.__releaseStolenTrainingLock()');await flush(5);
 await owner.ev('socOpen()');assert.equal(owner.ev('SCT.locked'),true,'the newer lease is acquired');
 const state=owner.ev('JSON.stringify(SCT.state)'),worker=installPendingWorker(owner);assert.equal(owner.ev('SCT.busy'),true);
 deliverOldRejection();await flush(5);
 assert.equal(owner.ev('SCT.locked'),true,'a stale catch cannot release the newer lease');
 assert.equal(owner.ev('SCT.error'),'','a stale catch cannot surface a false lock-loss warning');
 assert.equal(owner.ev('SCT.busy'),true,'a stale catch cannot cancel the newer job');
 assert.equal(owner.ev('SCT.worker===window.__trainingWorker'),true);
 assert.equal(owner.ev('window.__trainingWorker.terminated'),undefined);
 assert.equal(owner.ev('JSON.stringify(SCT.state)'),state);
 const newerEnvelope=JSON.stringify({app:owner.ev('SOC.APP'),seq:owner.ev('SCT.seq')+1,state:JSON.parse(state)});
 stealer.ev(`localStorage.setItem('series-of-calls:training:main',${JSON.stringify(newerEnvelope)})`);await flush(5);
 assert.equal(owner.ev('SCT.locked'),false,'a newer stored save uses the same lease release path');
 assert.equal(owner.ev('SCT.busy'),false);assert.equal(owner.ev('window.__trainingWorker.terminated'),true);
 assert.equal(owner.ev('JSON.stringify(SCT.state)'),state,'newer-save refusal keeps the current state exportable');
 owner.ev('socClose()');await flush();
});
