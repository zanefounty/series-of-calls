const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const Media=require('../src/game/30-media-negotiation');

function root(){return {clock:0,resources:{desk:{kind:'endpoint'},service:{kind:'queue'},carrier:{kind:'trunk'}},interactions:[],mediaNegotiation:Media.create({clock:0})};}
function observe(s,kind,id,overrides={}){Media.command(s,{action:'observe',kind,id,available:true,signalling:kind!=='transcoder',mediaIn:true,mediaOut:true,fault:null,...overrides});}
function setup({from=['opus','g711'],carrierIn=['opus','g711'],carrierOut=['opus','g711'],to=['opus','g711']}={}){
 const s=root();
 Media.command(s,{action:'endpoint',config:{id:'left',resourceId:'desk',tenant:'tenant-a',codecs:from,offerMode:'early'}});
 Media.command(s,{action:'endpoint',config:{id:'right',resourceId:'service',tenant:'tenant-a',codecs:to,offerMode:'delayed'}});
 Media.command(s,{action:'carrier',config:{id:'upstream',resourceId:'carrier',ingressCodecs:carrierIn,egressCodecs:carrierOut}});
 observe(s,'endpoint','left');observe(s,'endpoint','right');observe(s,'carrier','upstream');
 s.clock=1;Media.advance(s);
 return s;
}

test('AC-SOC-314 independent endpoint and carrier offers choose the first end-to-end codec and preserve directional media',()=>{
 const s=setup({from:['opus','g711'],carrierIn:['opus','g711'],carrierOut:['g711'],to:['opus','g711']});
 const result=Media.preflight(s,{direction:'outbound',fromEndpoint:'left',toEndpoint:'right',carrierId:'upstream'});
 assert.equal(result.status,'ready');assert.equal(result.negotiation.status,'direct');assert.equal(result.negotiation.codecFrom,'g711');assert.deepEqual(result.media,{fromTo:true,toFrom:true});assert.deepEqual(result.negotiation.offerTrace,['SOURCE_OFFER_EARLY','CARRIER_INGRESS_EGRESS_OFFERS','TARGET_OFFER_DELAYED']);
 const oneWay=Media.preflight(s,{direction:'outbound',fromEndpoint:'left',toEndpoint:'right',carrierId:'upstream'},{resourceReady:(_s,id)=>id!=='service'});
 assert.equal(oneWay.status,'blocked');assert.ok(oneWay.blockingReasons.includes('TO_ENDPOINT_RESOURCE_UNAVAILABLE'));
 assert.ok(Media.preflight(s,{direction:'outbound',fromEndpoint:'missing-endpoint',toEndpoint:'right',carrierId:'upstream'}).blockingReasons.includes('FROM_ENDPOINT_UNKNOWN'));
});

test('AC-SOC-315 no common codec fails without a transcoder even when profiles and signalling are healthy',()=>{
 const s=setup({from:['opus'],carrierIn:['opus'],carrierOut:['g711'],to:['g711']});
 const result=Media.preflight(s,{direction:'outbound',fromEndpoint:'left',toEndpoint:'right',carrierId:'upstream'});
 assert.equal(result.status,'blocked');assert.equal(result.negotiation.status,'no-common-codec');assert.ok(result.blockingReasons.includes('NO_COMMON_MEDIA'));
});

