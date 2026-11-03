const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const L=require('../src/game/34-specialist-lifecycle.js');

function fixture(){
 const root={clock:0,deployments:{'room-suite':{exists:true,effective:true,offerId:'room-offer',version:'scenario-1',generation:2,features:['calendar-integration','room-devices'],dependenciesReady:true}},products:{deployments:[]},business:{player:'orchard-msp',contracts:[]},owners:{'support-team':true},contracts:{renewals:0}};
 root.specialistLifecycle=L.create();return root;
}
function hooks(){return {
 inspectDeployment:(root,id)=>structuredClone(root.deployments[id]||{exists:false}),
 authorizeSupportOwner:(root,owner,id,action)=>root.owners[owner]===true&&id==='room-suite'&&['record-evidence','check-renewal'].includes(action)
};}
function record(root,extra={}){return L.command(root,{action:'record',deploymentId:'room-suite',supportOwnerId:'support-team',evidenceType:'internal-test',evidenceDate:'2026-10-30',sale:'available',renewal:'eligible',support:'supported',...extra},hooks());}
function tick(root){root.clock++;L.advance(root,hooks());}

test('AC-SOC-227 sale, renewal and support evidence axes remain independent',()=>{
 const root=fixture();record(root,{sale:'ended',renewal:'eligible',support:'supported'});tick(root);
 const status=L.deploymentStatus(root,'room-suite',hooks());assert.equal(status.evidenceReady,true);assert.equal(status.supportedEvidenceReady,true);assert.equal(status.renewalReadiness,true);assert.deepEqual(status.axes,{sale:'ended',renewal:'eligible',support:'supported'});
 assert.equal(status.externalLifecycleClaim,false);const renewal=L.command(root,{action:'renewal-check',deploymentId:'room-suite'},hooks());assert.equal(renewal.status,'ready');L.validate(root);
});

test('AC-SOC-228 lifecycle evidence provisions after a tick and failed replacement preserves prior effective evidence',()=>{
 const root=fixture();record(root);assert.equal(L.deploymentStatus(root,'room-suite',hooks()).status,'unverified');tick(root);
 const first=L.deploymentStatus(root,'room-suite',hooks()).evidenceId;record(root,{evidenceDate:'2026-11-01'});root.deployments['room-suite'].generation++;
 tick(root);assert.equal(root.specialistLifecycle.records[1].status,'failed');assert.equal(root.specialistLifecycle.effectiveRecords[0].evidenceId,first);assert.equal(L.deploymentStatus(root,'room-suite',hooks()).status,'blocked');
});

test('AC-SOC-229 version, feature and generation changes stale a previously ready record',()=>{
 const root=fixture();record(root);tick(root);assert.equal(L.deploymentStatus(root,'room-suite',hooks()).renewalReadiness,true);
 root.deployments['room-suite'].version='scenario-2';assert.equal(L.deploymentStatus(root,'room-suite',hooks()).renewalReasons.includes('LIFECYCLE_EVIDENCE_STALE'),true);
 root.deployments['room-suite'].version='scenario-1';root.deployments['room-suite'].features=['room-devices'];assert.equal(L.deploymentStatus(root,'room-suite',hooks()).renewalReadiness,false);
});

test('AC-SOC-230 support-owner authority is checked again at provisioning and at current status',()=>{
 const root=fixture();record(root);root.owners['support-team']=false;tick(root);
 assert.equal(root.specialistLifecycle.records[0].status,'failed');assert.equal(root.specialistLifecycle.records[0].failureCode,'SUPPORT_OWNER_AUTHORITY_DENIED');
 root.owners['support-team']=true;record(root);tick(root);root.owners['support-team']=false;
 assert.equal(L.deploymentStatus(root,'room-suite',hooks()).renewalReasons.includes('SUPPORT_OWNER_AUTHORITY_DENIED'),true);
 const renewalHooks={...hooks(),authorizeSupportOwner:(s,owner,id,action)=>action!=='check-renewal'&&s.owners[owner]===true};
 assert.equal(L.deploymentStatus(root,'room-suite',renewalHooks).renewalReasons.includes('SUPPORT_OWNER_RENEWAL_AUTHORITY_DENIED'),true);
});

test('AC-SOC-231 missing effective products, dependencies or owner hooks fail closed',()=>{
 const root=fixture();assert.throws(()=>record({...root,specialistLifecycle:structuredClone(root.specialistLifecycle),deployments:{}}),/DEPLOYMENT_NOT_FOUND/);
 assert.throws(()=>L.command(root,{action:'record',deploymentId:'room-suite',supportOwnerId:'support-team',evidenceType:'internal-test',evidenceDate:'2026-10-30',sale:'available',renewal:'eligible',support:'supported'}),/DEPLOYMENT_INSPECTION_UNAVAILABLE/);
 root.deployments['room-suite'].dependenciesReady=false;assert.throws(()=>record(root),/DEPENDENCIES_UNAVAILABLE/);
 root.deployments['room-suite'].dependenciesReady=true;assert.throws(()=>L.command(root,{action:'record',deploymentId:'room-suite',supportOwnerId:'support-team',evidenceType:'internal-test',evidenceDate:'2026-10-30',sale:'available',renewal:'eligible',support:'supported'},{inspectDeployment:(s,id)=>structuredClone(s.deployments[id])}),/SUPPORT_OWNER_AUTHORITY_DENIED/);
});

