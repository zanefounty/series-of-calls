const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications');
const act=(s,type,command)=>E.dispatch(s,{type,command}),advance=(s,minutes=1)=>E.dispatch(s,{type:'advance',minutes});
function setup(){let s=act(E.create(), 'operations',{action:'start'});s=E.dispatch(s,{type:'configure',id:'people',config:{people:2}});return advance(s);}
const inbound=(s,extra={})=>E.dispatch(s,{type:'interact',channel:'voice',direction:'inbound',media:{encrypted:true},from:'+12125550199',to:'+61255500201',caseId:'incoming-case',...extra});
const configure=(s,id,config)=>advance(E.dispatch(s,{type:'configure',id,config}));
test('AC-SOC-250 inbound calling resolves an owned number through actual carrier, media and staffed handling',()=>{
 let s=inbound(setup());let i=s.interactions.at(-1);assert.equal(i.phase,'queued');assert.equal(i.from,'+12125550199');assert.equal(i.tenant,'orchard-repairs');
 for(const code of ['INBOUND_NUMBER_ACCEPTED','ORDERED_INBOUND_ROUTE','INBOUND_PERMISSION_ACCEPTED','CARRIER_MODEL_SELECTED','INVITE','200_OK','MEDIA_PATHS'])assert.ok(i.trace.some(t=>t.code===code),code);
 assert.equal(i.trace.find(t=>t.code==='CARRIER_MODEL_SELECTED').direction,'inbound');s=advance(s,5);assert.equal(s.interactions.at(-1).outcome,'RESOLVED');assert.equal(s.cases['incoming-case'].identity,'+12125550199');assert.ok(s.ledger.some(r=>r.usage>0));
});
test('AC-SOC-251 inbound number ownership and supplier state precede ordered routing',()=>{
 let s=setup();assert.equal(inbound(s,{to:'+61255509999'}).interactions.at(-1).outcome,'INBOUND_NUMBER_UNASSIGNED');
 s=act(s,'operations',{action:'reserve',number:'+61255500301',type:'user'});assert.equal(inbound(s,{to:'+61255500301'}).interactions.at(-1).outcome,'INBOUND_NUMBER_UNASSIGNED');
 s=act(s,'operations',{action:'assign',number:'+61255500301',holder:'bea'});assert.equal(inbound(s,{to:'+61255500301'}).interactions.at(-1).phase,'queued');
 s=act(s,'operations',{action:'configure',kind:'carrier',config:{provider:'other-carrier'}});s=advance(s);assert.equal(inbound(s).interactions.at(-1).outcome,'INBOUND_CARRIER_MISMATCH');
});
test('AC-SOC-252 inbound carrier onboarding, directional media and route ordering remain independent',()=>{
 let s=setup();s=act(s,'operations',{action:'configure',kind:'carrier',config:{mode:'gateway'}});s=advance(s);assert.equal(inbound(s).interactions.at(-1).outcome,'GATEWAY_SBCCERTIFIED');
 s=act(s,'operations',{action:'configure',kind:'carrier',config:{sbcCertified:true,tlsTrusted:true,hostnameValid:true,peerAuthenticated:true}});s=advance(s);
 s=configure(s,'phone',{routes:[{prefix:'+612555002',target:'desk'},{prefix:'+61',target:'service'}]});assert.equal(inbound(s).interactions.at(-1).destination,'desk');
 s=configure(s,'carrier',{mediaIn:false});const broken=inbound(s).interactions.at(-1);assert.equal(broken.outcome,'ONE_WAY_MEDIA');assert.ok(broken.trace.some(t=>t.code==='200_OK'));assert.equal(broken.media.in,false);
 s=configure(s,'carrier',{mediaIn:true});s=configure(s,'phone',{routes:[{prefix:'+1',target:'desk'}]});assert.equal(inbound(s).interactions.at(-1).outcome,'NO_INBOUND_ROUTE');
});
test('AC-SOC-253 inbound identity scope, entitlements and case separation reject false local identity',()=>{
 let s=act(setup(),'calling',{action:'start'});s=act(s,'calling',{type:'configure',node:'directory',at:s.clock,config:{tenants:[{id:'orchard-repairs',name:'Orchard'}],identities:[{canonical:'bea',tenant:'orchard-repairs',endpoint:'desk',aliases:[],number:'+61255500201',jurisdiction:'AU',known:true,emergencyEligible:false,site:'orchard',location:'Office'}],federation:[],publicReach:[]}});s=advance(s);assert.equal(inbound(s).interactions.at(-1).phase,'queued');
 s=configure(s,'identity',{entitled:['alex']});assert.equal(inbound(s).interactions.at(-1).outcome,'INBOUND_HOLDER_OR_ENTITLEMENT');
 assert.throws(()=>inbound(s,{from:'alex'}),/INVALID_CALL_DIRECTION/);assert.throws(()=>inbound(s,{channel:'message'}),/INVALID_CALL_DIRECTION/);
 s=inbound(setup());assert.throws(()=>E.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'201',caseId:'incoming-case'}),/CASE_IDENTITY_MISMATCH/);
});
test('AC-SOC-254 inbound admission uses network and SIP controls without treating incoming calls as outbound spend',()=>{
 let s=act(setup(),'admission-security',{action:'start'});for(const c of require('../content/admission-security.json').reference_fixture.configures)s=act(s,'admission-security',c);s=advance(s);
 s=act(s,'admission-security',{action:'configure',control:'destination',config:{enabled:false}});s=advance(s);s=inbound(s);assert.equal(s.interactions.at(-1).phase,'queued');assert.ok(s.interactions.at(-1).trace.some(t=>t.code==='INBOUND_SECURITY_ADMITTED'));
 s=advance(s,5);assert.equal(s.interactions.at(-1).phase,'resolved');assert.equal(s.admissionSecurity.reservations.length,0);assert.equal(s.admissionSecurity.spend.length,0);
 s=act(s,'admission-security',{action:'peer',id:'synthetic-carrier',authenticated:false,available:true,methods:['INVITE']});assert.equal(inbound(s,{caseId:'other-case'}).interactions.at(-1).outcome,'SIP_AUTH_REQUIRED');
});
test('AC-SOC-255 inbound sessions cannot bypass capacity and workers preserve replay and trace lineage',()=>{
 let s=configure(setup(),'carrier',{capacity:1});s=inbound(s);assert.equal(inbound(s,{caseId:'second-case'}).interactions.at(-1).outcome,'SESSION_CAPACITY');
 const before=JSON.stringify(s);E.calculate(s);E.calculate(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(E.restore(before),s);
 let output;const context={postMessage:r=>output=r};vm.createContext(context);vm.runInContext(E.workerSource(),context);const command={type:'advance',minutes:5};context.onmessage({data:{id:1,state:s,command}});assert.deepEqual(JSON.parse(JSON.stringify(output.state)),E.dispatch(s,command));
 const tampered=structuredClone(s);tampered.interactions[0].trace=tampered.interactions[0].trace.filter(t=>t.code!=='INBOUND_NUMBER_ACCEPTED');assert.throws(()=>E.restore(JSON.stringify(tampered)),/INVALID_INBOUND_TRACE/);
});
