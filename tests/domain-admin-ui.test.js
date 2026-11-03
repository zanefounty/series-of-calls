const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');

function boot(){
 const {dom,ev,errors}=load(),w=dom.window;
 ev(`window.__commands=[];window.__uiState=null;window.__uiError=null;window.__mockCampaign=false;socApply=(command)=>{window.__commands.push(JSON.parse(JSON.stringify(command)));if(window.__uiState&&!(window.__mockCampaign&&command.type==='campaign'))window.__uiState=SOC.dispatch(window.__uiState,command);};socError=(error)=>{window.__uiError=String(error?.message||error);};`);
 const render=(state,locked=true)=>{w.__uiState=state;w.__locked=locked;ev(`SCT.state=window.__uiState;SCT.locked=window.__locked;let mount=document.getElementById('domain-test-mount');if(!mount){mount=document.createElement('div');mount.id='domain-test-mount';document.body.appendChild(mount);}mount.innerHTML=socDomainAdminPanel(SCT.state,SOC.calculate(SCT.state));socBindDomainAdmin();`);};
 const submit=selector=>{const form=w.document.querySelector(selector);assert.ok(form,selector);form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));if(w.__uiError)throw Error(w.__uiError);};
 const commands=()=>JSON.parse(JSON.stringify(w.__commands));
 return {dom,w,ev,errors,render,submit,commands};
}

test('domain administration start buttons and read-only locks use shared dispatch only',()=>{
 const h=boot(),s=h.ev('SOC.create()');h.render(s,false);
 for(const id of ['transport','boundaries']){const button=h.w.document.querySelector(`#soc-domain-${id} button[type=submit]`);assert.ok(button);assert.equal(button.disabled,true);}
 assert.match(h.w.document.getElementById('soc-domain-admin').textContent,/Read only/);
 h.render(s,true);h.submit('[data-domain-start=transport]');h.submit('[data-domain-start=boundaries]');
 assert.deepEqual(h.commands().map(x=>x.type),['transport','boundaries']);assert.deepEqual(h.commands().map(x=>x.command),[{action:'start'},{action:'start'}]);
 h.dom.window.close();
});

test('transport form dispatches viable synthetic site and purchased or owned link configs',()=>{
 const h=boot();let s=h.ev("(()=>{let x=SOC.create();x=SOC.dispatch(x,{type:'transport',command:{action:'start'}});return x;})()");h.w.__uiState=s;h.render(s,true);
 h.submit('[data-domain-form=site]');assert.equal(h.commands().at(-1).command.action,'site');assert.equal(h.commands().at(-1).command.id,'desk-site');assert.equal(h.commands().at(-1).command.config.region,s.jurisdiction);
 s=h.w.__uiState;h.render(s,true);h.submit('[data-domain-form=service-site]');assert.equal(h.commands().at(-1).command.id,'service-site');
 s=h.w.__uiState;h.render(s,true);const link=h.w.document.querySelector('[data-domain-form=link]');link.elements.id.value='purchased-edge';link.elements.mode.value='purchased';link.elements.contract.value='';h.submit('[data-domain-form=link]');
 let command=h.commands().at(-1).command;assert.equal(command.action,'link');assert.equal(command.config.mode,'purchased');assert.equal(command.config.contract,null);assert.equal(command.config.capacityMbps,100);
 s=h.w.__uiState;h.render(s,true);h.submit('[data-domain-form=observe-link]');command=h.commands().at(-1).command;assert.deepEqual(command,{action:'observe',kind:'link',id:'purchased-edge',available:true,power:true});
 s=h.w.__uiState;h.render(s,true);const owned=h.w.document.querySelector('[data-domain-form=link]');owned.elements.id.value='owned-edge';owned.elements.mode.value='owned';owned.elements.contract.value='ignored-contract';h.submit('[data-domain-form=link]');command=h.commands().at(-1).command;assert.equal(command.config.mode,'owned');assert.equal(command.config.contract,null);
 assert.equal(h.w.__uiError,null);h.dom.window.close();
});

