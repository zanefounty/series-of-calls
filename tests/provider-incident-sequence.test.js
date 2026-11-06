'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const SEQUENCE=require('../src/game/23-provider-incident-sequence.js');

const customerId='starter-customer';
const definition={afterDelivered:4,delayMinutes:4,resource:'carrier',kind:'outage'};
const clone=value=>structuredClone(value);
function firstIncident(){
 return {id:'provider-incident-1',customerId,resource:'carrier',kind:'outage',fault:'OUTAGE',status:'resolved',createdAt:10,dueAt:14,resolvedAt:18,receipt:{resource:'carrier'}};
}
function workEvent(n,at,status='completed',completedAt=at){
 return {id:`provider-event-${n}`,at,code:'CUSTOMER_WORK_COMPLETED',customerId,jobId:`provider-job-${n}`,completedAt,status};
}
function paidRepairFor(incident,n){
 return {id:`provider-project-${n}`,kind:'operation',operationId:'repair',customerId,postingId:`provider-posting-${n}`,acceptedAt:incident.createdAt+1,completedAt:incident.resolvedAt-2,setupCents:8000,status:'complete',config:{incidentId:incident.id}};
}
function scheduledIncident(n,proof){
 return {id:`provider-incident-${n}`,customerId,resource:'carrier',kind:'outage',fault:'OUTAGE',status:'scheduled',createdAt:proof.scheduledAt,dueAt:proof.dueAt,resolvedAt:null,receipt:null,sequence:clone(proof)};
}
function resolved(incident,at){return {...incident,status:'resolved',resolvedAt:at};}

test('AC-SOC-824 legacy campaigns remain one-shot and v1 recurrence waits for a real recovered interval and fresh work',()=>{
 const first=firstIncident();
 assert.equal(SEQUENCE.candidate({version:undefined,customerId,at:1000,definition,incidents:[first],completedWorkEvents:[workEvent(2,1000)]}),null);
 assert.equal(SEQUENCE.candidate({version:SEQUENCE.VERSION,customerId,at:17,definition,incidents:[first],completedWorkEvents:[workEvent(2,17)]}),null,'an unresolved predecessor cannot repeat');
 assert.equal(SEQUENCE.candidate({version:SEQUENCE.VERSION,customerId,at:377,definition,incidents:[first],completedWorkEvents:[workEvent(2,377)]}),null,'the full interval after resolution must elapse');
 assert.equal(SEQUENCE.candidate({version:SEQUENCE.VERSION,customerId,at:378,definition,incidents:[first],completedWorkEvents:[]}),null,'elapsed time alone cannot author an incident');
 assert.equal(SEQUENCE.validateHistory({version:undefined,customerId,definition,incidents:[first],completedWorkEvents:[]}),true);
 assert.equal(SEQUENCE.validateHistory({version:undefined,customerId,definition,incidents:[first,first],completedWorkEvents:[]}),false,'legacy one-shot saves cannot contain a fabricated repeat');
 assert.throws(()=>SEQUENCE.candidate({version:2,customerId,at:378,definition,incidents:[first],completedWorkEvents:[workEvent(2,378)]}),/UNSUPPORTED_PROVIDER_INCIDENT_SEQUENCE_VERSION/);
 assert.equal(SEQUENCE.validateHistory({version:2,customerId,definition,incidents:[first],completedWorkEvents:[]}),false);
});