test('AC-SOC-232 renewal checks create an audit receipt without mutating a financial contract',()=>{
 const root=fixture();record(root);tick(root);const before=JSON.stringify(root.contracts);
 const result=L.command(root,{action:'renewal-check',deploymentId:'room-suite'},hooks());
 assert.equal(result.status,'ready');assert.equal(result.checkedAt,1);assert.equal(result.financialContractChanged,false);assert.equal(JSON.stringify(root.contracts),before);
 const ended=L.command(root,{action:'record',deploymentId:'room-suite',supportOwnerId:'support-team',evidenceType:'contract-record',evidenceDate:'2026-10-31',sale:'available',renewal:'eligible',support:'ended'},hooks());assert.equal(ended.status,'pending');tick(root);
 const unsupported=L.deploymentStatus(root,'room-suite',hooks());assert.equal(unsupported.evidenceReady,true);assert.equal(unsupported.supportedEvidenceReady,false);assert.equal(unsupported.renewalReadiness,false);
 const blocked=L.command(root,{action:'renewal-check',deploymentId:'room-suite'},hooks());assert.equal(blocked.status,'blocked');assert.equal(blocked.reasons.includes('SUPPORT_ENDED'),true);L.validate(root);
});

test('AC-SOC-233 lifecycle inspections are pure and saved receipts round trip exactly',()=>{
 const root=fixture();record(root);tick(root);const before=L.fingerprint(root),first=JSON.stringify(L.inspect(root,hooks()));
 assert.equal(JSON.stringify(L.inspect(root,hooks())),first);assert.equal(L.fingerprint(root),before);
 const restored=JSON.parse(JSON.stringify(root));assert.equal(L.validate(restored),true);assert.equal(L.fingerprint(restored),before);
 const forged=structuredClone(root);forged.specialistLifecycle.effectiveRecords[0].deploymentId='other';assert.throws(()=>L.validate(forged),/INVALID_SPECIALIST_LIFECYCLE_SAVE/);
 const future=structuredClone(root);future.specialistLifecycle.records[0].evidenceDate='2026-11-04';assert.throws(()=>L.validate(future),/INVALID_SPECIALIST_LIFECYCLE_SAVE/);
 const generation=structuredClone(root);generation.specialistLifecycle.records[0].scope.generation=0;assert.throws(()=>L.validate(generation),/INVALID_SPECIALIST_LIFECYCLE_SAVE/);
 const older=fixture();record(older);tick(older);record(older,{sale:'ended'});tick(older);older.specialistLifecycle.effectiveRecords[0].evidenceId='lifecycle-evidence-1';assert.throws(()=>L.validate(older),/INVALID_SPECIALIST_LIFECYCLE_SAVE/);
 const due=fixture();record(due);due.clock=1;assert.throws(()=>L.validate(due),/INVALID_SPECIALIST_LIFECYCLE_SAVE/);L.advance(due,hooks());assert.equal(L.validate(due),true);
});

test('AC-SOC-234 worker source factory matches main-thread transitions and rejects bad evidence dates',()=>{
 const root=fixture(),worker={};vm.createContext(worker);vm.runInContext(L.source()+';globalThis.lifecyclePack=SOC_SPECIALIST_LIFECYCLE;',worker);
 const W=worker.lifecyclePack;record(root);const other=fixture();W.command(other,{action:'record',deploymentId:'room-suite',supportOwnerId:'support-team',evidenceType:'internal-test',evidenceDate:'2026-10-30',sale:'available',renewal:'eligible',support:'supported'},hooks());
 root.clock++;other.clock++;L.advance(root,hooks());W.advance(other,hooks());assert.deepEqual(JSON.parse(JSON.stringify(other.specialistLifecycle)),root.specialistLifecycle);
 assert.throws(()=>record(fixture(),{evidenceDate:'2026-02-30'}),/INVALID_SPECIALIST_LIFECYCLE_COMMAND/);
 assert.throws(()=>record(fixture(),{evidenceDate:'2026-11-04'}),/INVALID_SPECIALIST_LIFECYCLE_COMMAND/);
 assert.throws(()=>L.command(root,{action:'record',deploymentId:'room-suite',supportOwnerId:'support-team',evidenceType:'internal-test',evidenceDate:'2026-10-30',sale:'available',renewal:'maybe',support:'supported',externalCertification:true},hooks()),/INVALID_SPECIALIST_LIFECYCLE_COMMAND/);
});
