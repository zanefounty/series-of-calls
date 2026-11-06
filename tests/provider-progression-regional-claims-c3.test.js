'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SOC, FACTS, RECEIPTS, RESPONSIBILITY, REGIONAL, POLICY, UC_CC, C3, C5, T2, L7, clone, hooks, mspFor, checkpoint, buy, dispatchWithCheckpoint, advance, until, safeAdvanceChunk, untilCash, compareCashWaitToMinuteSteps, startCustomer, operation, operationComplete, stableSupportWindowShape, createThreeMarketWindow, createFiveMarketWindow, createLevelSevenWindow, claim, claimSource, rehash, paidPurchaseWhenReady, addRegionalCustomer, ccChild, ccHasFullWork, installTestedUcCcPair, assuranceMinute, assuranceWaitChunk, runAssuranceWait, compareAssuranceWaitToMinuteSteps } = require('./provider-progression-regional-claims.helpers.js');

test('AC-SOC-653 public dispatch earns C3 from three paid markets and rejects rehashed market or support forgery', () => {
  let state = createThreeMarketWindow();
  const ready = SOC.provider.inspect(state).progression.goals[C3];
  assert.equal(ready.status, 'ready', JSON.stringify(ready.missing));
  assert.deepEqual(ready.evidence.markets, ['au-sydney', 'eu-dublin', 'us-seattle']);
  assert.equal(ready.evidence.customerIds.length, 3);
  const cash = state.business.balance.cash;
  state = claim(state);
  const receipt = state.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  assert.ok(receipt);
  assert.deepEqual(receipt.unlock.allowedMarkets, ['au-sydney', 'eu-dublin', 'us-seattle']);
  assert.equal(receipt.unlock.operationId, 'regional-provisioning');
  assert.equal(state.business.balance.cash, cash, 'earning the evidence receipt does not award or spend cash');
  assert.equal(SOC.restore(JSON.stringify(state)).providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3).sourceId, C3);
  const customerId = 'next-1-customer';
  const decodedEvidence = {
    ...receipt.sourceEvidence,
    samples: FACTS.decodeSupportObservation(receipt.sourceEvidence.samples)
  };
  const arrivalPins = REGIONAL.retentionPins(decodedEvidence, customerId, receipt.workProofs).eventIds;
  const customerProofs = receipt.workProofs.filter(proof => proof.customerId === customerId);
  assert.deepEqual(arrivalPins, customerProofs.map(proof => proof.arrivalEventId).sort());
  assert.ok(arrivalPins.length > 0);
  for (const proof of customerProofs) {
    const event = state.providerCampaign.events.find(row => row.id === proof.arrivalEventId);
    const origin = state.providerCampaign.supportWork.origins.find(row => row.customerId === proof.customerId && row.arrival.interactionId === proof.interactionId)?.arrival;
    assert.ok(event || origin, `${proof.jobId} arrival is present or has its exact retained origin`);
  }
  const childId = state.providerCampaign.customers.find(row => row.id === customerId).portfolioId;
  const storedPins = state.portfolio.customers.find(row => row.id === childId).root.providerRegionalPins;
  assert.deepEqual(storedPins.pins.eventIds, arrivalPins, 'claim installs the evidenced arrival IDs in the customer retention marker');
  assert.equal(storedPins.version, 2);
  const legacy = clone(state);
  for (const customer of legacy.portfolio.customers) if (customer.root.providerRegionalPins) {
    customer.root.providerRegionalPins.version = 1;
    delete customer.root.providerRegionalPins.pins.eventIds;
  }
  const legacyText = JSON.stringify(legacy);
  SOC.validateState(legacy);
  assert.equal(JSON.stringify(legacy), legacyText, 'validation does not migrate caller-owned state');
  const migrated = SOC.restore(legacyText);
  assert.deepEqual(migrated.portfolio.customers.map(row => row.root.providerRegionalPins), state.portfolio.customers.map(row => row.root.providerRegionalPins));
  assert.equal(JSON.stringify(legacy), legacyText, 'restore owns its migrated copy');
  const unknownVersion = clone(state);
  unknownVersion.portfolio.customers.find(row => row.root.providerRegionalPins).root.providerRegionalPins.version = 3;
  assert.throws(() => SOC.restore(JSON.stringify(unknownVersion)), /INVALID_PROVIDER_REGIONAL_PINS/);

  if (process.env.SOC_C3_EARNED_STATE) fs.writeFileSync(process.env.SOC_C3_EARNED_STATE, JSON.stringify(state));

  const badMarkets = clone(state);
  const badMarketReceipt = badMarkets.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  badMarketReceipt.sourceEvidence.markets = ['au-sydney', 'au-melbourne', 'us-seattle'];
  badMarketReceipt.unlock.allowedMarkets = [...badMarketReceipt.sourceEvidence.markets];
  rehash(badMarketReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(badMarkets)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/);

  const badSupport = clone(state);
  const badSupportReceipt = badSupport.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  const samples = FACTS.decodeSupportObservation(badSupportReceipt.sourceEvidence.samples);
  const usParticipant = samples[20].participants.find(row => row.customerId === 'next-1-customer');
  assert.ok(usParticipant?.namedSupport);
  usParticipant.namedSupport.market = 'au-sydney';
  badSupportReceipt.sourceEvidence.samples = FACTS.encodeSupportObservation(samples);
  rehash(badSupportReceipt);
  assert.throws(() => SOC.restore(JSON.stringify(badSupport)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/);

  const missingArrival = clone(state);
  const missingArrivalReceipt = missingArrival.providerCampaign.progressionReceipts.receipts.find(row => row.sourceId === C3);
  const checkpointLastId = Number(missingArrival.providerCampaign.eventCheckpoint.lastId.slice('provider-event-'.length));
  const retainedOriginIds = new Set(missingArrival.providerCampaign.supportWork.origins.map(row => row.arrival.id));
  const retainedEventIds = new Set(missingArrival.providerCampaign.events.map(row => row.id));
  const absentBelowCheckpoint = Array.from({ length: checkpointLastId }, (_, index) => `provider-event-${index + 1}`)
    .find(id => !retainedEventIds.has(id) && !retainedOriginIds.has(id));
  assert.ok(absentBelowCheckpoint, 'fixture has an absent arrival ID below the event checkpoint');
  const missingArrivalProof = missingArrivalReceipt.workProofs.find(proof => proof.arrivalEventId !== absentBelowCheckpoint);
  assert.ok(missingArrivalProof);
  missingArrivalProof.arrivalEventId = absentBelowCheckpoint;
  rehash(missingArrivalReceipt);
  const forgedCustomer = missingArrival.providerCampaign.customers.find(row => row.id === missingArrivalProof.customerId);
  const forgedChild = missingArrival.portfolio.customers.find(row => row.id === forgedCustomer.portfolioId).root;
  const forgedEvidence = { ...missingArrivalReceipt.sourceEvidence, samples: FACTS.decodeSupportObservation(missingArrivalReceipt.sourceEvidence.samples) };
  const forgedEventIds = REGIONAL.retentionPins(forgedEvidence, forgedCustomer.id, missingArrivalReceipt.workProofs).eventIds;
  forgedChild.providerRegionalPins.pins.eventIds = forgedEventIds;
  assert.throws(() => SOC.restore(JSON.stringify(missingArrival)), /INVALID_PROVIDER_PROGRESSION_RECEIPT/,
    'a rehashed receipt cannot substitute an absent arrival ID below the checkpoint, even with matching derived pins');

  const duplicate = claim(state);
  assert.equal(duplicate.providerCampaign.progressionReceipts.receipts.filter(row => row.sourceId === C3).length, 1);
  assert.equal(duplicate.business.balance.cash, cash, 'repeated claims remain idempotent');

  const anchor = 'next-1-customer';
  const followRequest = { action: 'operation', operationId: 'regional-provisioning', customerId: anchor };
  const followQuote = SOC.provider.quote(state, followRequest);
  assert.deepEqual(followQuote.blockers, []);
  assert.deepEqual([followQuote.setupCents, followQuote.periodCents, followQuote.workMinutes, followQuote.engineers, followQuote.support], [15000, 8000, 4, 0, 1]);
  const cashBeforeFollowOn = state.business.balance.cash;
  state = SOC.dispatch(state, { type: 'provider', command: { ...followRequest, quoteRevision: followQuote.atRevision } });
  const followProject = state.providerCampaign.projects.findLast(row => row.customerId === anchor && row.operationId === 'regional-provisioning');
  state = operationComplete(state, 'regional-provisioning', anchor);
  const paidFollowProject = state.providerCampaign.projects.find(row => row.id === followProject.id);
  assert.equal(paidFollowProject.status, 'complete');
  assert.equal(state.business.balance.cash, cashBeforeFollowOn - paidFollowProject.setupCents);
  assert.ok(state.business.ledger.some(row => row.id === paidFollowProject.postingId && row.customerId === anchor && row.projectId === paidFollowProject.id && row.cents === paidFollowProject.setupCents));
  assert.equal(paidFollowProject.operationReceipt.sourceId, C3);
  assert.equal(paidFollowProject.operationReceipt.receiptId, receipt.id);
  const policy = state.providerAutomation.find(row => row.projectId === paidFollowProject.id);
  assert.ok(policy);
  assert.equal(policy.status, 'suspended', 'the paid recipe is not enabled by purchase');
  assert.equal(policy.config.lifetimeBudgetCents, 0);
  assert.deepEqual(policy.config.customerIds, [anchor]);

  const newCustomer = 'next-3-customer';
  const baseRequest = { action: 'purchase', offerId: 'next-3', planId: 'swift', stage: 'base', market: 'au-sydney' };
  const baseQuote = SOC.provider.quote(state, baseRequest);
  assert.deepEqual(baseQuote.blockers, []);
  state = SOC.dispatch(state, { type: 'provider', command: { ...baseRequest, quoteRevision: baseQuote.atRevision } });
  state = until(state, s => s.providerCampaign.customers.find(row => row.id === newCustomer)?.stages.base?.status === 'effective', `${newCustomer} base`);
  const activeRecipe = POLICY.create({
    ...policy.config,
    enabled: true,
    suspended: false,
    lifetimeBudgetCents: 100000,
    maxActions: 1,
    engineerCeiling: 1,
    supportCeiling: 1,
    customerIds: [newCustomer],
    rules: [{ id: 'carrier-for-next-customer', kind: 'provisioning', enabled: true, customerIds: [newCustomer], operationId: null, stage: 'carrier', resourceId: null, thresholdPercent: null }]
  });
  state = SOC.dispatch(state, { type: 'provider', command: { action: 'configure-policy', customerId: anchor, config: activeRecipe, quoteRevision: state.revision } });
  const preview = SOC.provider.policyPreview(state, activeRecipe, anchor);
  assert.equal(preview.status, 'ready');
  assert.equal(preview.customerId, newCustomer);
  const cashBeforeAutomaticOrder = state.business.balance.cash;
  state = advance(state);
  const automatedStage = state.providerCampaign.projects.findLast(row => row.customerId === newCustomer && row.kind === 'stage' && row.stage === 'carrier');
  assert.ok(automatedStage, 'the explicit paid policy submits an eligible carrier order');
  assert.ok(state.business.ledger.some(row => row.id === automatedStage.postingId && row.projectId === automatedStage.id && row.cents === automatedStage.setupCents));
  assert.equal(state.business.balance.cash, cashBeforeAutomaticOrder - automatedStage.setupCents);
  const enabledPolicy = state.providerAutomation.find(row => row.projectId === paidFollowProject.id);
  assert.equal(enabledPolicy.actions.length, 1);
  assert.equal(enabledPolicy.actions[0].projectId, automatedStage.id);
  assert.equal(enabledPolicy.spentCents, automatedStage.setupCents);
  state = until(state, s => s.providerCampaign.customers.find(row => row.id === newCustomer)?.stages.carrier?.status === 'effective', `${newCustomer} carrier`);
  assert.equal(state.providerCampaign.projects.find(row => row.id === automatedStage.id).status, 'complete');
  assert.deepEqual(SOC.restore(JSON.stringify(state)), state);
});

