const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const Needs=require('../src/game/26-customer-needs.js');

function fixture(){const root={clock:0};root.customerNeeds=Needs.create(root);return root;}
function select(root,segment,id=`profile-${segment}`){return Needs.command(root,{action:'select',segment,id});}

test('AC-SOC-438 all four source-linked segment seeds keep scale, sector, geography, sensitivity, people and workloads distinct',()=>{
 const root=fixture();for(const segment of ['smb','enterprise','government','defence'])select(root,segment);
 const rows=Needs.inspect(root).profiles;assert.equal(rows.length,4);assert.deepEqual(rows.map(x=>x.sourceId),Needs.SOURCES);
 const smb=rows[0],enterprise=rows[1],government=rows[2],defence=rows[3];
 assert.deepEqual([smb.scale.employees,smb.scale.sites,smb.scale.seats,smb.scale.agents,smb.scale.rooms],[35,1,28,4,1]);
 assert.ok(enterprise.personas.some(x=>x.id==='frontline'&&x.needs.includes('phone-heavy-calling')));assert.ok(enterprise.personas.some(x=>x.id==='room-users'));
 assert.ok(government.workloads.some(x=>x.id==='case-records'));assert.ok(government.administration.model==='controlled-delegation');
 assert.deepEqual(defence.workloads.map(x=>[x.id,x.sensitivity,x.disconnectedRequired]),[['administration','internal',false],['training','confidential',false],['restricted-operations','restricted',true]]);
 assert.ok(rows.every(x=>x.approval.includes('no authorization')));
});

test('AC-SOC-439 independent edits provision before becoming effective and do not cross-edit unrelated dimensions',()=>{
 const root=fixture();select(root,'government');const p=root.customerNeeds.profiles[0];
 Needs.command(root,{action:'configure',id:p.id,section:'sector',value:'local-government'});
 Needs.command(root,{action:'configure',id:p.id,section:'sensitivity',value:'internal'});
 Needs.command(root,{action:'configure',id:p.id,section:'scale',value:{employees:2200,sites:36,seats:1400,agents:180,rooms:28}});
 Needs.command(root,{action:'configure',id:p.id,section:'geography',value:{jurisdictions:['US'],siteRegions:Array(32).fill('US'),remoteRegions:['EU']}});
 const before=Needs.inspect(root).profiles[0];assert.equal(before.sector,'local-government');assert.equal(before.sensitivity,'internal');assert.equal(before.scale.sites,36);assert.equal(before.geography.jurisdictions[0],'US');assert.equal(before.geography.siteRegions.length,32);assert.equal(before.provisioning.status,'pending');assert.equal(before.effective,null);
 root.clock=1;Needs.advance(root);const applied=Needs.inspect(root).profiles[0];assert.equal(applied.provisioning.status,'ready');assert.equal(applied.effective.sector,'local-government');assert.equal(applied.effective.sensitivity,'internal');assert.equal(applied.effective.scale.employees,2200);assert.equal(applied.observed.status,'profile-applied');
});

test('AC-SOC-440 invalid need edits fail atomically; correct dimensions recover through a later revision',()=>{
 const root=fixture();select(root,'smb');const profile=root.customerNeeds.profiles[0];root.clock=1;Needs.advance(root);
 const before=JSON.stringify(root);assert.throws(()=>Needs.command(root,{action:'configure',id:profile.id,section:'scale',value:{employees:20,sites:-1,seats:28,agents:4,rooms:1}}),/INVALID_CUSTOMER_PROFILE_DIMENSIONS/);assert.equal(JSON.stringify(root),before);
 Needs.command(root,{action:'configure',id:profile.id,section:'scale',value:{employees:40,sites:1,seats:18,agents:3,rooms:1}});root.clock=2;Needs.advance(root);
 assert.equal(root.customerNeeds.profiles[0].provisioning.status,'ready');assert.equal(root.customerNeeds.profiles[0].effective.scale.employees,40);
});

test('AC-SOC-441 scale, seats, agents and personas stay independent with non-blocking planning observations',()=>{
 const root=fixture();select(root,'smb');root.clock=1;Needs.advance(root);const p=root.customerNeeds.profiles[0];
 Needs.command(root,{action:'configure',id:p.id,section:'scale',value:{employees:10,sites:8,seats:90,agents:120,rooms:0}});
 Needs.command(root,{action:'configure',id:p.id,section:'personas',value:[{id:'workers',count:80,needs:['business-calling']}]});root.clock=2;Needs.advance(root);
 const result=root.customerNeeds.profiles[0];assert.equal(result.provisioning.status,'ready');assert.deepEqual(result.effective.scale,{employees:10,sites:8,seats:90,agents:120,rooms:0});assert.equal(result.effective.personas[0].count,80);assert.ok(result.observed.outcomeChecks.includes('PERSONA_COUNTS_MAY_OVERLAP_EMPLOYEES'));
});

test('AC-SOC-442 save validation rejects forged segment sources, approvals and effective snapshots',()=>{
 const root=fixture();select(root,'defence');root.clock=1;Needs.advance(root);assert.equal(Needs.validate(structuredClone(root)),true);
 for(const mutate of [x=>x.customerNeeds.profiles[0].sourceId='uc-new:segment:government',x=>x.customerNeeds.profiles[0].approval='approved',x=>x.customerNeeds.profiles[0].effective.scale.sites=999,x=>x.customerNeeds.profiles[0].observed.at=99,x=>x.customerNeeds.profiles[0].provisioning.status='failed',x=>x.customerNeeds.events[0].at=99]){const forged=structuredClone(root);mutate(forged);assert.throws(()=>Needs.validate(forged),/INVALID_CUSTOMER/);}
});

