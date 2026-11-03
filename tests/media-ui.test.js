const test=require('node:test');
const assert=require('node:assert/strict');
const {load}=require('./harness');

function boot(){
 const {dom,ev,errors}=load(),w=dom.window;
 ev(`window.__commands=[];socApply=(command)=>window.__commands.push(JSON.parse(JSON.stringify(command)));`);
 const state=ev(`(()=>{const s=SOC.create();s.mediaNegotiation=SOC.mediaNegotiation.create(s);return s;})()`);
 const render=(locked=true,s=state)=>{w.__state=s;w.__locked=locked;ev(`SCT.state=window.__state;SCT.locked=window.__locked;let m=document.getElementById('media-test-mount');if(!m){m=document.createElement('div');m.id='media-test-mount';document.body.appendChild(m);}m.innerHTML=socMediaNegotiationPanel(SCT.state,SOC.calculate(SCT.state));socBindMediaNegotiation();`);};
 const submit=selector=>{const f=w.document.querySelector(selector);assert.ok(f,selector);f.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));};
 return {dom,w,ev,errors,state,render,submit,commands:()=>JSON.parse(JSON.stringify(w.__commands))};
}
function addProfiles(h){h.ev(`(()=>{const s=SCT.state,M=SOC.mediaNegotiation;for(const config of [{action:'endpoint',config:{id:'left-offer',resourceId:'desk',tenant:'tenant-a',codecs:['opus','g711'],offerMode:'early'}},{action:'endpoint',config:{id:'right-offer',resourceId:'service',tenant:'tenant-a',codecs:['opus','g711'],offerMode:'delayed'}},{action:'carrier',config:{id:'upstream',resourceId:'carrier',ingressCodecs:['opus','g711'],egressCodecs:['opus','g711']}}])M.command(s,config);for(const [kind,id] of [['endpoint','left-offer'],['endpoint','right-offer'],['carrier','upstream']])M.command(s,{action:'observe',kind,id,available:true,signalling:true,mediaIn:true,mediaOut:true,fault:null});s.clock=1;M.advance(s);})()`);}

test('AC-SOC-329 media console is visibly synthetic and every control is disabled in read-only mode',()=>{
 const h=boot();h.render(false);const panel=h.w.document.getElementById('soc-media-negotiation');assert.ok(panel);assert.match(panel.textContent,/Synthetic scenario controls only/);
 for(const el of panel.querySelectorAll('form:not([data-media-form="preflight"]) button,form:not([data-media-form="preflight"]) input,form:not([data-media-form="preflight"]) select'))assert.equal(el.disabled,true);h.dom.window.close();
});

test('AC-SOC-330 starter and typed endpoint, carrier, transcoder, and observation forms dispatch validated shapes',()=>{
 const h=boot();h.state.mediaNegotiation=null;h.render(true);h.submit('[data-media-start]');assert.deepEqual(h.commands().at(-1),{type:'media-negotiation',command:{action:'start'}});
 h.state.mediaNegotiation=h.ev('SOC.mediaNegotiation.create(SCT.state)');h.render(true);
 const endpoint=h.w.document.querySelector('[data-media-form="endpoint"]');endpoint.elements.id.value='edge-a';endpoint.elements.codecs.value='g711, opus';h.submit('[data-media-form="endpoint"]');let cmd=h.commands().at(-1);assert.equal(cmd.type,'media-negotiation');assert.deepEqual(cmd.command,{action:'endpoint',config:{id:'edge-a',resourceId:'desk',tenant:'tenant-a',codecs:['g711','opus'],offerMode:'early'}});
 const carrier=h.w.document.querySelector('[data-media-form="carrier"]');carrier.elements.id.value='carrier-a';carrier.elements.ingressCodecs.value='g711, opus';h.submit('[data-media-form="carrier"]');cmd=h.commands().at(-1);assert.deepEqual(cmd.command.config.ingressCodecs,['g711','opus']);
 const trans=h.w.document.querySelector('[data-media-form="transcoder"]');trans.elements.id.value='codec-bridge';trans.elements.fromCodec.value='opus';trans.elements.toCodec.value='g711';trans.elements.sessionCapacity.value='3';h.submit('[data-media-form="transcoder"]');cmd=h.commands().at(-1);assert.deepEqual(cmd.command.config.pairs,[{input:'opus',output:'g711'},{input:'g711',output:'opus'}]);assert.equal(cmd.command.config.sessionCapacity,3);
 const observe=h.w.document.querySelector('[data-media-form="observe"]');observe.elements.kind.value='endpoint';observe.elements.id.innerHTML='<option value="edge-a">edge-a</option>';observe.elements.id.value='edge-a';observe.elements.available.checked=true;observe.elements.mediaIn.checked=false;observe.elements.fault.value='MEDIA_IN_UNAVAILABLE';h.submit('[data-media-form="observe"]');cmd=h.commands().at(-1);assert.deepEqual(cmd.command,{action:'observe',kind:'endpoint',id:'edge-a',available:true,signalling:true,mediaIn:false,mediaOut:true,fault:'MEDIA_IN_UNAVAILABLE'});
 assert.deepEqual(h.errors,[]);h.dom.window.close();
});

test('AC-SOC-331 read-only path preflight reports codec, signaling, directions, and synthetic offer trace without dispatching a call',()=>{
 const h=boot();h.render(true);addProfiles(h);h.render(true);const form=h.w.document.querySelector('[data-media-form="preflight"]');form.elements.fromEndpoint.value='left-offer';form.elements.toEndpoint.value='right-offer';form.elements.carrierId.value='upstream';h.submit('[data-media-form="preflight"]');
 const result=h.w.document.querySelector('[data-media-result]').textContent;assert.match(result,/ready/);assert.match(result,/SOURCE_OFFER_EARLY/);assert.match(result,/TARGET_OFFER_DELAYED/);assert.equal(h.commands().length,0);h.dom.window.close();
});
