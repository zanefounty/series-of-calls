const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const S=require('../src/game/55-communications');
const act=(s,type,p={})=>S.dispatch(s,{type,...p});
const camp=(s,action,p={})=>act(s,'campaign',{command:{action,...p}});
const tick=(s,minutes=1)=>act(s,'advance',{minutes});
function prepared(s,alternative=false){
 if(s.scenario==='government'){
  s=act(s,'information',{command:{action:'start'}});
  s=act(s,'information',{command:{action:'configure',kind:'pipeline',config:{...S.information.schemas.pipeline,steps:['transcription']}}});
 }
 for(const command of S.reference(s))s=S.dispatch(s,command);
 if(s.scenario==='enterprise'){
  s=act(s,'migrate',{identities:['bea'],target:'phone'});s=tick(s);
  if(alternative){s=act(s,'configure',{id:'room',config:{mode:'bridge',interop:true}});s=tick(s);}
 }
 if(!s.connected){s=act(s,'connect',{connected:true});s=tick(s);}
 return s;
}
function journey(s,label,alternative=false){return act(s,'interact',{channel:s.scenario==='smb'&&!alternative?'message':'voice',from:'alex',to:'+61255500201',caseId:label});}
function windowPassed(s,kind){const w=s.campaign.progress[s.scenario].windows.filter(x=>x.kind===kind).at(-1);assert.equal(w.status,'passed',`${s.scenario}/${s.jurisdiction}/${kind}: ${w.errors}`);return s;}
function complete(s,alternative=false){
 s=prepared(s,alternative);s=camp(s,'open-window',{kind:'baseline'});s=windowPassed(tick(s),'baseline');
 s=camp(s,'open-window',{kind:'service'});
 if(s.scenario==='defence')s=camp(s,'inject-incident');
 s=journey(s,'service-'+s.scenario,alternative);
 if(s.scenario==='enterprise'){s=act(s,'interact',{channel:'voice',from:'bea',to:'+61255500124',caseId:'bea-service'});s=act(s,'meeting');}
 s=windowPassed(tick(s,S.campaign.tracks[s.scenario].windows.service),'service');
 s=camp(s,'open-window',{kind:'recovery'});
 if(s.scenario!=='defence')s=camp(s,'inject-incident');
 s=tick(s);s=camp(s,'recover-incident');s=journey(s,'recovery-'+s.scenario,alternative);s=windowPassed(tick(s,7),'recovery');
 s=act(s,'business',{command:{action:'start'}});
 if(s.scenario==='defence'){
  s=act(s,'connect',{connected:false});s=journey(s,'qualification-defence');s=tick(s,5);s=act(s,'meeting');
 }
 if(['government','defence'].includes(s.scenario))s=act(s,'business',{command:{action:'qualify',sector:s.scenario}});
 if(!s.connected)s=act(s,'connect',{connected:true});
 s=act(s,'business',{command:{action:'order',offer:'contact',quantity:1,unit:'agent',currency:'AUD',resources:['people','service'],customer:'customer',supportOwner:'orchard-msp',sell:true}});
 s=tick(s,2);s=camp(s,'open-window',{kind:'economics'});s=windowPassed(tick(s,60),'economics');
 s=camp(s,'assess');assert.ok(s.campaign.progress[s.scenario].award,JSON.stringify(S.calculate(s).campaign.assessment));
 return s;
}
test('AC-SOC-137 all four assessed tracks earn once-only awards through shared dispatch across AU US JP EU',()=>{
 for(const jurisdiction of S.jurisdictions){
  let s=camp(S.create({scenario:'smb',jurisdiction,mode:'assessed'}),'start');s=act(s,'progression',{command:{action:'start'}});let revision=s.revision;
  for(const track of ['smb','enterprise','government','defence']){
   if(track!=='smb')s=camp(s,'select-track',{track});
   s=complete(s);if(track==='smb')s=act(s,'progression',{command:{action:'claim-goal',goal:'progress.goal.bb'}});assert.equal(s.progression.awards.length,1);assert.ok(s.revision>revision);revision=s.revision;
   const before=JSON.stringify([s.business.balance,s.business.ledger,s.campaign.awards]);s=camp(s,'assess');assert.equal(JSON.stringify([s.business.balance,s.business.ledger,s.campaign.awards]),before);
   assert.deepEqual(S.restore(JSON.stringify(s)),s);
  }
  assert.equal(s.campaign.awards.length,4);assert.equal(s.campaign.awards.reduce((n,a)=>n+a.amount,0),10);
  const previous=s.campaign.snapshots.smb.root;s=camp(s,'select-track',{track:'smb'});assert.equal(s.clock,previous.clock);assert.deepEqual(s.resources,previous.resources);assert.deepEqual(s.business,previous.business);assert.equal(s.progression.awards.length,1);assert.ok(Object.values(s.campaign.snapshots).every(snapshot=>snapshot.root.progression===undefined));
  assert.equal(S.calculate(s).campaign.assessment.passed,true);
 }
});
test('AC-SOC-138 campaign assessment accepts alternate voice and interoperable meeting configurations',()=>{
 let s=camp(S.create({mode:'assessed'}),'start');s=complete(s,true);s=camp(s,'select-track',{track:'enterprise'});s=complete(s,true);
 assert.equal(s.resources.room.effective.mode,'bridge');assert.equal(s.campaign.awards.length,2);
});
test('AC-SOC-139 closed evidence becomes stale after endpoint changes and outages cannot be hidden by recovery',()=>{
 let s=camp(S.create({mode:'assessed'}),'start');s=prepared(s);s=camp(s,'open-window',{kind:'baseline'});s=tick(s);
 s=act(s,'configure',{id:'desk',config:{enabled:false}});s=tick(s);s=camp(s,'assess');assert.ok(S.calculate(s).campaign.assessment.checks.baseline.errors.includes('EVIDENCE_STALE'));
 s=act(s,'configure',{id:'desk',config:{enabled:true}});s=tick(s);s=camp(s,'open-window',{kind:'service'});s=journey(s,'transient-outage');s=act(s,'fault',{id:'phone',fault:'OUTAGE'});s=tick(s);s=act(s,'fault',{id:'phone',fault:null});s=tick(s,4);
 const w=s.campaign.progress.smb.windows.at(-1);assert.equal(w.status,'failed');assert.ok(w.errors.includes('WINDOW_SERVICE_INTERRUPTION:phone'));assert.equal(s.campaign.awards.length,0);
 const forged=structuredClone(s);forged.campaign.progress.smb.windows.at(-1).status='passed';assert.throws(()=>S.restore(JSON.stringify(forged)),/INVALID_CAMPAIGN_EVIDENCE/);
});
test('AC-SOC-140 campaign commands retain worker save replay and pure calculation equivalence',()=>{
 const worker={};vm.createContext(worker);vm.runInContext(S.workerSource()+';globalThis.S=SOC;',worker);
 let s=S.create({mode:'assessed'}),w=structuredClone(s);const commands=[{type:'campaign',command:{action:'start'}},...S.reference(s),{type:'campaign',command:{action:'open-window',kind:'baseline'}},{type:'advance',minutes:1},{type:'campaign',command:{action:'assess'}}];
 for(const c of commands){s=S.dispatch(s,c);w=worker.S.dispatch(w,c);assert.equal(JSON.stringify(w),JSON.stringify(s));}
 const before=JSON.stringify(s),first=JSON.stringify(S.calculate(s));assert.equal(JSON.stringify(S.calculate(S.restore(before))),first);assert.equal(JSON.stringify(s),before);
 const replay=commands.reduce((state,c)=>S.dispatch(state,c),S.create({mode:'assessed'}));assert.deepEqual(replay,s);
});