test('AC-SOC-443 inspection and fingerprint are pure and stable',()=>{
 const root=fixture();select(root,'enterprise');const before=JSON.stringify(root),fingerprint=Needs.fingerprint(root),first=JSON.stringify(Needs.inspect(root)),second=JSON.stringify(Needs.inspect(root));
 assert.equal(first,second);assert.equal(JSON.stringify(root),before);assert.equal(Needs.fingerprint(root),fingerprint);
});

test('AC-SOC-444 serialized worker factory reproduces create, transition, validation and inspection',()=>{
 const box={};vm.createContext(box);vm.runInContext(Needs.source()+';globalThis.pack=SOC_CUSTOMER_NEEDS;',box);const Worker=box.pack,root=fixture();root.customerNeeds=Worker.create(root);Worker.command(root,{action:'select',id:'worker-defence',segment:'defence'});root.clock=1;Worker.advance(root);
 assert.equal(JSON.stringify(Worker.inspect(root)),JSON.stringify(Needs.inspect(root)));assert.equal(Worker.validate(root),true);
});

test('AC-SOC-445 restored legacy roots may omit the optional pack; start and profile commands are explicit',()=>{
 const root={clock:0,jurisdiction:'JP'};assert.equal(Needs.validate(root),true);Needs.command(root,{action:'start'});assert.equal(root.customerNeeds.profiles.length,0);select(root,'smb');assert.equal(root.customerNeeds.profiles.length,1);assert.deepEqual(root.customerNeeds.profiles[0].geography.jurisdictions,['JP']);assert.throws(()=>Needs.command(root,{action:'start'}),/ALREADY_STARTED/);const before=JSON.stringify(root);assert.throws(()=>Needs.command(root,{action:'select',id:'profile-bad',segment:'smb',approval:true}),/INVALID_CUSTOMER_NEEDS_COMMAND/);assert.equal(JSON.stringify(root),before);
});

test('AC-SOC-453 customer-needs UI uses translated labels, shows state layers and submits typed shared-dispatch commands',()=>{
 const dom=new JSDOM('<!doctype html><body><main id="mount"></main></body>',{runScripts:'outside-only'}),w=dom.window,commands=[];
 try{
  w.N_=key=>key;w.tr=key=>({ 'customer_needs.title':'Customer needs','customer_needs.note':'Sector labels confer no authorization.','customer_needs.start':'Start','customer_needs.select':'Create profile','customer_needs.segment':'Segment','customer_needs.segment_smb':'Small business','customer_needs.segment_enterprise':'Enterprise','customer_needs.segment_government':'Government','customer_needs.segment_defence':'Defence','customer_needs.create':'Choose a profile','customer_needs.name':'Name','customer_needs.status':'Status','customer_needs.edit':'Source details','customer_needs.save':'Save','customer_needs.scale':'Scale','customer_needs.sector':'Sector','customer_needs.sensitivity':'Sensitivity','customer_needs.geography':'Geography','customer_needs.personas':'Personas','customer_needs.workloads':'Workloads','customer_needs.administration':'Administration','customer_needs.support':'Support','customer_needs.outcomes':'Outcomes','customer_needs.employees':'Employees','customer_needs.sites':'Sites','customer_needs.seats':'Seats','customer_needs.agents':'Agents','customer_needs.rooms':'Rooms','customer_needs.desired':'Desired','customer_needs.effective':'Effective','customer_needs.observed':'Observed','customer_needs.pending':'Pending synthetic application','customer_needs.applied':'Applied','customer_needs.source':'Source'})[key]||key;
  w.SCT={locked:true};w.SOC={customerNeeds:Needs};w.socApply=command=>commands.push(structuredClone(command));w.socError=()=>{};
  w.eval(fs.readFileSync(path.join(__dirname,'../src/game/72-customer-needs-ui.js'),'utf8'));
  let state={clock:0};const draw=()=>{w.document.querySelector('#mount').innerHTML=w.socCustomerNeedsPanel(state,{});w.socBindCustomerNeeds();};draw();
  assert.match(w.document.querySelector('#soc-customer-needs').textContent,/Sector labels confer no authorization/);w.document.querySelector('[data-customer-needs-start]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.deepEqual(commands[0],{type:'customer-needs',command:{action:'start'}});
  state.customerNeeds=Needs.create(state);draw();const selectForm=w.document.querySelector('[data-customer-needs-select]');selectForm.elements.id.value='ui-smb';selectForm.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(commands[1].command.segment,'smb');
  Needs.command(state,{action:'select',id:'ui-smb',segment:'smb'});draw();const section=w.document.querySelector('#soc-customer-needs');assert.match(section.textContent,/Desired/);assert.match(section.textContent,/Effective: —/);assert.match(section.textContent,/Observed: —/);assert.match(section.textContent,/Source details/);
  const scale=w.document.querySelector('[data-customer-needs-form][data-section="scale"]');scale.elements.value.value=JSON.stringify({employees:35,sites:1,seats:28,agents:4,rooms:1});scale.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.deepEqual(commands.at(-1),{type:'customer-needs',command:{action:'configure',id:'ui-smb',section:'scale',value:{employees:35,sites:1,seats:28,agents:4,rooms:1}}});
 }finally{dom.window.close();}
});
