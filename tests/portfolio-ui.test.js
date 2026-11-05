const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {load}=require('./harness');
const ui=fs.readFileSync(path.join(__dirname,'..','src','game','84-portfolio-ui.js'),'utf8');

function boot(){
 const h=load(),w=h.dom.window;
 h.ev(ui);
 h.ev(`window.__commands=[];window.socApply=command=>{window.__commands.push(JSON.parse(JSON.stringify(command)));const selected=SCT.state.portfolio?.selectedCustomer;if(selected&&!['portfolio','advance'].includes(command.type))command={type:'portfolio',command:{action:'dispatchcustomer',customerId:selected,command}};SCT.state=SOC.dispatch(SCT.state,{...command,expectedRevision:SCT.state.revision});window.__renderPortfolio();};window.socError=error=>{window.__uiError=String(error?.message||error);};window.__renderPortfolio=()=>{let mount=document.getElementById('portfolio-ui-test-mount');if(!mount){mount=document.createElement('div');mount.id='portfolio-ui-test-mount';document.body.appendChild(mount);}mount.innerHTML=socPortfolioPanel();socBindPortfolio();};`);
 const render=state=>{w.__state=state;w.__uiError=null;h.ev('SCT.state=window.__state;window.__renderPortfolio();');};
 const state=()=>h.ev('SCT.state');
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));if(w.__uiError)throw Error(w.__uiError);};
 const commands=()=>JSON.parse(JSON.stringify(w.__commands));
 return {...h,w,render,state,submit,commands};
}

test('AC-SOC-186 portfolio controls use locked shared dispatch to add, select, activate and deactivate customers',()=>{
 const h=boot(),w=h.w;let state=h.ev('SOC.create()');h.ev('SCT.locked=true;');h.render(state);
 assert.match(w.document.querySelector('#soc-portfolio').textContent,/Customer portfolio/);
 const start=w.document.querySelector('[data-portfolio-action=start]');assert.ok(start);assert.equal(start.disabled,false);
 h.ev('SCT.locked=false;');h.render(h.state());assert.equal(w.document.querySelector('[data-portfolio-action=start]').disabled,true);
 h.ev('SCT.locked=true;');h.render(h.state());w.document.querySelector('[data-portfolio-action=start]').click();
 assert.deepEqual(h.commands().at(-1),{type:'portfolio',command:{action:'start'}});
 const form=w.document.querySelector('[data-portfolio-add]');form.elements.id.value='harbour-health';form.elements.tenant.value='tenant-harbour';form.elements.name.value='Harbour Health';form.elements.market.value='au-sydney';form.elements.scenario.value='smb';h.submit('[data-portfolio-add]');
 state=h.state();assert.equal(state.portfolio.customers[0].root.tenant,'tenant-harbour');assert.equal(state.portfolio.customers[0].root.jurisdiction,'AU');
 const select=w.document.querySelector('[data-portfolio-select]');select.elements.customerId.value='';h.submit('[data-portfolio-select]');assert.equal(h.state().portfolio.selectedCustomer,null);
 h.render(h.state());const selector=w.document.querySelector('[data-portfolio-select]');selector.elements.customerId.value='harbour-health';h.submit('[data-portfolio-select]');assert.equal(h.state().portfolio.selectedCustomer,'harbour-health');
 h.ev("socApply({type:'advance',minutes:1});");h.render(h.state());w.document.querySelector('[data-portfolio-action=deactivate]').click();assert.equal(h.state().portfolio.customers[0].active,false);
 h.render(h.state());w.document.querySelector('[data-portfolio-action=activate]').click();assert.equal(h.state().portfolio.customers[0].active,true);
 assert.ok(h.commands().every(x=>x.type==='portfolio'||x.type==='advance'));
 assert.equal(w.__uiError,null);assert.deepEqual(h.errors,[]);h.dom.window.close();
});

test('AC-SOC-187 portfolio panel displays actual business finance and separates opening capital from profit',()=>{
 const h=boot(),w=h.w;let state=h.ev("(()=>{let x=SOC.create();x=SOC.dispatch(x,{type:'portfolio',command:{action:'start'}});x=SOC.dispatch(x,{type:'portfolio',command:{action:'addcustomer',id:'sydney-shop',tenant:'tenant-sydney-shop',name:'Sydney Shop',market:'au-sydney',scenario:'smb'}});return x;})()");h.render(state);
 h.ev("socApply({type:'business',command:{action:'start'}});");
 let root=h.state().portfolio.customers[0].root,offer=h.ev('SOC.business.offers.access'),resources=Object.values(root.resources).filter(r=>offer.kinds.includes(r.kind)).map(r=>r.id);
 h.ev(`window.socApply({type:'business',command:{action:'order',offer:'access',quantity:${offer.minimum},unit:'${offer.unit}',currency:'AUD',resources:${JSON.stringify(resources)},sell:true}});`);
 h.ev("socApply({type:'advance',minutes:60});");h.render(h.state());
 const text=w.document.querySelector('#soc-portfolio').textContent;assert.match(text,/Opening capital/);assert.match(text,/Cash including opening capital/);assert.match(text,/Operating profit \(revenue minus cost\)/);assert.match(text,/1000\.00 AUD/);assert.ok(h.state().portfolio.customers[0].root.business.balance.revenue>0);
 assert.equal(w.__uiError,null);assert.deepEqual(h.errors,[]);h.dom.window.close();
});

test('AC-SOC-194 assembled Lab console configures the selected child, ticks every child, returns to root view, and restores save',()=>{
 const h=load(),w=h.dom.window;h.ev("SCT.state=SOC.create({scenario:'smb',jurisdiction:'AU',mode:'sandbox'});SCT.locked=true;SCT.selected='phone';socRender();");
 assert.ok(w.document.querySelector('#soc-portfolio [data-portfolio-action=start]'));
 w.document.querySelector('#soc-portfolio [data-portfolio-action=start]').click();
 let form=w.document.querySelector('#soc-portfolio [data-portfolio-add]');form.elements.id.value='portfolio-child';form.elements.tenant.value='tenant-portfolio-child';form.elements.name.value='Portfolio Child';form.elements.market.value='au-sydney';form.elements.scenario.value='smb';form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(h.ev('SCT.viewState.tenant'),'tenant-portfolio-child');assert.equal(h.ev('SCT.viewState.resources.people.desired.people'),0);
 w.document.querySelector('.soc-nav [data-id=people]').click();
 const config=w.document.querySelector('#soc-config');config.elements.people.value='2';config.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(h.ev("SCT.state.portfolio.customers[0].root.resources.people.desired.people"),2);assert.equal(h.ev("SCT.state.resources.people.desired.people"),0);
 const before=h.ev('SOC.calculate(SCT.state).clock');w.document.querySelector('[data-soc=minute]').click();
 assert.equal(h.ev('SOC.calculate(SCT.state).clock'),before+1);assert.equal(h.ev('SCT.state.portfolio.customers[0].root.clock'),before+1);
 const select=w.document.querySelector('#soc-portfolio [data-portfolio-select]');select.elements.customerId.value='';select.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(h.ev('SCT.viewState===SCT.state'),true);
 const restored=h.ev('SOC.restore(JSON.stringify(SCT.state))');assert.equal(restored.portfolio.customers[0].root.resources.people.desired.people,2);assert.equal(restored.portfolio.customers[0].root.clock,restored.clock);
 assert.deepEqual(h.errors,[]);w.close();
});
