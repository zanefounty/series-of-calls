const {SOC,licensed,pending,tick}=require('/tmp/soc-queueberry-implementation/tests/lib/workforce-offer-fixture');
const base=licensed();
for(const [name,edit] of Object.entries({
 futureOfferActivation:s=>s.workforceOffers.effective.activatedAt=s.clock+1,
 earlyOfferReadyDue:s=>s.workforceOffers.provisioning.due=s.clock-1,
 futureIntegrationActivation:s=>s.workforceOffers.integration.effective.activatedAt=s.clock+1,
 earlyIntegrationReadyDue:s=>s.workforceOffers.integration.provisioning.due=s.clock-1
})){
 const bad=structuredClone(base);edit(bad);try{SOC.restore(JSON.stringify(bad));console.log('ACCEPTED',name)}catch(e){console.log('REJECTED',name,e.message)}
}
const noEvidence=tick(pending());for(const [name,edit] of Object.entries({futureOfferActivation:s=>s.workforceOffers.effective.activatedAt=s.clock+1,futureIntegrationActivation:s=>s.workforceOffers.integration.effective.activatedAt=s.clock+1})){const bad=structuredClone(noEvidence);edit(bad);try{SOC.restore(JSON.stringify(bad));console.log('ACCEPTED',name+'-without-tests')}catch(e){console.log('REJECTED',name+'-without-tests',e.message)}}
