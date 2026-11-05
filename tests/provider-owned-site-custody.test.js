'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const CUSTODY=require('../src/game/23-provider-owned-site-custody');

test('custody readiness is a pure fail-closed projection for missing campaign authority',()=>{
 const state={clock:12,providerCampaign:{customers:[],projects:[]},portfolio:{customers:[]}},before=JSON.stringify(state);
 assert.deepEqual(CUSTODY.readiness(state,'missing-customer',null),{status:'incomplete',missing:['VALIDATED_PROVIDER_SITE_CUSTOMER_REQUIRED'],candidate:null});
 assert.equal(JSON.stringify(state),before);
});

test('retention pins name only the real call, case, processing job and source records',()=>{
 const evidence={recordId:'transcript-1',processingJobId:'processing-1',recordProjectId:'provider-project-1',reviewProjectId:'provider-project-2',permissionSnapshot:{interactionId:'interaction-1',caseId:'case-1',processingJobId:'processing-1',recordId:'transcript-1',sourceRecordingId:'recording-1'}};
 assert.deepEqual(CUSTODY.retentionPins(evidence),{interactionIds:['interaction-1'],caseIds:['case-1'],processingJobIds:['processing-1'],recordIds:['transcript-1','recording-1'],projectIds:['provider-project-1','provider-project-2']});
 assert.equal(CUSTODY.retentionPins(null).interactionIds.length,0);
});

test('worker source reconstructs the same pure custody adapter without Node require',()=>{
 const source=CUSTODY.source();assert.match(source,/SOC_PROVIDER_OWNED_SITE_CUSTODY/);
 const worker=new Function(`${source};return SOC_PROVIDER_OWNED_SITE_CUSTODY;`)();
 assert.equal(worker.PACK,CUSTODY.PACK);assert.equal(worker.VERSION,CUSTODY.VERSION);
 const input={clock:0,providerCampaign:{customers:[],projects:[]},portfolio:{customers:[]}},before=JSON.stringify(input);
 assert.deepEqual(worker.readiness(input,'none',null),CUSTODY.readiness(input,'none',null));assert.equal(JSON.stringify(input),before);
});

test('unlinked and synthetic audit identifiers cannot become custody evidence',()=>{
 const state={clock:10,providerCampaign:{customers:[],projects:[]},portfolio:{customers:[]}};
 const fake={status:'ready',customerId:'customer-1',recordId:'transcript-1',processingJobId:'processing-1',recordProjectId:'provider-project-1',reviewProjectId:'provider-project-2',permissionReceiptId:'information-read-9',readReceiptId:'information-read-9',reviewedAt:4,readAt:5,readAudit:{at:5,auditId:9,code:'RECORD_READ',permissionSnapshot:{},record:'transcript-1',region:'AU',role:'supervisor',synthetic:true},siteId:'provider-owned-head',region:'AU',permissionSnapshot:{}};
 assert.equal(CUSTODY.validateRead(state,'customer-1',null,null,fake),false);
});