test('AC-SOC-825 v1 recurrence binds each bounded incident to the exact paid predecessor recovery, interval, mission fault and actual completed-work event',()=>{
 const first=firstIncident(),event=workEvent(2,378,'late',376),events=[event],repairs=[paidRepairFor(first,1)];
 const input={version:SEQUENCE.VERSION,customerId,at:378,definition,incidents:[first],completedWorkEvents:events,repairProjects:repairs};
 const before=JSON.stringify(input),proof=SEQUENCE.candidate(input);
 assert.equal(JSON.stringify(input),before,'candidate inspection is pure');
 assert.deepEqual(proof,{version:1,ordinal:2,predecessorIncidentId:first.id,predecessorResolvedAt:18,eligibleAt:378,scheduledAt:378,dueAt:382,definition:{...definition,fault:'OUTAGE'},recovery:{projectId:repairs[0].id,postingId:repairs[0].postingId,operationId:'repair',acceptedAt:11,completedAt:16,setupCents:8000},trigger:{eventId:event.id,jobId:event.jobId,customerId,at:378,completedAt:376,status:'late'}});
 const second=scheduledIncident(2,proof);
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:second,priorIncidents:[first],completedWorkEvents:events,repairProjects:repairs}),true);
 assert.equal(SEQUENCE.validateHistory({version:1,customerId,definition,incidents:[first,second],completedWorkEvents:events,repairProjects:repairs}),true);

 const badProof=clone(second);badProof.sequence.ordinal=3;
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:badProof,priorIncidents:[first],completedWorkEvents:events,repairProjects:repairs}),false,'ordinal skips are rejected');
 const wrongPredecessor=clone(second);wrongPredecessor.sequence.predecessorIncidentId='provider-incident-99';
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:wrongPredecessor,priorIncidents:[first],completedWorkEvents:events,repairProjects:repairs}),false);
 const wrongDue=clone(second);wrongDue.dueAt++;wrongDue.sequence.dueAt++;
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:wrongDue,priorIncidents:[first],completedWorkEvents:events,repairProjects:repairs}),false,'the due time must match the authored delay');
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition:{...definition,delayMinutes:5},incident:second,priorIncidents:[first],completedWorkEvents:events,repairProjects:repairs}),false,'a changed incident definition cannot reuse the proof');
 const wrongEvent=clone(event);wrongEvent.at--;
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:second,priorIncidents:[first],completedWorkEvents:[wrongEvent],repairProjects:repairs}),false,'event time and actual completedAt must agree');
 const wrongJob=clone(event);wrongJob.jobId='provider-job-99';
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:second,priorIncidents:[first],completedWorkEvents:[wrongJob],repairProjects:repairs}),false);
 const foreign=clone(event);foreign.customerId='next-1-customer';
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:second,priorIncidents:[first],completedWorkEvents:[foreign],repairProjects:repairs}),false);
 const missingEvent=clone(second);missingEvent.sequence.trigger.eventId='provider-event-99';
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:missingEvent,priorIncidents:[first],completedWorkEvents:events,repairProjects:repairs}),false,'a pruned or absent trigger receipt cannot be invented by the incident row');
 const unboundRepair=clone(second);unboundRepair.sequence.recovery.postingId='provider-posting-99';
 assert.equal(SEQUENCE.validateProof({version:1,customerId,definition,incident:unboundRepair,priorIncidents:[first],completedWorkEvents:events,repairProjects:repairs}),false,'a recorded paid-repair predecessor must match the current native project');
 const alternateRecovery={...repairs[0],id:'provider-project-8',postingId:'provider-posting-8',operationId:'capacity-upgrade',recoveryIncidentId:first.id,config:{resourceId:'carrier'}};
 assert.equal(SEQUENCE.candidate({...input,repairProjects:[alternateRecovery]}).recovery.operationId,'capacity-upgrade','recovery may use another paid, incident-scoped operation');
 assert.equal(SEQUENCE.candidate({...input,repairProjects:[{...repairs[0],status:'running'}]}).recovery,null,'an unfinished operation is not misrepresented as a paid recovery proof');
 const forgedLegacy=clone(second);delete forgedLegacy.sequence;
 assert.equal(SEQUENCE.validateHistory({version:undefined,customerId,definition,incidents:[first,forgedLegacy],completedWorkEvents:events}),false);
});

test('AC-SOC-826 v1 history enforces predecessor order and stops after eight authored incidents per customer',()=>{
 const incidents=[firstIncident()],events=[],repairs=[paidRepairFor(incidents[0],1)];
 for(let ordinal=2;ordinal<=SEQUENCE.MAX_TOTAL;ordinal++){
  const predecessor=incidents.at(-1),at=predecessor.resolvedAt+SEQUENCE.INTERVAL_MINUTES,event=workEvent(ordinal,at);
  events.push(event);
  const proof=SEQUENCE.candidate({version:1,customerId,at,definition,incidents,completedWorkEvents:events,repairProjects:repairs});
  assert.ok(proof,`sequence ${ordinal} is available after its preceding repair and fresh work`);
  incidents.push(resolved(scheduledIncident(ordinal,proof),at+10));repairs.push(paidRepairFor(incidents.at(-1),ordinal));
 }
 assert.equal(incidents.length,8);
 assert.equal(SEQUENCE.validateHistory({version:1,customerId,definition,incidents,completedWorkEvents:events,repairProjects:repairs}),true);
 const last=incidents.at(-1),nextEvent=workEvent(99,last.resolvedAt+SEQUENCE.INTERVAL_MINUTES);
 assert.equal(SEQUENCE.candidate({version:1,customerId,at:nextEvent.at,definition,incidents,completedWorkEvents:[...events,nextEvent],repairProjects:repairs}),null,'the authored per-customer incident budget is finite');
 const reordered=clone(incidents);[reordered[2],reordered[3]]=[reordered[3],reordered[2]];
 assert.equal(SEQUENCE.validateHistory({version:1,customerId,definition,incidents:reordered,completedWorkEvents:events,repairProjects:repairs}),false,'reordered or duplicated predecessor lineage fails closed');
 const duplicateOrdinal=clone(incidents);duplicateOrdinal[3].sequence.ordinal=2;
 assert.equal(SEQUENCE.validateHistory({version:1,customerId,definition,incidents:duplicateOrdinal,completedWorkEvents:events,repairProjects:repairs}),false);
 const ninth=clone(incidents);ninth.push({...clone(incidents.at(-1)),id:'provider-incident-9',createdAt:2000,dueAt:2004,resolvedAt:2010});
 assert.equal(SEQUENCE.validateHistory({version:1,customerId,definition,incidents:ninth,completedWorkEvents:events,repairProjects:repairs}),false,'saved history cannot exceed its bounded authored sequence');
});

test('AC-SOC-827 worker source preserves the native incident-sequence contract',()=>{
 const worker=new Function(`${SEQUENCE.source()}\nreturn SOC_PROVIDER_INCIDENT_SEQUENCE;`)();
 const first=firstIncident(),event=workEvent(2,378),input={version:1,customerId,at:378,definition,incidents:[first],completedWorkEvents:[event]};
 assert.deepEqual(worker.candidate(input),SEQUENCE.candidate(input));
 assert.equal(worker.INTERVAL_MINUTES,360);assert.equal(worker.MAX_TOTAL,8);
 const source=fs.readFileSync(path.join(__dirname,'../src/game/23-provider-incident-sequence.js'),'utf8');
 assert.doesNotMatch(source,/SOC\.dispatch\s*\(/,'the pure sequence helper never injects or dispatches a fault');
});
