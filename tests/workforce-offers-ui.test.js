const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const {load}=require('./harness');

function rootFixture(){
 let s=SOC.create({scenario:'enterprise'});
 const dispatch=c=>{s=SOC.dispatch(s,c);};
 dispatch({type:'business',command:{action:'start'}});
 dispatch({type:'configure',id:'people',config:{people:2,entitlements:2,handlingMinutes:1,wrapMinutes:0,digitalConcurrency:1}});
 dispatch({type:'workforce',command:{action:'start'}});
 dispatch({type:'workforce',command:{action:'roster',people:['agent-a','agent-b'].map(id=>({id,employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:1,entitlements:[id==='agent-a'?'seat-01':'seat-02']}))}});
 dispatch({type:'advance',minutes:1});
 dispatch({type:'workforce',command:{action:'arrival',channel:'voice',skill:'service',language:'en',count:8,sampleMinutes:60}});
 return s;
}
function boot(state){
 const h=load(),w=h.dom.window;
 h.ev(`SCT.state=JSON.parse(${JSON.stringify(JSON.stringify(state))});SCT.locked=true;SCT.busy=false;window.__commands=[];window.__uiError=null;window.socApply=command=>{window.__commands.push(JSON.parse(JSON.stringify(command)));SCT.state=SOC.dispatch(SCT.state,{...command,expectedRevision:SCT.state.revision});window.__uiError=null;window.__renderWorkforceOffers();};window.socError=error=>{window.__uiError=String(error?.message||error);};window.__renderWorkforceOffers=()=>{let mount=document.getElementById('workforce-offers-test-mount');if(!mount){mount=document.createElement('div');mount.id='workforce-offers-test-mount';document.body.appendChild(mount);}const state=SCT.viewState||SCT.state;mount.innerHTML=socWorkforceOffersPanel(state,SOC.calculate(state));socBindWorkforceOffers(SCT.state);};window.__renderWorkforceOffers();`);
 const dispatch=c=>h.ev(`socApply(${JSON.stringify(c)});`),render=(locked=true)=>h.ev(`SCT.locked=${locked};window.__renderWorkforceOffers();`),submit=selector=>{const f=w.document.querySelector(selector);assert.ok(f,selector);f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 return {h,w,dispatch,render,submit,state:()=>JSON.parse(JSON.stringify(h.ev('SCT.state'))),commands:()=>JSON.parse(JSON.stringify(w.__commands)),error:()=>w.__uiError};
}

test('AC-SOC-528 workforce-offer UI provisions the fictional offer, repairs a failed integration, binds real roster coverage and forecasts through SOC dispatch',()=>{
 const h=boot(rootFixture()),w=h.w,initial=h.state(),beforePeople=structuredClone(initial.resources.people.effective),beforeRoutes=structuredClone(initial.resources.phone.desired.routes);
 const panel=()=>w.document.querySelector('#soc-workforce-offers');
 assert.ok(panel());assert.match(panel().textContent,/Queueberry/);
 const start=panel().querySelector('[data-workforce-offers-action="start"]');assert.equal(start.disabled,false);start.click();assert.equal(h.state().workforceOffers.tenant,'canopy-group');
 assert.match(panel().textContent,/do not add contact-routing seats or staffed service capacity/i);
 const order=w.document.querySelector('[data-workforce-offers="order"]');assert.ok(order);order.elements.units.value='2';h.submit('[data-workforce-offers="order"]');
 assert.equal(h.state().workforceOffers.effective,null);assert.equal(h.state().workforceOffers.provisioning.status,'pending');
 h.dispatch({type:'advance',minutes:1});assert.equal(h.state().workforceOffers.effective.units,2);assert.equal(h.state().workforceOffers.costRecords.length,1);assert.equal(h.state().workforceOffers.costRecords[0].periodMinutes,60);assert.equal(h.state().workforceOffers.costRecords[0].cents,8400);
 h.submit('[data-workforce-offers="integrate"]');assert.equal(h.state().workforceOffers.integration.effective,null);h.dispatch({type:'advance',minutes:1});assert.ok(h.state().workforceOffers.integration.effective);
 let observe=w.document.querySelector('[data-workforce-offers="observe"]');observe.elements.supplierAvailable.value='true';observe.elements.applicationAvailable.value='false';h.submit('[data-workforce-offers="observe"]');panel().querySelector('[data-workforce-offers-action="test"]').click();
 assert.equal(h.state().workforceOffers.integration.tests.at(-1).status,'failed');assert.equal(w.document.querySelector('[data-workforce-offers="forecast"] fieldset').disabled,true);
 observe=w.document.querySelector('[data-workforce-offers="observe"]');observe.elements.supplierAvailable.value='true';observe.elements.applicationAvailable.value='true';h.submit('[data-workforce-offers="observe"]');panel().querySelector('[data-workforce-offers-action="test"]').click();assert.equal(h.state().workforceOffers.integration.tests.at(-1).status,'passed');
 for(const person of ['agent-a','agent-b']){const form=w.document.querySelector('[data-workforce-offers="bind"]');form.elements.person.value=person;h.submit('[data-workforce-offers="bind"]');}
 const forecast=w.document.querySelector('[data-workforce-offers="forecast"]');assert.equal(forecast.querySelector('fieldset').disabled,false);h.submit('[data-workforce-offers="forecast"]');
 const result=SOC.calculate(h.state()).workforceOffers.integration.forecasts.at(-1);assert.deepEqual(result.coveredPeople,['agent-a','agent-b']);assert.equal(result.arrivals,8);assert.equal(result.stale,false);
 assert.deepEqual(h.state().resources.people.effective,beforePeople);assert.deepEqual(h.state().resources.phone.desired.routes,beforeRoutes);assert.deepEqual(h.state().workforceOps.roster.effective.map(x=>x.id),['agent-a','agent-b']);
 assert.deepEqual(h.commands().filter(x=>x.type==='workforce-offers').map(x=>x.command.action),['start','order','integrate','observe-integration','test-integration','observe-integration','test-integration','bind-person','bind-person','forecast']);assert.equal(h.error(),null);assert.deepEqual(h.h.errors,[]);w.close();
});

test('AC-SOC-529 workforce-offer UI is read-only when the save is unlocked and rendering does not mutate state',()=>{
 const h=boot(rootFixture()),w=h.w;h.w.document.querySelector('[data-workforce-offers-action="start"]').click();
 const before=JSON.stringify(h.state());h.render(false);assert.equal(JSON.stringify(h.state()),before);const section=w.document.querySelector('#soc-workforce-offers');
 for(const control of section.querySelectorAll('button,input,select'))assert.equal(control.disabled,true);
 const form=section.querySelector('[data-workforce-offers="order"]');if(form)h.submit('[data-workforce-offers="order"]');assert.equal(JSON.stringify(h.state()),before);assert.equal(h.commands().length,1);assert.deepEqual(h.h.errors,[]);w.close();
});