test('AC-SOC-316 an explicit effective transcoder bridges offers and its session capacity is independent of other resources',()=>{
 const s=setup({from:['opus'],carrierIn:['opus'],carrierOut:['g711'],to:['g711']});
 assert.throws(()=>Media.command(s,{action:'transcoder',config:{id:'codec-bridge',pairs:[{input:'opus',output:'g711'}],sessionCapacity:1}}),/INVALID_MEDIA_TRANSCODER_REVERSE_PAIR/);
 Media.command(s,{action:'transcoder',config:{id:'codec-bridge',pairs:[{input:'opus',output:'g711'},{input:'g711',output:'opus'}],sessionCapacity:1}});
 observe(s,'transcoder','codec-bridge',{mediaIn:true,mediaOut:true});s.clock++;Media.advance(s);
 const path={direction:'outbound',fromEndpoint:'left',toEndpoint:'right',carrierId:'upstream',transcoderId:'codec-bridge'};
 const result=Media.preflight(s,path);assert.equal(result.status,'ready');assert.equal(result.negotiation.status,'transcoded');assert.equal(result.negotiation.codecFrom,'opus');assert.equal(result.negotiation.codecTo,'g711');
 s.interactions.push({id:'interaction-1',channel:'voice',phase:'arrival'});assert.equal(Media.reserve(s,'interaction-1',path).accepted,true);
 assert.ok(Media.preflight(s,path).blockingReasons.includes('TRANSCODER_SESSION_CAPACITY'));assert.equal(Media.preflight(s,path,{excludeInteractionId:'interaction-1'}).status,'ready');
 assert.equal(Media.release(s,'interaction-1'),true);assert.equal(Media.preflight(s,path).status,'ready');
});

test('AC-SOC-317 internal and inbound route shapes do not require a carrier for internal calls or an internal source for inbound calls',()=>{
 const s=setup();
 const internal=Media.preflight(s,{direction:'internal',fromEndpoint:'left',toEndpoint:'right'});assert.equal(internal.status,'ready');assert.equal(internal.signalling.carrier,undefined);
 const inbound=Media.preflight(s,{direction:'inbound',carrierId:'upstream',toEndpoint:'right'});assert.equal(inbound.status,'ready');assert.equal(inbound.signalling.from,true);
 Media.command(s,{action:'endpoint',config:{id:'right',resourceId:'service',tenant:'tenant-b',codecs:['opus','g711'],offerMode:'delayed'}});s.clock++;Media.advance(s);
 assert.ok(Media.preflight(s,{direction:'internal',fromEndpoint:'left',toEndpoint:'right'}).blockingReasons.includes('TENANT_ROUTE_UNAUTHORIZED'));
 assert.equal(Media.preflight(s,{direction:'internal',fromEndpoint:'left',toEndpoint:'right'},{routeAuthorized:()=>true}).status,'ready');
});

test('AC-SOC-318 pending and failed generations keep prior effective offers; observations do not consume on reads',()=>{
 const s=setup();const before=Media.fingerprint(s);const read=JSON.stringify([Media.inspect(s),Media.preflight(s,{direction:'outbound',fromEndpoint:'left',toEndpoint:'right',carrierId:'upstream'})]);assert.equal(Media.fingerprint(s),before);assert.equal(JSON.stringify([Media.inspect(s),Media.preflight(s,{direction:'outbound',fromEndpoint:'left',toEndpoint:'right',carrierId:'upstream'})]),read);
 Media.command(s,{action:'endpoint',config:{id:'left',resourceId:'desk',tenant:'tenant-a',codecs:['opus'],offerMode:'early'}});assert.equal(s.mediaNegotiation.endpoints.left.effective.codecs[0],'opus');
 observe(s,'endpoint','left',{available:false,fault:'OUTAGE'});s.clock++;Media.advance(s);assert.equal(s.mediaNegotiation.endpoints.left.provisioning.status,'failed');assert.equal(s.mediaNegotiation.endpoints.left.effective.codecs[0],'opus');assert.equal(Media.validate(s),true);
});

test('AC-SOC-319 save validation binds reserved sessions to live calls and valid configured resources',()=>{
 const s=setup();s.interactions.push({id:'interaction-1',channel:'voice',phase:'handling'});const path={direction:'internal',fromEndpoint:'left',toEndpoint:'right'};assert.equal(Media.reserve(s,'interaction-1',path).accepted,true);assert.equal(Media.validate(structuredClone(s)),true);
 const fake=structuredClone(s);fake.interactions[0].phase='resolved';assert.throws(()=>Media.validate(fake),/INVALID_MEDIA_SESSION_INTERACTION/);
 const invalid=structuredClone(s);delete invalid.resources.desk;assert.equal(Media.preflight(invalid,path).status,'blocked');
 assert.throws(()=>Media.validate(invalid),/INVALID_MEDIA_RESOURCE_REFERENCE/);
 assert.throws(()=>Media.command(root(),{action:'endpoint',config:{id:'ghost-endpoint',resourceId:'ghost',tenant:'tenant-a',codecs:['opus'],offerMode:'early'}}),/MEDIA_RESOURCE_REQUIRED/);
});