test('boundary form stages typed requirements and flows, records observations, and binds a real resource',()=>{
 const h=boot();let s=h.ev("(()=>{let x=SOC.create();x=SOC.dispatch(x,{type:'boundaries',command:{action:'start'}});return x;})()");h.w.__uiState=s;h.render(s,true);
 const form=h.w.document.querySelector('[data-domain-form=contract]');assert.ok(form);assert.ok(form.querySelector('[data-domain-flow-row]'));form.querySelector('[data-domain-add-flow]').click();assert.equal(form.querySelectorAll('[data-domain-flow-row]').length,2);h.submit('[data-domain-form=contract]');
 const defaultResource=Object.keys(s.resources).includes('identity')?'identity':Object.keys(s.resources)[0];let command=h.commands().at(-1).command;assert.equal(command.action,'contract');assert.equal(command.contract.id,'fictional-contract');assert.equal(command.contract.profile,s.jurisdiction);assert.equal(command.contract.flows[0].resource,defaultResource);assert.deepEqual(command.contract.requirements.processingRegions,[s.jurisdiction]);
 s=h.w.__uiState;h.render(s,true);h.submit('[data-domain-form=contract-observe]');command=h.commands().at(-1).command;assert.equal(command.action,'observe');assert.equal(command.observed.adminPathAvailable,false);assert.equal(command.observed.localLicenceGraceExpiresAt,s.clock+60);
 s=h.w.__uiState;h.render(s,true);h.submit('[data-domain-form=contract-bind]');command=h.commands().at(-1).command;assert.deepEqual(command,{action:'bind',resource:defaultResource,contract:'fictional-contract'});assert.equal(h.w.__uiState.boundaries.bindings[defaultResource],'fictional-contract');
 assert.ok(h.w.document.querySelector('#soc-domain-boundaries .soc-domain-contract details summary'));
 h.dom.window.close();
});

test('domain panel renders actual enforcement separately from declared evaluation and is pure',()=>{
 const h=boot();let s=h.ev("(()=>{let x=SOC.create();x=SOC.dispatch(x,{type:'boundaries',command:{action:'start'}});return x;})()");const dispatch=command=>{h.w.__uiState=s;return s=h.ev(`SOC.dispatch(window.__uiState,${JSON.stringify(command)})`);};
 const resource=Object.keys(s.resources).includes('identity')?'identity':Object.keys(s.resources)[0];const contract={id:'fictional-contract',workload:'service-records',profile:s.jurisdiction,sensitivity:'confidential',edition:'standard',productVersion:'release-1',offeringEvidence:'pending',customerAuthorization:'approved',agencyAuthorizationRequired:false,agencyAuthorization:'not-required',serviceRegistration:'not-registered',serviceRegistrationId:null,usesAi:false,aiUseDecision:'not-required',language:'en',supportLanguage:'en',requirements:{processingRegions:[s.jurisdiction],storageRegions:[s.jurisdiction],backupRegions:[s.jurisdiction],keyRegions:[s.jurisdiction],adminRegions:[s.jurisdiction],supportRegions:[s.jurisdiction],allowedAccessRoles:['agent'],adminAuthorization:'customer-approved',continuity:'cloud',allowedTransferMechanisms:[]},flows:[{id:'identity-flow',resource,informationClass:'confidential',processingRegions:[s.jurisdiction],storageRegions:[s.jurisdiction],backupRegions:[s.jurisdiction],keyCustodyRegions:[s.jurisdiction],adminLocations:[s.jurisdiction],supportRegions:[s.jurisdiction],adminAuthorization:'customer-approved',accessRoles:['agent'],connectivity:'cloud',continuity:'cloud',licenceMode:'cloud',transfer:{parties:[],mechanism:null}}]};
 s=dispatch({type:'boundaries',command:{action:'contract',contract}});s=dispatch({type:'boundaries',command:{action:'observe',contract:contract.id,observed:{connected:true,cloudLicenceAvailable:true,localLicenceGraceActive:false,localLicenceGraceExpiresAt:null,localServicesAvailable:false,localKeyCustodyAvailable:false,adminPathAvailable:true,adminPathLocation:s.jurisdiction}}});s=dispatch({type:'boundaries',command:{action:'bind',resource:contract.flows[0].resource,contract:contract.id}});s=dispatch({type:'advance',minutes:1});
 const before=JSON.stringify(s);h.render(s,true);const text=h.w.document.querySelector('#soc-domain-boundaries').textContent;assert.match(text,/Operational/);assert.match(text,/Declared contract eligibility/);assert.equal(JSON.stringify(s),before);assert.equal(h.w.__uiError,null);h.dom.window.close();
});

