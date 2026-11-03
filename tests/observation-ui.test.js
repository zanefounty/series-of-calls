const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('./harness');
const SOC=require('../src/game/55-communications');
const ui=fs.readFileSync(path.join(__dirname,'..','src','game','83-observation-ui.js'),'utf8');
function boot(root){
 const h=load(),w=h.dom.window;h.ev(ui);w.__testRoot=JSON.parse(JSON.stringify(root));
 h.ev(`window.__commands=[];SCT.state=window.__testRoot;SCT.locked=true;window.socApply=command=>{window.__commands.push(JSON.parse(JSON.stringify(command)));SCT.state=SOC.dispatch(SCT.state,{...command,expectedRevision:SCT.state.revision});window.__renderObservation();};window.socError=error=>{window.__uiError=String(error?.message||error);};window.__renderObservation=()=>{let mount=document.getElementById('observation-ui-test-mount');if(!mount){mount=document.createElement('div');mount.id='observation-ui-test-mount';document.body.appendChild(mount);}const state=SCT.viewState||SCT.state;mount.innerHTML=socObservationPanel(state,SOC.calculate(state));socBindObservation();};window.__renderObservation();`);
 const render=()=>h.ev('window.__renderObservation();'),state=()=>h.ev('SCT.state');
 const advance=n=>h.ev(`socApply({type:'advance',minutes:${n}});`);
 return {...h,w,render,state,advance,commands:()=>JSON.parse(JSON.stringify(w.__commands))};
}
function continuityRoot(){
 let s=SOC.create({scenario:'enterprise',mode:'assessed'});
 for(const c of SOC.reference(s))s=SOC.dispatch(s,c);
 s=SOC.dispatch(s,{type:'transport',command:{action:'start'}});
 for(const [id,region,domain] of [['origin','AU','origin-site'],['destination','AU','destination-site']])s=SOC.dispatch(s,{type:'transport',command:{action:'site',id,config:{name:id,region,domain}}});
 for(const [id,domain,latencyMs] of [['path-a','fault-a',20],['path-b','fault-b',40]])s=SOC.dispatch(s,{type:'transport',command:{action:'link',id,config:{from:'origin',to:'destination',mode:'owned',capacityMbps:10,latencyMs,domain,leadMinutes:1,setupCents:0,periodCents:0,contract:null}}});
 for(const [resource,site] of [['identity','origin'],['service','destination']])s=SOC.dispatch(s,{type:'transport',command:{action:'bind',resource,site}});
 s=SOC.dispatch(s,{type:'workforce',command:{action:'start'}});
 const person=(id,seat)=>({id,employer:'orchard-msp',skills:['service'],languages:['en'],shiftStart:0,shiftEnd:1440,available:true,digitalConcurrency:2,entitlements:[seat]});
 s=SOC.dispatch(s,{type:'workforce',command:{action:'roster',people:[person('agent-a','seat-01'),person('agent-b','seat-02')]}});
 s=SOC.dispatch(s,{type:'advance',minutes:2});
 s=SOC.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'continuity-case'});
 s=SOC.dispatch(s,{type:'advance',minutes:10});
 assert.equal(s.interactions.at(-1).phase,'resolved');assert.equal(SOC.transport.resourcePath(s,'identity','service','voice').ready,true);
 return SOC.dispatch(s,{type:'service-observation',command:{action:'start'}});
}

test('AC-SOC-195 observation controls start a real pack and window; thresholds, guides, live counts and closure are visible',()=>{
 let root=SOC.create({scenario:'smb',mode:'assessed'});for(const command of SOC.reference(root))root=SOC.dispatch(root,command);
 const h=boot(root),w=h.w;assert.ok(w.document.querySelector('[data-observation-action=start]'));
 w.document.querySelector('[data-observation-action=start]').click();assert.equal(h.state().serviceObservation.pack,SOC.serviceObservation.PACK);
 h.render();const card=w.document.querySelector('[data-observation-goal=tb]');assert.match(card.textContent,/Sustained service/);assert.match(card.textContent,/12/);assert.match(card.textContent,/Provision two named people/);
 card.querySelector('[data-observation-action=open]').click();assert.equal(h.state().serviceObservation.active.goal,'tb');
 h.advance(1);h.render();assert.match(w.document.querySelector('[data-observation-goal=tb]').textContent,/1 \/ 10/);assert.match(w.document.querySelector('[data-observation-goal=tb]').textContent,/observing/i);
 h.advance(9);h.render();const closed=w.document.querySelector('[data-observation-window]');assert.ok(closed);assert.match(closed.textContent,/failed/i);assert.match(closed.textContent,/10/);assert.equal(w.document.querySelectorAll('[data-observation-proof]').length,0);
 assert.deepEqual(h.commands().map(x=>x.command?.action||x.type),['start','open-window','advance','advance']);assert.equal(w.__uiError,undefined);assert.deepEqual(h.errors,[]);w.close();
});

test('AC-SOC-196 continuity controls only dispatch after a real baseline, sampled fault and recovery gate',()=>{
 const h=boot(continuityRoot()),w=h.w;w.document.querySelector('[data-observation-goal=rd] [data-observation-action=open]').click();
 let active=h.state().serviceObservation.active;assert.ok(active.rd.baseline);assert.equal(w.document.querySelector('[data-observation-action=inject]').disabled,false);assert.equal(w.document.querySelector('[data-observation-action=recover]').disabled,true);
 w.document.querySelector('[data-observation-action=inject]').click();const domain=h.state().serviceObservation.active.rd.failedDomain;assert.equal(h.state().transport.domains[domain],true);
 h.render();assert.equal(w.document.querySelector('[data-observation-action=recover]').disabled,true);
 h.advance(1);h.render();assert.ok(h.state().serviceObservation.active.rd.faultSamples>=1);assert.equal(w.document.querySelector('[data-observation-action=recover]').disabled,false);
 w.document.querySelector('[data-observation-action=recover]').click();assert.equal(h.state().transport.domains[domain],false);
 h.advance(9);h.render();assert.equal(h.state().serviceObservation.windows[0].status,'failed');assert.match(w.document.querySelector('[data-observation-window]').textContent,/rd.*failed/i);
 assert.ok(h.commands().some(x=>x.command?.action==='inject-incident'));assert.ok(h.commands().some(x=>x.command?.action==='recover-incident'));assert.equal(w.__uiError,undefined);assert.deepEqual(h.errors,[]);w.close();
});

test('observation checks use readable labels and source notes preserve bandwidth units',()=>{
 let root=SOC.create({scenario:'smb',mode:'assessed'});for(const command of SOC.reference(root))root=SOC.dispatch(root,command);
 root=SOC.dispatch(root,{type:'service-observation',command:{action:'start'}});
 root=SOC.dispatch(root,{type:'service-observation',command:{action:'open-window',goal:'tb'}});
 const h=boot(root),text=h.w.document.querySelector('#soc-observation').textContent;
 for(const key of ['duration','consecutive','configuration','resources','rdEvidence','sameCase','independentPath'])assert.doesNotMatch(text,new RegExp(`${key}:`));
 assert.match(text,/1 Tbps \(1,000 Gbit\/s\)/);assert.match(text,/10 Tbps \(10,000 Gbit\/s\)/);assert.doesNotMatch(text,/served-request/i);
 h.w.close();
});