test('AC-SOC-320 event and released-session rings stay bounded and preserve monotonic identifiers',()=>{
 const s=setup();for(let n=0;n<1100;n++)observe(s,'endpoint','left');assert.equal(s.mediaNegotiation.events.length,1000);assert.equal(Media.validate(s),true);const ids=s.mediaNegotiation.events.map(x=>Number(x.id.slice('media-event-'.length)));assert.ok(ids[0]>1);assert.ok(ids.every((x,n)=>n===0||x>ids[n-1]));
 const path={direction:'internal',fromEndpoint:'left',toEndpoint:'right'};for(let n=1;n<=1001;n++){const id=`interaction-${n}`;s.interactions.push({id,channel:'voice',phase:'arrival'});assert.equal(Media.reserve(s,id,path).accepted,true);Media.release(s,id);}assert.equal(s.mediaNegotiation.sessions.length,1000);assert.equal(Media.validate(s),true);assert.equal(s.mediaNegotiation.sessions.at(-1).interactionId,'interaction-1001');
});

test('AC-SOC-321 active calls reroute atomically, exclude their own transcoder session, and retain bounded history',()=>{
 const s=setup({from:['opus'],carrierIn:['opus'],carrierOut:['g711'],to:['g711']});Media.command(s,{action:'transcoder',config:{id:'codec-bridge',pairs:[{input:'opus',output:'g711'},{input:'g711',output:'opus'}],sessionCapacity:1}});observe(s,'transcoder','codec-bridge');s.clock++;Media.advance(s);
 const path={direction:'outbound',fromEndpoint:'left',toEndpoint:'right',carrierId:'upstream',transcoderId:'codec-bridge'};s.interactions.push({id:'interaction-reroute',channel:'voice',phase:'handling'});assert.equal(Media.reserve(s,'interaction-reroute',path).accepted,true);
 const before=JSON.stringify(s.mediaNegotiation.sessions[0]);const blocked=Media.reroute(s,'interaction-reroute',{direction:'internal',fromEndpoint:'missing',toEndpoint:'right'});assert.equal(blocked.accepted,false);assert.equal(JSON.stringify(s.mediaNegotiation.sessions[0]),before);
 for(let n=0;n<12;n++){const route=n%2?{direction:'outbound',fromEndpoint:'left',toEndpoint:'right',carrierId:'upstream',transcoderId:'codec-bridge'}:{direction:'internal',fromEndpoint:'right',toEndpoint:'left'};assert.equal(Media.reroute(s,'interaction-reroute',route).accepted,true);}
 assert.equal(s.mediaNegotiation.sessions[0].routeHistory.length,10);assert.deepEqual(s.mediaNegotiation.sessions[0].route,s.mediaNegotiation.sessions[0].routeHistory.at(-1).route);assert.equal(Media.validate(s),true);
});

test('AC-SOC-322 worker source reproduces inspection and routes while source IDs remain content-linked',()=>{
 const s=setup();const box={};vm.createContext(box);vm.runInContext(Media.source()+';globalThis.API=SOC_MEDIA_NEGOTIATION;',box);assert.deepEqual(JSON.parse(JSON.stringify(box.API.inspect(structuredClone(s)))),Media.inspect(s));
 const content=require('../content/media-negotiation.json');assert.deepEqual(content.runtime,{PACK:Media.PACK,VERSION:Media.VERSION,CODECS:Media.CODECS});assert.deepEqual(content.sourceIds,['voiceops-2010-08-peer-of-peer','uc-new:domain:media','uc-new:domain:signalling']);
});
