const test=require('node:test');
const assert=require('node:assert/strict');
const SOC=require('../src/game/55-communications');

const CUSTOMER_A='starter-customer';
const CUSTOMER_B='next-1-customer';

function campaign(){
 let state=SOC.create({experience:'campaign',scenario:'smb',seed:73,difficulty:'easy'});
 const dispatch=command=>{state=SOC.dispatch(state,{type:'provider',command});return state;};
 const buy=command=>{
  const quote=SOC.provider.quote(state,command);
  assert.deepEqual(quote.blockers,[],`paid command blocked at ${state.clock}: ${JSON.stringify(command)}`);
  dispatch({...command,quoteRevision:quote.atRevision});
  return quote;
 };
 const minute=()=>{state=SOC.dispatch(state,{type:'advance',minutes:1});};
 const maintain=()=>{
  for(const incident of state.providerCampaign.incidents.filter(item=>['active','acknowledged'].includes(item.status))){
   if(incident.status==='active')dispatch({action:'acknowledge-incident',incidentId:incident.id});
   const command={action:'operation',operationId:incident.resource==='service'?'service-repair':'repair',customerId:incident.customerId};
   const quote=SOC.provider.quote(state,command);
   if(!quote.blockers.length)dispatch({...command,quoteRevision:quote.atRevision});
   else assert.ok(quote.blockers.every(code=>['ENGINEER_CAPACITY','SUPPORT_CAPACITY','INSUFFICIENT_CASH'].includes(code)),`unexpected maintenance refusal: ${quote.blockers}`);
  }
 };
 const tick=()=>{
  minute();maintain();
  for(const customer of state.providerCampaign.customers.filter(item=>item.status==='renewal'))dispatch({action:'renew',customerId:customer.id});
 };
 const until=(predicate,max=600)=>{for(let count=0;count<max&&!predicate();count++)tick();assert.ok(predicate(),`campaign did not reach condition by minute ${state.clock}`);};
 return {get state(){return state;},dispatch,buy,minute,tick,until};
}

test('AC-SOC-874 / PLAY-029-A02 paid tenant incident competes for shared support and funds without crossing customer authority',()=>{
 const game=campaign();
 for(const stage of ['base','carrier','partner'])game.buy({action:'purchase',offerId:'starter',planId:'swift',stage,...(stage==='base'?{}:{customerId:CUSTOMER_A})});
 game.until(()=>game.state.providerCampaign.customers.find(customer=>customer.id===CUSTOMER_A)?.status==='active');
 game.buy({action:'operation',operationId:'cisco-provider-operations',customerId:CUSTOMER_A});
 game.until(()=>game.state.providerCampaign.mission.nextOpportunityAvailable);
 game.buy({action:'purchase',offerId:'next-1',planId:'swift',stage:'base'});
 if(game.state.providerCampaign.status==='won')game.dispatch({action:'continue-career'});
 for(const stage of ['carrier','partner'])game.buy({action:'purchase',offerId:'next-1',planId:'swift',stage,customerId:CUSTOMER_B});
 game.until(()=>game.state.providerCampaign.customers.find(customer=>customer.id===CUSTOMER_B)?.status==='active');
 game.until(()=>game.state.providerCampaign.incidents.some(incident=>incident.customerId===CUSTOMER_B&&incident.status==='scheduled'));

 const incident=game.state.providerCampaign.incidents.find(item=>item.customerId===CUSTOMER_B&&item.status==='scheduled');
 const competingRequest={action:'operation',operationId:'ms-communications-api',customerId:CUSTOMER_A};
 const competingQuote=game.buy(competingRequest);
 const competitor=game.state.providerCampaign.projects.findLast(project=>project.customerId===CUSTOMER_A&&project.operationId==='ms-communications-api');
 while(game.state.providerCampaign.incidents.find(item=>item.id===incident.id)?.status!=='active')game.minute();
 game.dispatch({action:'acknowledge-incident',incidentId:incident.id});

 const blockedRepair={action:'operation',operationId:'repair',customerId:CUSTOMER_B};
 const blockedQuote=SOC.provider.quote(game.state,blockedRepair);
 assert.ok(blockedQuote.blockers.includes('SUPPORT_CAPACITY'));
 const crossTenantQuote=SOC.provider.quote(game.state,{...blockedRepair,customerId:CUSTOMER_A});
 assert.ok(crossTenantQuote.blockers.includes('NO_ACTIVE_INCIDENT'));
 assert.equal(game.state.providerCampaign.projects.some(project=>project.customerId===CUSTOMER_B&&project.operationId==='repair'),false,'refused quote creates no project');

 while(game.state.providerCampaign.projects.find(project=>project.id===competitor.id)?.status!=='complete')game.minute();
 const recoveredQuote=game.buy(blockedRepair);
 assert.equal(recoveredQuote.engineers,1);
 const repair=game.state.providerCampaign.projects.findLast(project=>project.customerId===CUSTOMER_B&&project.operationId==='repair');
 while(game.state.providerCampaign.projects.find(project=>project.id===repair.id)?.status!=='complete')game.minute();

 const postingFor=project=>game.state.business.ledger.find(entry=>entry.id===project.postingId);
 const competitorPosting=postingFor(game.state.providerCampaign.projects.find(project=>project.id===competitor.id));
 const repairPosting=postingFor(game.state.providerCampaign.projects.find(project=>project.id===repair.id));
 assert.equal(competitorPosting.customerId,CUSTOMER_A);
 assert.equal(competitorPosting.operationId,'ms-communications-api');
 assert.equal(repairPosting.customerId,CUSTOMER_B);
 assert.equal(repairPosting.operationId,'repair');
 assert.equal(game.state.providerCampaign.incidents.find(item=>item.id===incident.id).status,'resolved');
 assert.deepEqual(game.state.portfolio.customers.map(customer=>customer.root.providerCustomer.id),[CUSTOMER_A,CUSTOMER_B]);
 assert.equal(game.state.portfolio.customers.every(customer=>customer.root.clock===game.state.clock),true);
 assert.equal(typeof game.state.business.balance.cash,'number');
 assert.equal(game.state.business.ledger.filter(entry=>entry.projectId===competitor.id||entry.projectId===repair.id).length,2,'each accepted cross-tenant job has exactly one shared-ledger posting');

 while(game.state.clock<176)game.tick();
 assert.equal(game.state.providerCampaign.customers.find(customer=>customer.id===CUSTOMER_A).history.at(-1).to,120);
 assert.deepEqual(game.state.providerCampaign.customers.find(customer=>customer.id===CUSTOMER_B).history,[]);
 const restored=SOC.restore(JSON.stringify(game.state));
 assert.deepEqual(restored.providerCampaign,game.state.providerCampaign);
 assert.deepEqual(restored.portfolio,game.state.portfolio);
 assert.deepEqual(restored.business,game.state.business);
 assert.equal(competingQuote.setupCents,120000);
});
