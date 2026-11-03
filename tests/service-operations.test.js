const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const E=require('../src/game/55-communications');
const op=(s,command)=>E.dispatch(s,{type:'operations',command}),advance=(s,minutes=1)=>E.dispatch(s,{type:'advance',minutes});
const start=()=>advance(op(E.create(),{action:'start'}));
const cfg=(s,kind,config)=>advance(op(s,{action:'configure',kind,config}));
const res=(s,id,config)=>advance(E.dispatch(s,{type:'configure',id,config}));
const interact=(s,extra={})=>E.dispatch(s,{type:'interact',channel:'voice',from:'alex',to:'+61255500201',caseId:'case-one',...extra});
test('AC-SOC-023 four carrier models have distinct prerequisites and mobile number restrictions',()=>{
 let s=start();s=cfg(s,'carrier',{planLicensed:false});assert.equal(interact(s).interactions.at(-1).outcome,'CALLING_PLAN_ENTITLEMENT');
 s=cfg(s,'carrier',{mode:'operator'});assert.equal(interact(s).interactions.at(-1).outcome,'OPERATOR_ONBOARDING');
 s=cfg(s,'carrier',{operatorApproved:true,operatorContract:true,delegation:true});assert.equal(interact(s).interactions.at(-1).phase,'queued');
 s=cfg(s,'carrier',{mode:'mobile',simAssigned:true,mobileEligible:true});assert.equal(interact(s).interactions.at(-1).outcome,'MOBILE_SERVICE_NUMBER_UNSUPPORTED');
 s=res(s,'phone',{routes:[{prefix:'+61',target:'desk'}]});assert.equal(interact(s).interactions.at(-1).outcome,'CONNECTED');
 s=cfg(s,'carrier',{mode:'gateway'});assert.equal(interact(s).interactions.at(-1).outcome,'GATEWAY_SBCCERTIFIED');
 s=cfg(s,'carrier',{sbcCertified:true,tlsTrusted:true,hostnameValid:true,peerAuthenticated:true});assert.equal(interact(s).interactions.at(-1).outcome,'CONNECTED');
 s=cfg(s,'carrier',{codec:'g729'});assert.equal(interact(s).interactions.at(-1).outcome,'CODEC_NEGOTIATION');
});
test('AC-SOC-024 number reservations, port lead times, cutover and recovery retain supplier history',()=>{
 let s=start();s=op(s,{action:'reserve',number:'+61255500301',type:'user'});assert.equal(s.operations.numbers.at(-1).status,'reserved');
 s=op(s,{action:'assign',number:'+61255500301',holder:'alex'});s=op(s,{action:'policy',identity:'alex',allowInternational:false,allowedPrefixes:['+61'],callerId:'+61255500301'});
 const cutover=s.clock+4;s=op(s,{action:'port',number:'+61255500301',target:'next-wave',donorAccepted:true,cutoverAt:cutover});s=advance(s,2);assert.equal(s.operations.ports[0].status,'scheduled');assert.equal(s.operations.numbers.at(-1).provider,'level-tree');
 s=advance(s,2);assert.equal(s.operations.ports[0].status,'complete');assert.equal(interact(s).interactions.at(-1).outcome,'CALLER_CARRIER_MISMATCH');
 s=op(s,{action:'recoverPort',port:s.operations.ports[0].id});assert.equal(s.operations.numbers.at(-1).provider,'next-wave');s=advance(s,2);assert.equal(s.operations.numbers.at(-1).provider,'level-tree');
 s=op(s,{action:'port',number:'+61255500301',target:'next-wave',donorAccepted:false,cutoverAt:s.clock+4});s=advance(s,2);assert.equal(s.operations.ports.at(-1).reason,'DONOR_REJECTED');
});
test('AC-SOC-025 dial normalisation, permissions and internal extension signalling are independent of PSTN',()=>{
 let s=res(start(),'phone',{routes:[{prefix:'+61',target:'desk'},{prefix:'+1',target:'desk'}]});
 assert.equal(interact(s,{to:'02 5550 0201'}).interactions.at(-1).outcome,'CONNECTED');
 assert.equal(interact(s,{to:'+12125550101'}).interactions.at(-1).outcome,'DIALLING_PERMISSION');
 s=op(s,{action:'policy',identity:'alex',allowInternational:true,allowedPrefixes:['+61'],callerId:'+61255500101'});assert.equal(interact(s,{to:'+12125550101'}).interactions.at(-1).outcome,'CONNECTED');
 s=E.dispatch(s,{type:'fault',id:'carrier',fault:'OUTAGE'});assert.equal(interact(s,{to:'201'}).interactions.at(-1).outcome,'CONNECTED');assert.equal(interact(s).interactions.at(-1).outcome,'SIGNALLING_FAILED');
});
test('AC-SOC-026 contact integration models scope authentication, cloud and features separately',()=>{
 let s=cfg(start(),'integration',{model:'extend'});assert.equal(interact(s).interactions.at(-1).outcome,'CONTACT_APP_AUTH_REQUIRED');
 s=cfg(s,'integration',{apiAuthorised:true,appAssigned:true,features:['context','supervision']});assert.equal(interact(s).interactions.at(-1).phase,'queued');
 s=cfg(s,'integration',{model:'unify'});assert.equal(interact(s).interactions.at(-1).outcome,'EMBEDDED_CALLING_TOKEN');
 s=cfg(s,'integration',{embeddedToken:true,features:['embedded-client']});assert.equal(interact(s).interactions.at(-1).phase,'queued');
 s=cfg(s,'integration',{model:'connect'});assert.equal(s.operations.integration.provisioning.status,'failed');assert.equal(s.operations.integration.effective.model,'unify');
 s=cfg(s,'integration',{model:'unify',cloud:'private'});assert.equal(interact(s).interactions.at(-1).outcome,'INTEGRATION_CLOUD_UNSUPPORTED');
});
test('AC-SOC-027 retry backoff, API acceptance and delivery evidence precede human handling',()=>{
 let s=res(start(),'people',{people:2});s=cfg(s,'workflow',{transientFailures:2,retries:2});s=interact(s,{channel:'message'});
 assert.equal(s.interactions[0].phase,'delivery');s=advance(s,2);assert.equal(s.operations.jobs[0].attempts,2);assert.equal(s.operations.jobs[0].status,'retry');
 s=advance(s);assert.equal(s.operations.jobs[0].attempts,2);s=advance(s);assert.equal(s.operations.jobs[0].status,'accepted');assert.equal(s.interactions[0].phase,'delivery');
 s=advance(s);assert.equal(s.operations.jobs[0].status,'delivered');assert.equal(s.interactions[0].phase,'handling');s=advance(s,4);assert.equal(s.interactions[0].phase,'resolved');assert.equal(s.interactions[0].context,true);
 assert.equal(s.interactions[0].trace.filter(t=>t.code==='HTTP_202').length,1);
});
test('AC-SOC-028 webhook verification, deduplication, rate limits and receipt timeouts are observable',()=>{
 let s=cfg(start(),'workflow',{deliveryReceipts:false,timeout:3});s=interact(s,{channel:'message'});s=advance(s);const job=s.operations.jobs[0].id;
 assert.throws(()=>op(s,{action:'receipt',job,eventId:'event-one',signature:'bad'}),/WEBHOOK_SIGNATURE/);
 s=op(s,{action:'receipt',job,eventId:'event-one',signature:'synthetic-valid'});s=op(s,{action:'receipt',job,eventId:'event-one',signature:'synthetic-valid'});
 assert.equal(s.interactions[0].trace.filter(t=>t.code==='HUMAN_HANDOFF').length,1);
 s=interact(s,{channel:'message',caseId:'case-two'});s=advance(s,4);assert.equal(s.interactions.at(-1).outcome,'DELIVERY_RECEIPT_TIMEOUT');
 let limited=res(start(),'messages',{rateLimit:1});limited=interact(limited,{channel:'message'});limited=interact(limited,{channel:'message',caseId:'case-two'});limited=advance(limited);assert.equal(limited.operations.jobs[1].reason,'HTTP_429');
});
test('AC-SOC-029 migration cohorts keep independent placements and restore through provisioning',()=>{
 let s=start();s=E.dispatch(s,{type:'add',id:'new-phone',kind:'dedicated'});s=advance(s);
 s=op(s,{action:'migration',identities:['bea'],target:'new-phone',cutoverAt:s.clock+1});s=advance(s);assert.equal(s.operations.migrations[0].status,'verifying');assert.equal(s.resources.desk.effective.scope,'tenant');
 s=advance(s);assert.equal(s.operations.placements.bea,'new-phone');assert.equal(s.resources.desk.effective.scope,'site');assert.equal(E.operations.platform(s,'alex'),'phone');
 const call=interact(s,{from:'bea'}).interactions.at(-1);assert.ok(call.trace.some(t=>t.code==='CALL_REQUEST'&&t.platform==='new-phone'));
 s=op(s,{action:'rollback',migration:s.operations.migrations[0].id});assert.equal(s.resources.desk.effective.scope,'site');s=advance(s);assert.equal(s.resources.desk.effective.scope,'tenant');assert.equal(E.operations.platform(s,'bea'),'phone');
 s=op(s,{action:'migration',identities:['bea'],target:'new-phone',cutoverAt:s.clock+2});s=res(s,'desk',{registered:false});s=advance(s);assert.equal(s.operations.migrations.at(-1).reason,'COHORT_CHANGED');
 s=op(s,{action:'rollback',migration:s.operations.migrations.at(-1).id});assert.equal(s.resources.desk.desired.registered,false,'a failed preflight must not erase a later change');
});
test('AC-SOC-030 conversation windows, consent, saved operations and worker results are reproducible',()=>{
 let s=res(start(),'messages',{templates:[]});s=cfg(s,'workflow',{responseWindow:2});assert.equal(interact(s,{channel:'message'}).interactions.at(-1).outcome,'RESPONSE_WINDOW_TEMPLATE');
 s=op(s,{action:'inbound',caseId:'case-one'});s=interact(s,{channel:'message'});assert.equal(s.interactions.at(-1).phase,'delivery');s=advance(s,3);assert.equal(interact(s,{channel:'message'}).interactions.at(-1).outcome,'RESPONSE_WINDOW_TEMPLATE');
 s=cfg(s,'workflow',{consent:false});assert.equal(interact(s,{channel:'message'}).interactions.at(-1).outcome,'CHANNEL_CONSENT');
 assert.deepEqual(E.restore(JSON.stringify(s)),s);const before=JSON.stringify(s);E.calculate(s);assert.equal(JSON.stringify(s),before);
 let result;const context={postMessage:r=>result=r};vm.createContext(context);vm.runInContext(E.workerSource(),context);context.onmessage({data:{id:4,state:s,command:{type:'advance',minutes:4}}});assert.deepEqual(JSON.parse(JSON.stringify(result.state)),advance(s,4));
 const bad=structuredClone(s);bad.operations.ports.push({id:'invalid'});assert.throws(()=>E.restore(JSON.stringify(bad)),/INVALID_PORT_STATE/);
});
