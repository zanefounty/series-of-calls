const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const S=require('../src/game/55-communications'),{load}=require('./harness');
const act=(s,type,p={})=>S.dispatch(s,{type,...p}),pack=(s,type,command)=>act(s,type,{command}),tick=(s,minutes=1)=>act(s,'advance',{minutes});
function ready(){let s=S.create({mode:'assessed'});for(const c of S.reference(s))s=S.dispatch(s,c);return s;}
function progression(){let s=pack(ready(),'campaign',{action:'start'});s=pack(s,'progression',{action:'start'});s=pack(s,'business',{action:'start'});s=pack(s,'business',{action:'order',offer:'workplace',quantity:2,unit:'seat',currency:'AUD',resources:['phone'],customer:'customer',supportOwner:'orchard-msp',sell:true});return tick(s,62);}
test('AC-SOC-157 shared dispatch executes both real incident exercises and preserves restart history',()=>{
 let s=pack(ready(),'issue-exercises',{action:'start'});
 for(const exercise of Object.keys(S.issueExercises.definitions)){
  for(const c of S.issueExercises.referenceCommands(exercise))s=pack(s,'issue-exercises',c);
  assert.equal(S.calculate(s).issueExercises.exercises.find(x=>x.exercise===exercise).passed,true);
 }
 const history=structuredClone(s.interactions);s=pack(s,'issue-exercises',{action:'restart',exercise:'directional-media'});assert.deepEqual(s.interactions,history);assert.equal(S.calculate(s).issueExercises.exercises[0].complete,false);
 const before=JSON.stringify(s);assert.throws(()=>pack(s,'issue-exercises',{action:'step',exercise:'directional-media',step:'invented'}),/STEP_ORDER/);assert.equal(JSON.stringify(s),before);assert.deepEqual(S.restore(before),s);
});
test('AC-SOC-158 achievements use current product bindings and once-only explicit claims without financial reward conversion',()=>{
 let s=progression();const financial=JSON.stringify(s.business);s=pack(s,'progression',{action:'claim-goal',goal:'progress.goal.bz'});s=pack(s,'progression',{action:'claim-goal',goal:'progress.goal.bz'});assert.equal(s.progression.awards.length,1);assert.equal(JSON.stringify(s.business),financial);
 s=pack(s,'products',{action:'start'});
 for(const [id,family,feature,unit] of [['a','cisco:suite-calling','multitenant-calling','session'],['b','microsoft:workplace-phone','telephony','seat']]){
  s=pack(s,'products',{action:'offer',offer:{id:'offer-'+id,family,edition:'fictional',unit,quantity:2,features:[feature],dependencies:family.startsWith('cisco')?{identity:'identity',carrier:'carrier'}:{identity:'identity'}}});s=tick(s);
  s=pack(s,'products',{action:'deploy',id:'deployment-'+id,offer:'offer-'+id,productVersion:'fictional-1',mode:'multitenant',region:'AU',bindings:[{feature,resources:['phone']}]});s=tick(s);
 }
 s=pack(s,'products',{action:'integration',id:'tested-link',source:'deployment-a',target:'deployment-b',features:[{sourceFeature:'multitenant-calling',targetFeature:'telephony'}]});s=pack(s,'products',{action:'test-integration',id:'tested-link'});
 assert.equal(S.calculate(s).progression.goals['progress.goal.ix'].status,'ready');
 s=act(s,'fault',{id:'phone',fault:'OUTAGE'});assert.equal(S.calculate(s).progression.goals['progress.goal.ix'].status,'incomplete');assert.throws(()=>pack(s,'progression',{action:'claim-goal',goal:'progress.goal.ix'}),/EVIDENCE_REQUIRED/);
 s=act(s,'fault',{id:'phone',fault:null});s=pack(s,'progression',{action:'claim-goal',goal:'progress.goal.ix'});assert.equal(s.progression.awards.length,2);assert.deepEqual(S.restore(JSON.stringify(s)),s);
});
test('AC-SOC-159 learning packs share worker commands and validate saved progress without mutating inspection',()=>{
 let s=progression();s=pack(s,'issue-exercises',{action:'start'});const worker={};vm.createContext(worker);vm.runInContext(S.workerSource()+';globalThis.S=SOC;',worker);let remote=structuredClone(s);
 const commands=[{type:'progression',command:{action:'claim-goal',goal:'progress.goal.bz'}},...S.issueExercises.referenceCommands('directional-media').map(command=>({type:'issue-exercises',command}))];
 for(const c of commands){s=S.dispatch(s,c);remote=worker.S.dispatch(remote,c);assert.equal(JSON.stringify(remote),JSON.stringify(s));}
 const before=JSON.stringify(s);assert.deepEqual(S.calculate(S.restore(before)),S.calculate(s));assert.equal(JSON.stringify(s),before);
 const orphan=structuredClone(s);delete orphan.campaign;assert.throws(()=>S.restore(JSON.stringify(orphan)),/PROGRESSION_CAMPAIGN_REQUIRED/);
 const forged=structuredClone(s);forged.issueExercises.steps['directional-media'][0]='invented';assert.throws(()=>S.restore(JSON.stringify(forged)),/INVALID_ISSUE_EXERCISE_SAVE/);
});
test('AC-SOC-160 learning controls respect locks and execute actual issue and achievement commands',()=>{
 const h=load(),w=h.dom.window;h.ev("window.__state=SOC.create({mode:'assessed'});window.__error=null;socApply=command=>{window.__state=SOC.dispatch(window.__state,command);};socError=error=>{window.__error=String(error.message||error);};");
 const render=locked=>{w.__locked=locked;h.ev("SCT.state=window.__state;SCT.locked=window.__locked;let m=document.getElementById('learning-test');if(!m){m=document.createElement('div');m.id='learning-test';document.body.appendChild(m);}m.innerHTML=socLearningExtensionsPanel(SCT.state,SOC.calculate(SCT.state));socBindLearningExtensions();");};
 const click=selector=>{const b=w.document.querySelector(selector);assert.ok(b,selector);b.click();assert.equal(w.__error,null);};
 render(false);assert.ok([...w.document.querySelectorAll('#learning-test button')].every(b=>b.disabled));render(true);assert.equal(w.document.querySelector('[data-learning=progression-start]').disabled,true);
 click('[data-learning=issue-start]');render(true);click('[data-issue-exercise=directional-media] [data-learning=issue-step]');assert.deepEqual(JSON.parse(JSON.stringify(w.__state.issueExercises.steps['directional-media'])),['provision-test-agents']);
 render(true);click('[data-learning=issue-cancel]');assert.equal(w.__state.issueExercises.active,null);
 h.ev("window.__state=SOC.dispatch(window.__state,{type:'campaign',command:{action:'start'}});");render(true);click('[data-learning=progression-start]');render(true);assert.equal(w.__state.progression.pack,'soc-progression-1');const claims=[...w.document.querySelectorAll('[data-learning=progression-claim]')];assert.equal(claims.length,32);assert.ok(claims.every(b=>b.disabled));const names=claims.map(b=>b.closest('article').querySelector('h3').textContent.trim());assert.equal(new Set(names).size,32);assert.match(w.document.querySelector('#learning-test').textContent,/fat-fingered forwarding rule has its own incident retrospective/);assert.ok(w.document.querySelector('[data-narrative="NAR-d627e32fc35fb70a"]'));assert.ok(names.includes('Regional communications MSP'));assert.ok(names.includes('International managed provider'));assert.ok(names.includes('Communications ecosystem group'));assert.doesNotMatch(names.join(' '),/\b(c3|c5|t2|t1|tb|t10|rd|level1)\b/);
 assert.deepEqual(h.errors,[]);h.dom.window.close();
});
