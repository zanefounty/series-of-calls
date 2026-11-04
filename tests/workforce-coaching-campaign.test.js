const test=require('node:test'),assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');
const dispatch=(s,type,fields={})=>SOC.dispatch(s,{type,...fields});
const campaign=(s,action,fields={})=>dispatch(s,'campaign',{command:{action,...fields}});
const tick=(s,minutes=1)=>dispatch(s,'advance',{minutes});

test('active coaching invalidates passed campaign evidence until fresh service windows pass',()=>{
 let s=SOC.create({scenario:'smb',mode:'assessed'});
 s=campaign(s,'start');
 for(const command of SOC.reference(s))s=SOC.dispatch(s,command);
 s=dispatch(s,'workforce',{command:{action:'start'}});
 s=tick(s);
 assert.equal(SOC.workforce.fingerprint(s).length,6,'legacy saves keep the original fingerprint shape when no coaching is active');

 s=campaign(s,'open-window',{kind:'baseline'});
 s=tick(s);
 let progress=s.campaign.progress.smb;
 assert.equal(progress.windows.at(-1).status,'passed');
 const baselineId=progress.windows.at(-1).id;

 s=campaign(s,'open-window',{kind:'service'});
 s=dispatch(s,'interact',{channel:'voice',from:'alex',to:'+61255500201',caseId:'coaching-fingerprint-service'});
 s=tick(s,SOC.campaign.tracks.smb.windows.service);
 progress=s.campaign.progress.smb;
 assert.equal(progress.windows.at(-1).status,'passed');
 const serviceId=progress.windows.at(-1).id;
 const beforeFingerprint=JSON.stringify(SOC.workforce.fingerprint(s));
 assert.equal(SOC.workforce.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).capacity,2);

 s=dispatch(s,'workforce',{command:{action:'coach',person:'agent-01',skill:'billing',minutes:2,costCents:125}});
 assert.equal(SOC.workforce.fingerprint(s).length,7,'active coaching appends its capacity dependency');
 assert.notEqual(JSON.stringify(SOC.workforce.fingerprint(s)),beforeFingerprint);
 assert.equal(SOC.workforce.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).capacity,1);
 let assessment=SOC.calculate(s).campaign.assessment;
 assert.deepEqual(assessment.checks.baseline.errors,['EVIDENCE_STALE']);
 assert.deepEqual(assessment.checks.service.errors,['EVIDENCE_STALE']);

 s=tick(s,2);
 assert.equal(s.workforceOps.coaching.at(-1).status,'complete');
 assert.equal(SOC.workforce.fingerprint(s).length,6,'completed coaching is represented by the effective roster again');
 assert.equal(SOC.workforce.effectiveCapacity(s,{channel:'voice',skill:'service',language:'en'}).capacity,2);
 assessment=SOC.calculate(s).campaign.assessment;
 assert.deepEqual(assessment.checks.baseline.errors,['EVIDENCE_STALE']);
 assert.deepEqual(assessment.checks.service.errors,['EVIDENCE_STALE']);
 assert.ok(s.campaign.progress.smb.windows.some(w=>w.id===baselineId&&w.status==='passed'));
 assert.ok(s.campaign.progress.smb.windows.some(w=>w.id===serviceId&&w.status==='passed'));

 s=campaign(s,'open-window',{kind:'baseline'});
 s=tick(s);
 assert.equal(s.campaign.progress.smb.windows.at(-1).status,'passed');
 s=campaign(s,'open-window',{kind:'service'});
 s=dispatch(s,'interact',{channel:'voice',from:'alex',to:'+61255500201',caseId:'coaching-fingerprint-recheck'});
 s=tick(s,SOC.campaign.tracks.smb.windows.service);
 assert.equal(s.campaign.progress.smb.windows.at(-1).status,'passed');
 assessment=SOC.calculate(s).campaign.assessment;
 assert.equal(assessment.checks.baseline.passed,true);
 assert.equal(assessment.checks.service.passed,true);
 assert.notEqual(assessment.checks.baseline.windowId,baselineId);
 assert.notEqual(assessment.checks.service.windowId,serviceId);
 assert.deepEqual(SOC.restore(JSON.stringify(s)),s);
});