test('campaign panel exposes named progression windows and dispatches only the campaign module API',()=>{
 const h=boot();let s=h.ev("(()=>{let x=SOC.create();x.campaign=SOC_CAMPAIGN.create(x);return x;})()");h.w.__mockCampaign=true;h.render(s,true);
 const panel=h.w.document.getElementById('soc-domain-campaign');assert.match(panel.textContent,/campaign-/);assert.match(panel.textContent,/soc-campaign-content/);assert.match(panel.textContent,/paused snapshot/i);assert.match(panel.textContent,/not four simultaneous businesses/i);
 h.submit('[data-domain-form=campaign-select]');h.submit('[data-domain-form=campaign-window]');h.submit('[data-domain-form=campaign-inject]');h.submit('[data-domain-form=campaign-assess]');
 assert.deepEqual(h.commands().map(x=>x.command),[{action:'select-track',track:'smb'},{action:'open-window',kind:'baseline'},{action:'inject-incident'},{action:'assess',track:'smb'}]);assert.ok(h.commands().every(x=>x.type==='campaign'));
 h.dom.window.close();
});

test('campaign starter stays disabled outside the SMB scenario',()=>{
 const h=boot(),s=h.ev("(()=>{let x=SOC.create();x.scenario='government';return x;})()");h.render(s,true);
 assert.match(h.w.document.querySelector('#soc-domain-campaign').textContent,/Start campaigns from an SMB scenario/i);assert.equal(h.w.document.querySelector('#soc-domain-campaign button').disabled,true);assert.equal(h.commands().length,0);h.dom.window.close();
});

test('campaign UI displays authoritative assessment and gates incident controls by the real observation window',()=>{
 const h=boot();let s=h.ev("(()=>{let x=SOC.create();x=SOC.dispatch(x,{type:'campaign',command:{action:'start'}});for(const c of SOC.reference(x))x=SOC.dispatch(x,c);return x;})()");
 h.render(s);assert.match(h.w.document.querySelector('.soc-campaign-guide').textContent,/fresh case ID/);
 h.submit('[data-domain-form=campaign-window]');s=h.w.__uiState;h.render(s);
 assert.equal(h.w.document.querySelector('[data-domain-form=campaign-inject] button').disabled,true);
 h.w.__uiState=s;h.ev("window.__uiState=SOC.dispatch(window.__uiState,{type:'advance',minutes:1});");s=h.w.__uiState;h.render(s);
 assert.doesNotMatch(h.w.document.querySelector('#soc-domain-campaign').textContent,/EVIDENCE_STALE/);
 const form=h.w.document.querySelector('[data-domain-form=campaign-window]');form.elements.kind.value='recovery';h.submit('[data-domain-form=campaign-window]');s=h.w.__uiState;h.render(s);
 assert.equal(h.w.document.querySelector('[data-domain-form=campaign-inject] button').disabled,false);h.submit('[data-domain-form=campaign-inject]');s=h.w.__uiState;h.render(s);
 assert.equal(h.w.document.querySelector('[data-domain-form=campaign-recover] button').disabled,true);
 h.w.__uiState=s;h.ev("window.__uiState=SOC.dispatch(window.__uiState,{type:'advance',minutes:1});");s=h.w.__uiState;h.render(s);assert.equal(h.w.document.querySelector('[data-domain-form=campaign-recover] button').disabled,false);
 h.submit('[data-domain-form=campaign-recover]');assert.equal(h.w.__uiState.resources.carrier.fault,null);assert.equal(h.w.__uiError,null);h.dom.window.close();
});
