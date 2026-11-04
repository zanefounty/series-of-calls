/* Synthetic, deployment-scoped evidence for three explicit product dependencies. */
function socProductEvidenceKernel(){
 'use strict';
 const PACK='soc-product-evidence-1',VERSION=1,TTL=60,sourceIds=['uc-new:family:microsoft:government-clouds','uc-new:family:cisco:government','uc-new:domain:eligibility','uc-new:domain:sovereignty','uc-new:domain:product-evidence'];
 const evidenceTypes=['jurisdiction-evidence','eligibility-evidence','lifecycle-evidence'];
 const copy=x=>JSON.parse(JSON.stringify(x)),fail=code=>{throw new Error(code);};
 const id=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(x),int=(x,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const exact=(o,keys)=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const familyId=x=>typeof x==='string'&&/^[a-z][a-z0-9-]{0,31}:[a-z][a-z0-9-]{0,47}$/.test(x),region=x=>['AU','US','JP','EU','scenario-local'].includes(x),version=x=>typeof x==='string'&&/^[a-z][a-z0-9.-]{0,31}$/.test(x);
 const packOf=s=>{const p=s?.productEvidence||s;if(!p||p.pack!==PACK)fail('PRODUCT_EVIDENCE_NOT_STARTED');return p;};
 function create(root){if(!root||!int(root.clock)||!root.products||!Array.isArray(root.products.deployments))fail('PRODUCT_EVIDENCE_PRODUCT_STATE_REQUIRED');return {pack:PACK,version:VERSION,clock:root.clock,nextId:1,requests:[],events:[]};}
 function deployment(root,idValue){return root.products?.deployments?.find(x=>x.id===idValue)||null;}
 function offer(root,idValue){return root.products?.offers?.find(x=>x.id===idValue)||null;}
 function currentScope(root,d,feature,dependency,resourceId){
  const cfg=d?.desired,o=cfg&&offer(root,cfg.offer),r=root.resources?.[resourceId];
  if(!cfg||!o||!r)return null;
  return {deploymentId:d.id,family:cfg.family,offerId:cfg.offer,productVersion:cfg.productVersion,mode:cfg.mode,region:cfg.region,feature,dependency,resourceId,deploymentGeneration:d.generation,resourceGeneration:r.generation,jurisdiction:root.jurisdiction,scenario:root.scenario};
 }
 function requestScope(root,c){
  const d=deployment(root,c.deploymentId);if(!d)fail('PRODUCT_EVIDENCE_DEPLOYMENT_REQUIRED');
  const cfg=d.desired;if(!cfg||!Array.isArray(cfg.features)||!cfg.features.includes(c.feature)||cfg.dependencies?.[c.dependency]!==c.resourceId)fail('PRODUCT_EVIDENCE_DEPENDENCY_SCOPE_MISMATCH');
  if(!evidenceTypes.includes(c.dependency))fail('UNSUPPORTED_PRODUCT_EVIDENCE_TYPE');
  if(!root.resources?.[c.resourceId])fail('PRODUCT_EVIDENCE_RESOURCE_REQUIRED');
  const o=offer(root,cfg.offer);if(!o||o.family!==cfg.family)fail('PRODUCT_EVIDENCE_OFFER_SCOPE_MISMATCH');
  const result=currentScope(root,d,c.feature,c.dependency,c.resourceId);if(!result||!familyId(result.family)||!id(result.offerId)||!id(result.feature)||!id(result.resourceId)||!id(result.deploymentId)||!id(result.dependency)||!id(result.scenario)||!region(result.jurisdiction)||!version(result.productVersion)||typeof result.mode!=='string'||!region(result.region)||!int(result.deploymentGeneration,1)||!int(result.resourceGeneration,1))fail('PRODUCT_EVIDENCE_SCOPE_INVALID');
  return result;
 }
 function event(p,kind,at,details={}){if(p.events.length>=1000)fail('PRODUCT_EVIDENCE_EVENT_CAPACITY');const e={id:`product-evidence-event-${p.nextId++}`,kind,at,...copy(details)};p.events.push(e);return e;}
 function command(root,c,hooks={}){
  const p=packOf(root);validate(root);
  if(c?.action==='request'){
   if(!exact(c,['action','id','deploymentId','feature','dependency','resourceId'])||!id(c.id)||!id(c.deploymentId)||!id(c.feature)||!id(c.dependency)||!id(c.resourceId)||p.requests.some(x=>x.id===c.id))fail('INVALID_PRODUCT_EVIDENCE_COMMAND');
   const desired=requestScope(root,c);if(p.requests.length>=500)fail('PRODUCT_EVIDENCE_REQUEST_CAPACITY');const rec={id:c.id,desired,generation:1,provisioning:{status:'pending',due:root.clock+1,generation:1,errors:[]},observed:{at:null,eligible:false,reasons:[],source:null},effective:null,revokedAt:null,revocationReason:null};p.requests.push(rec);event(p,'request-created',root.clock,{requestId:rec.id,generation:1,dependency:c.dependency,resourceId:c.resourceId});return copy(rec);
  }
  if(c?.action==='revoke'){
   if(!exact(c,['action','id','reason'])||!id(c.id)||!['scope-withdrawn','evidence-withdrawn','operator-revocation'].includes(c.reason))fail('INVALID_PRODUCT_EVIDENCE_COMMAND');const r=p.requests.find(x=>x.id===c.id);if(!r||!r.effective||r.revokedAt!==null)fail('PRODUCT_EVIDENCE_NOT_EFFECTIVE');if(typeof hooks.authorize==='function'&&hooks.authorize(root,r,'revoke')!==true)fail('PRODUCT_EVIDENCE_REVOCATION_DENIED');for(const peer of p.requests)if(peer.effective&&same(peer.desired,r.desired)&&peer.revokedAt===null){peer.revokedAt=root.clock;peer.revocationReason=c.reason;event(p,'proof-revoked',root.clock,{requestId:peer.id,reason:c.reason,effectiveGeneration:peer.effective.generation});}return copy(r);
  }
  fail('INVALID_PRODUCT_EVIDENCE_COMMAND');
 }
 function businessQualification(root,resourceId){
  const q=root.providerQualification;if(root.providerCustomer&&q&&q.scenario===root.scenario&&q.expires>root.clock&&q.expires===q.at+600)return {organisation:q.organisation,scenario:q.scenario,expires:q.expires,resourceId,eventId:q.eventId};
  const b=root.business,org=b?.player,sector=root.scenario,expires=b?.qualifications?.[org]?.[sector];if(!id(org)||!int(expires)||expires<=root.clock)return null;
  const rows=(b.events||[]).filter(e=>e.code==='QUALIFICATION_RECORDED'&&e.sector===sector&&e.fictional===true),last=rows.at(-1);if(!last||!int(last.clock)||expires!==last.clock+600)return null;
  return {organisation:org,scenario:sector,expires,resourceId,eventId:last.id};
 }
 function boundaryEvidence(root,resourceId,context,hooks){
  const contractId=root.boundaries?.bindings?.[resourceId],c=root.boundaries?.contracts?.find(x=>x.id===contractId);if(!contractId||!c||c.provisioning?.status!=='ready'||!c.effective||c.effective.profile!==root.jurisdiction||!c.effective.flows?.some(f=>f.resource===resourceId))return {ok:false,reason:'BOUNDARY_CONTRACT_NOT_CURRENT'};
  if(root.resources?.[resourceId]?.generation!==c.effective.flows.find(f=>f.resource===resourceId)?.resourceGeneration)return {ok:false,reason:'BOUNDARY_RESOURCE_GENERATION_STALE'};
  if(typeof hooks.boundaryAssessment!=='function')return {ok:false,reason:'BOUNDARY_ENFORCEMENT_UNAVAILABLE'};
  let assessment;try{assessment=hooks.boundaryAssessment(root,resourceId,context);}catch(_){return {ok:false,reason:'BOUNDARY_ENFORCEMENT_FAILED'};}
  if(!assessment||assessment.eligible!==true||assessment.contract!==contractId||assessment.profile!==root.jurisdiction||!Array.isArray(assessment.resourceBindings)||!assessment.resourceBindings.includes(resourceId))return {ok:false,reason:'BOUNDARY_ENFORCEMENT_BLOCKED'};
  return {ok:true,contractId,contractGeneration:c.generation,profile:c.effective.profile,resourceGeneration:root.resources[resourceId].generation};
 }
 function lifecycleEvidence(root,scope,hooks){
  const d=deployment(root,scope.deploymentId),o=offer(root,scope.offerId);if(!d||!o||o.family!==scope.family||d.desired.productVersion!==scope.productVersion||d.desired.mode!==scope.mode||d.generation!==scope.deploymentGeneration)return {ok:false,reason:'PRODUCT_LIFECYCLE_SCOPE_STALE'};
  const life=o.effectiveLifecycle,provision=o.lifecycleProvisioning;if(!life||provision?.status!=='ready'||provision.generation!==o.lifecycleGeneration||life.sale!=='available'||life.support!=='supported')return {ok:false,reason:'PRODUCT_OFFER_LIFECYCLE_UNAVAILABLE'};
  if(typeof hooks.lifecycle!=='function')return {ok:false,reason:'PRODUCT_LIFECYCLE_INSPECTION_UNAVAILABLE'};
  let result;try{result=hooks.lifecycle(root,scope.resourceId,{deploymentId:scope.deploymentId,family:scope.family,productVersion:scope.productVersion,mode:scope.mode,region:scope.region,feature:scope.feature,offer:scope.offerId,generation:scope.deploymentGeneration});}catch(_){return {ok:false,reason:'PRODUCT_LIFECYCLE_INSPECTION_FAILED'};}
  if(!result||result.eligible!==true||result.synthetic!==true||result.externalApprovalClaim!==false||result.deploymentId!==scope.deploymentId||result.family!==scope.family||result.productVersion!==scope.productVersion||result.mode!==scope.mode||result.offerId!==scope.offerId||result.offerGeneration!==o.lifecycleGeneration||result.axes?.sale!=='available'||result.axes?.support!=='supported')return {ok:false,reason:'PRODUCT_LIFECYCLE_SUPPORT_UNAVAILABLE'};
  return {ok:true,offerId:o.id,offerGeneration:o.lifecycleGeneration,axes:{sale:life.sale,support:life.support},checkedDeploymentId:scope.deploymentId};
 }
 function evaluate(root,rec,hooks={}){
  const scope=rec.desired,problems=[],source={};const current=currentScope(root,deployment(root,scope.deploymentId),scope.feature,scope.dependency,scope.resourceId);
  if(!current||!same(current,scope))problems.push('PRODUCT_SCOPE_STALE');
  if(scope.dependency==='eligibility-evidence'){
   const q=businessQualification(root,scope.resourceId);if(!q)problems.push('BUSINESS_QUALIFICATION_EXPIRED_OR_UNVERIFIED');else if(typeof hooks.qualification!=='function')problems.push('BUSINESS_QUALIFICATION_AUTHORITY_UNAVAILABLE');else{let h;try{h=hooks.qualification(root,scope.resourceId,{...scope});}catch(_){h=null;}if(!h||h.eligible!==true||h.authorised!==true||h.organisation!==q.organisation||h.scenario!==q.scenario||h.expires!==q.expires||h.resourceId!==scope.resourceId)problems.push('BUSINESS_QUALIFICATION_NOT_AUTHORIZED');else source.qualification={...q,authorized:true};}
  }else if(scope.dependency==='jurisdiction-evidence'){
   const b=boundaryEvidence(root,scope.resourceId,scope,hooks);if(!b.ok)problems.push(b.reason);else{const {ok,...proof}=b;source.boundary=proof;}
  }else if(scope.dependency==='lifecycle-evidence'){
   const l=lifecycleEvidence(root,scope,hooks);if(!l.ok)problems.push(l.reason);else{const {ok,...proof}=l;source.lifecycle=proof;}
  }
  if(problems.length)return {eligible:false,reasons:[...new Set(problems)],source:null};
  const expiresAt=Math.min(root.clock+TTL,source.qualification?.expires??Number.MAX_SAFE_INTEGER);
  return {eligible:true,reasons:[],source,expiresAt,synthetic:true,externalApprovalClaim:false};
 }
 function sourceValid(kind,x){
  if(!x||typeof x!=='object'||Array.isArray(x))return false;
  if(kind==='eligibility-evidence')return exact(x,['qualification'])&&exact(x.qualification,['organisation','scenario','expires','resourceId','eventId','authorized'])&&id(x.qualification.organisation)&&id(x.qualification.scenario)&&int(x.qualification.expires)&&id(x.qualification.resourceId)&&typeof x.qualification.eventId==='string'&&x.qualification.authorized===true;
  if(kind==='jurisdiction-evidence')return exact(x,['boundary'])&&exact(x.boundary,['contractId','contractGeneration','profile','resourceGeneration'])&&id(x.boundary.contractId)&&int(x.boundary.contractGeneration,1)&&region(x.boundary.profile)&&int(x.boundary.resourceGeneration,1);
  if(kind==='lifecycle-evidence')return exact(x,['lifecycle'])&&exact(x.lifecycle,['offerId','offerGeneration','axes','checkedDeploymentId'])&&id(x.lifecycle.offerId)&&int(x.lifecycle.offerGeneration,1)&&exact(x.lifecycle.axes,['sale','support'])&&x.lifecycle.axes.sale==='available'&&x.lifecycle.axes.support==='supported'&&id(x.lifecycle.checkedDeploymentId);
  return false;
 }
 function advance(root,hooks={}){
  const p=packOf(root);if(!int(root.clock)||p.clock>root.clock)fail('INVALID_PRODUCT_EVIDENCE_CLOCK');
  for(const r of p.requests){if(r.provisioning.status!=='pending'||r.provisioning.due>root.clock)continue;const result=evaluate(root,r,hooks);r.observed={at:root.clock,eligible:result.eligible,reasons:copy(result.reasons),source:result.source?copy(result.source):null};if(result.eligible){r.effective={generation:r.generation,scope:copy(r.desired),issuedAt:root.clock,expiresAt:result.expiresAt,source:copy(result.source),synthetic:true,externalApprovalClaim:false};r.provisioning={...r.provisioning,status:'ready',errors:[]};event(p,'proof-effective',root.clock,{requestId:r.id,generation:r.generation,expiresAt:result.expiresAt});}else{r.provisioning={...r.provisioning,status:'failed',errors:copy(result.reasons)};event(p,'evaluation-failed',root.clock,{requestId:r.id,generation:r.generation,reasons:copy(result.reasons)});}}
  p.clock=root.clock;validate(root);return root;
 }
 function proofCurrent(root,r,context,hooks={}){
  if(!r?.effective||r.revokedAt!==null||r.provisioning.status!=='ready'||r.effective.generation!==r.generation||r.effective.expiresAt<=root.clock)return {ready:false,reason:r?.revokedAt!==null?'PRODUCT_EVIDENCE_REVOKED':'PRODUCT_EVIDENCE_NOT_CURRENT'};
  if(!context||context.deploymentId!==r.desired.deploymentId||context.feature!==r.desired.feature||context.family!==r.desired.family||context.productVersion!==r.desired.productVersion||context.mode!==r.desired.mode||context.offer!==r.desired.offerId||context.generation!==r.desired.deploymentGeneration||context.region!==r.desired.region)return {ready:false,reason:'PRODUCT_EVIDENCE_SCOPE_MISMATCH'};
  const current=evaluate(root,r,hooks);if(!current.eligible)return {ready:false,reason:current.reasons[0]||'PRODUCT_EVIDENCE_SOURCE_STALE'};
  if(!same(current.source,r.effective.source))return {ready:false,reason:'PRODUCT_EVIDENCE_SOURCE_CHANGED'};
  return {ready:true,generation:r.generation,requestId:r.id,evidenceType:r.desired.dependency,synthetic:true,externalApprovalClaim:false};
 }
 function availability(root,kind,resourceId,context={},hooks={}){
  const p=packOf(root);if(!evidenceTypes.includes(kind))return {ready:false,reason:'PRODUCT_EVIDENCE_TYPE_UNSUPPORTED'};
  const rows=p.requests.filter(r=>r.desired.dependency===kind&&r.desired.resourceId===resourceId&&r.desired.deploymentId===context.deploymentId&&r.desired.feature===context.feature&&r.effective);
  if(!rows.length)return {ready:false,reason:'PRODUCT_EVIDENCE_NOT_REQUESTED'};return proofCurrent(root,rows.at(-1),context,hooks);
 }
 function validate(root){
  const p=packOf(root);if(!exact(p,['pack','version','clock','nextId','requests','events'])||p.version!==VERSION||p.clock!==root.clock||!int(p.clock)||!int(p.nextId,1)||!Array.isArray(p.requests)||p.requests.length>500||!Array.isArray(p.events)||p.events.length>1000)fail('INVALID_PRODUCT_EVIDENCE_SAVE');
  const ids=new Set();for(const r of p.requests){if(!exact(r,['id','desired','generation','provisioning','observed','effective','revokedAt','revocationReason'])||!id(r.id)||ids.has(r.id)||!int(r.generation,1)||!exact(r.desired,['deploymentId','family','offerId','productVersion','mode','region','feature','dependency','resourceId','deploymentGeneration','resourceGeneration','jurisdiction','scenario'])||!id(r.desired.deploymentId)||!familyId(r.desired.family)||!id(r.desired.offerId)||!id(r.desired.feature)||!evidenceTypes.includes(r.desired.dependency)||!id(r.desired.resourceId)||!region(r.desired.jurisdiction)||!id(r.desired.scenario)||!version(r.desired.productVersion)||typeof r.desired.mode!=='string'||!region(r.desired.region)||!int(r.desired.deploymentGeneration,1)||!int(r.desired.resourceGeneration,1)||!exact(r.provisioning,['status','due','generation','errors'])||!['pending','ready','failed'].includes(r.provisioning.status)||!int(r.provisioning.due)||r.provisioning.generation!==r.generation||!Array.isArray(r.provisioning.errors)||r.provisioning.errors.some(x=>typeof x!=='string')||!exact(r.observed,['at','eligible','reasons','source'])||r.observed.at!==null&&!int(r.observed.at,0,p.clock)||typeof r.observed.eligible!=='boolean'||!Array.isArray(r.observed.reasons)||r.observed.reasons.some(x=>typeof x!=='string')||r.observed.source!==null&&(!r.observed.source||typeof r.observed.source!=='object')||r.effective!==null&&!exact(r.effective,['generation','scope','issuedAt','expiresAt','source','synthetic','externalApprovalClaim'])||r.effective!==null&&(r.effective.generation!==r.generation||!same(r.effective.scope,r.desired)||!int(r.effective.issuedAt,0,p.clock)||!int(r.effective.expiresAt,r.effective.issuedAt+1)||!r.effective.source||typeof r.effective.source!=='object'||r.effective.synthetic!==true||r.effective.externalApprovalClaim!==false)||r.revokedAt!==null&&!int(r.revokedAt,0,p.clock)||r.revokedAt===null&&r.revocationReason!==null||r.revokedAt!==null&&!['scope-withdrawn','evidence-withdrawn','operator-revocation'].includes(r.revocationReason)||r.provisioning.status==='ready'&&r.effective===null||r.provisioning.status==='failed'&&r.effective!==null||r.provisioning.status==='pending'&&r.provisioning.due<=p.clock&&r.observed.at===null)fail('INVALID_PRODUCT_EVIDENCE_SAVE');ids.add(r.id);}
  for(const r of p.requests){if(r.observed.source!==null&&!sourceValid(r.desired.dependency,r.observed.source)||r.observed.eligible!==!!r.observed.source||r.provisioning.status==='ready'&&(!r.effective||!r.observed.eligible||!same(r.effective.source,r.observed.source))||r.effective&&(!sourceValid(r.desired.dependency,r.effective.source)||r.effective.expiresAt>r.effective.issuedAt+TTL))fail('INVALID_PRODUCT_EVIDENCE_PROOF');}
  if(p.events.some((e,i)=>!e||!exact(e,['id','kind','at','requestId','generation','dependency','resourceId'])&& !exact(e,['id','kind','at','requestId','generation','expiresAt'])&&!exact(e,['id','kind','at','requestId','generation','reasons'])&&!exact(e,['id','kind','at','requestId','reason','effectiveGeneration'])||e.id!==`product-evidence-event-${i+1}`||!id(e.kind)||!int(e.at,0,p.clock)||!ids.has(e.requestId))||p.nextId!==p.events.length+1)fail('INVALID_PRODUCT_EVIDENCE_HISTORY');return true;
 }
 function inspect(root,hooks={}){const p=packOf(root);validate(root);return {pack:PACK,version:VERSION,requests:p.requests.map(r=>({...copy(r),availability:availability(root,r.desired.dependency,r.desired.resourceId,{deploymentId:r.desired.deploymentId,feature:r.desired.feature,family:r.desired.family,productVersion:r.desired.productVersion,mode:r.desired.mode,offer:r.desired.offerId,generation:r.desired.deploymentGeneration,region:r.desired.region},hooks)}))};}
 function fingerprint(root){const p=packOf(root);validate(root);return JSON.stringify([PACK,VERSION,p.requests]);}
 const source=()=>`const SOC_PRODUCT_EVIDENCE=(${socProductEvidenceKernel.toString()})();`;
 return {PACK,VERSION,TTL,evidenceTypes:[...evidenceTypes],sourceIds:[...sourceIds],create,command,advance,validate,inspect,fingerprint,availability,source};
}
const SOC_PRODUCT_EVIDENCE=socProductEvidenceKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PRODUCT_EVIDENCE;
