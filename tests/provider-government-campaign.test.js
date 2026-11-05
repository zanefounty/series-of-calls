const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const ARCH=require('../src/game/23-provider-government');

function send(s,command,requestId){return SOC.dispatch(s,{type:'provider',requestId,command});}
function tick(s,minutes=1){for(let i=0;i<minutes;i++)s=SOC.dispatch(s,{type:'advance',minutes:1});return s;}
function campaign(){return SOC.create({experience:'campaign',scenario:'government',market:'au-sydney',seed:2});}
function commit(s,request,seq){const quote=SOC.provider.quote(s,request);assert.deepEqual(quote.blockers,[],`${request.operationId||request.stage}: ${quote.blockers.join(',')}`);return send(s,{...request,quoteRevision:s.revision},`provider-${seq}`);}
function purchase(s,stage,customerId,seq){return commit(s,{action:'purchase',offerId:'starter',planId:'swift',stage,...(customerId?{customerId}:{})},seq);}
function operation(s,operationId,seq){return commit(s,{action:'operation',operationId,customerId:'starter-customer'},seq);}
function until(s,predicate,max=160){for(let i=0;i<max&&!predicate(s);i++)s=tick(s);return s;}
function child(s){return s.portfolio.customers.find(x=>x.id==='starter-customer').root;}
function boundaryRows(s){const root=child(s);return SOC.boundaries.inspect(root).contracts;}

async function runArchitecture(architecture){
 let s=campaign(),seq=1;
 s=purchase(s,'base',null,seq++);
 s=until(s,x=>x.providerCampaign.customers[0].stages.base.status==='effective');
 s=purchase(s,'carrier','starter-customer',seq++);
 s=until(s,x=>x.providerCampaign.customers[0].stages.carrier.status==='effective');
 s=purchase(s,'partner','starter-customer',seq++);
 s=until(s,x=>x.providerCampaign.customers[0].status==='active');
 s=operation(s,'recording',seq++);s=until(s,x=>x.providerCampaign.projects.some(p=>p.operationId==='recording'&&p.status==='complete'));
 s=operation(s,'transcription',seq++);s=until(s,x=>x.providerCampaign.projects.some(p=>p.operationId==='transcription'&&p.status==='complete'));

 const recipe=ARCH.get(architecture),operationId=architecture==='regional-cloud'?'compliance':'compliance-local';
 const request={action:'operation',operationId,customerId:'starter-customer'},quote=SOC.provider.quote(s,request);
 assert.deepEqual(quote.blockers,[],`${operationId} is fundable: ${quote.blockers.join(',')}`);
 assert.equal(quote.setupCents,recipe.setupCents);assert.equal(quote.periodCents,recipe.periodCents);
 s=send(s,{...request,quoteRevision:s.revision},`provider-${seq++}`);
 s=until(s,x=>x.providerCampaign.projects.some(p=>p.operationId===operationId&&p.status==='complete'));

 let root=child(s),speech=root.resources.speech;
 assert.equal(speech.desired.local,recipe.speechMode==='local');
 assert.equal(speech.effective.local,recipe.speechMode==='local');
 let rows=boundaryRows(s);
 assert.ok(['recorder','archive','speech'].every(resource=>root.boundaries.bindings[resource]),`${architecture} paid paths bind capture, storage and processing`);
 for(const resource of ['recorder','archive','speech']){
  const contractId=root.boundaries.bindings[resource],contract=rows.find(x=>x.id===contractId);
  assert.ok(contract?.effective,`${resource} path has a delivered contract`);assert.equal(contract.evaluation.eligible,true,`${resource} scope: ${JSON.stringify(contract.evaluation.blocking)}`);
 }

 s=until(s,x=>x.providerCampaign.incidents.some(i=>i.customerId==='starter-customer'&&i.status==='active'));
 let incident=s.providerCampaign.incidents.find(i=>i.customerId==='starter-customer'&&i.status==='active');
 assert.ok(incident,'the seeded boundary variant activates after eight delivered jobs');
 assert.equal(s.providerCampaign.customers.find(c=>c.id==='starter-customer').metrics.completed>=8,true,'incident gate follows measured delivered work');
 root=child(s);rows=boundaryRows(s);
 assert.ok(rows.some(c=>c.evaluation.eligible===false&&c.evaluation.blocking.some(b=>b.code==='SUPPORT_REGION_NOT_ALLOWED'||b.path.includes('supportRegions'))),'support path is measurably outside the paid boundary scope');
 s=send(s,{action:'acknowledge-incident',incidentId:incident.id},`provider-${seq++}`);
 s=operation(s,'repair',seq++);
 s=until(s,x=>x.providerCampaign.incidents.some(i=>i.id===incident.id&&i.status==='resolved'));
 incident=s.providerCampaign.incidents.find(i=>i.id===incident.id);assert.equal(incident.status,'resolved');
 root=child(s);rows=boundaryRows(s);
 for(const resource of ['recorder','archive','speech']){
  const contract=rows.find(x=>x.id===root.boundaries.bindings[resource]);
  assert.equal(contract.evaluation.eligible,true,`repair restored ${resource} path: ${JSON.stringify(contract.evaluation.blocking)}`);
 }
 assert.equal(root.resources.speech.effective.local,recipe.speechMode==='local');
 return s;
}

test('PLAY-034/042 real Government campaign funds both architecture choices and repairs a seeded support-boundary incident',async()=>{
 const cloud=await runArchitecture('regional-cloud'),local=await runArchitecture('local-processing');
 assert.ok(cloud.providerCampaign.projects.some(p=>p.operationId==='compliance'&&p.status==='complete'));
 assert.ok(local.providerCampaign.projects.some(p=>p.operationId==='compliance-local'&&p.status==='complete'));
 assert.notEqual(child(cloud).resources.speech.effective.local,child(local).resources.speech.effective.local);
});
