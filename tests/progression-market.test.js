const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const H=require('./helpers/market-fixture'),S=H.SOC;
const goal=id=>`progress.goal.${id}`,level=n=>`progress.progression-level.${n}`;
function boot(options={}){
 let s=H.setup(options);
 s=H.dispatch(s,{type:'campaign',command:{action:'start'}});
 s=H.dispatch(s,{type:'progression',command:{action:'start'}});
 return s;
}
function claim(s,type,id){return H.dispatch(s,{type:'progression',command:{action:type==='goal'?'claim-goal':'claim-level',[type==='goal'?'goal':'level']:id}});}
function runWindow(s,qualification){s=H.startPack(s);s=H.open(s,qualification);return H.tick(s,60);}

test('AC-SOC-219 c3, c5 and t2 market goals award only after real sampled commercial evidence',()=>{
 let s=runWindow(boot(),'c3');assert.equal(s.marketQualification.windows.at(-1).status,'passed');assert.equal(S.calculate(s).progression.goals[goal('c3')].status,'ready');s=claim(s,'goal',goal('c3'));assert.equal(s.progression.goals[goal('c3')].status,'earned');
 let five=H.fixtures.slice(),m=runWindow(boot({customers:five}),'c5');assert.equal(m.marketQualification.windows.at(-1).result.checks.c5Markets,true);m=claim(m,'goal',goal('c5'));assert.equal(m.progression.goals[goal('c5')].status,'earned');
 let t=runWindow(boot({productsFor:['cust-sydney','cust-seattle']}),'t2');assert.equal(t.marketQualification.windows.at(-1).result.checks.t2Target,true);t=claim(t,'goal',goal('t2'));assert.equal(t.progression.goals[goal('t2')].status,'earned');
});

test('AC-SOC-220 c5/t2/level-2/level-7 reject missing markets, deployment and human journeys',()=>{
 assert.throws(()=>H.open(H.startPack(boot({customers:H.fixtures.slice(0,3)})),'c5'),/MARKET_QUALIFICATION_COHORT_INSUFFICIENT/);
 assert.throws(()=>H.open(H.startPack(boot()),'t2'),/MARKET_QUALIFICATION_(INTEGRATION_REQUIRED|COHORT_INSUFFICIENT)/);
 let two=H.fixtures.slice(0,2),s=boot({customers:two});s=H.startPack(s);s=H.open(s,'level-2');s=H.tick(s,60);assert.equal(s.marketQualification.windows.at(-1).status,'failed');assert.equal(s.marketQualification.windows.at(-1).result.checks.level2HumanCase,false);
 let five=boot({customers:H.fixtures});five=H.startPack(five);assert.throws(()=>H.open(five,'level-7'),/MARKET_QUALIFICATION_PARTICIPANT_UNREADY/);
 let staffed=boot({customers:H.fixtures,viaCustomers:H.fixtures.map(x=>x.id)});staffed=H.startPack(staffed);staffed=H.open(staffed,'level-7');staffed=H.tick(staffed,60);assert.equal(staffed.marketQualification.windows.at(-1).status,'passed');staffed=claim(staffed,'level',level(7));assert.equal(staffed.progression.levels[level(7)].status,'earned');
 let journeys=boot({customers:two});journeys=H.startPack(journeys);journeys=H.open(journeys,'level-2');for(const c of two)journeys=H.dispatchCustomer(journeys,c.id,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:`market-human-${c.id}`});journeys=H.tick(journeys,60);assert.equal(journeys.marketQualification.windows.at(-1).status,'passed');journeys=claim(journeys,'level',level(2));assert.equal(journeys.progression.levels[level(2)].status,'earned');
});

test('AC-SOC-221 t1 and level 13 require four customer scenarios, continuity, profit and three provider roles',()=>{
 let s=boot({customers:H.fixtures,roleByCustomer:{'cust-melbourne':'twig-integrations','cust-seattle':'people-orchard','cust-dublin':'twig-integrations'}});
 s=H.addContinuityEvidence(s,H.fixtures.map(x=>x.id));s=runWindow(s,'t1');assert.equal(s.marketQualification.windows.at(-1).status,'passed');assert.equal(S.calculate(s).progression.goals[goal('t1')].status,'ready');s=claim(s,'goal',goal('t1'));assert.equal(s.progression.goals[goal('t1')].status,'earned');
 let roles={'cust-melbourne':'twig-integrations','cust-seattle':'people-orchard','cust-dublin':'twig-integrations'};
 let l=boot({customers:H.fixtures,roleByCustomer:roles,viaCustomers:H.fixtures.map(x=>x.id)});l=H.addContinuityEvidence(l,H.fixtures.map(x=>x.id));l=runWindow(l,'level-13');assert.equal(l.marketQualification.windows.at(-1).status,'passed');l=claim(l,'level',level(13));assert.equal(l.progression.levels[level(13)].status,'earned');
});

test('AC-SOC-222 market awards are durable, bounded, once-only, worker-equivalent and inspection is pure',()=>{
 let s=runWindow(boot(),'c3');s=claim(s,'goal',goal('c3'));const saved=JSON.stringify(s);assert.deepEqual(S.restore(saved),s);const box={};vm.createContext(box);vm.runInContext(S.workerSource()+';globalThis.engine=SOC;',box);const command={type:'progression',command:{action:'claim-goal',goal:goal('c3')}};assert.equal(JSON.stringify(box.engine.dispatch(S.restore(saved),command)),JSON.stringify(H.dispatch(S.restore(saved),command)));
 const before=JSON.stringify(s);S.calculate(s);S.calculate(s);assert.equal(JSON.stringify(s),before);assert.equal(H.dispatch(s,command).progression.awards.length,1);
 let tampered=JSON.parse(saved);tampered.progression.goals[goal('c3')].evidence.evidence.proof.result.status='failed';assert.throws(()=>S.validateState(tampered),/INVALID_PROGRESSION_GOAL/);
});
