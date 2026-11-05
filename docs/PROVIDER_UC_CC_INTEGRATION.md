# Paid UC to contact centre integration contract

This bounded synthetic mechanic links the Microsoft workplace phone family to the Cisco contact centre family. It preserves source IDs `uc-new:family:microsoft:workplace-phone` and `uc-new:family:cisco:contact-center`; it does not claim vendor interoperability or external certification.

## API and ownership

`src/game/23-provider-uc-cc-integration.js` exports `SOC_PROVIDER_UC_CC_INTEGRATION` in Node and `SOCProviderUcCcIntegration` in the browser. Its pure `canOrder(state, customerId, operationId, hooks)` checks the authored product families, exact feature bindings, effective calling/recording/archive/engage resources, current paid support and current boundary observation before a quote is offered. It creates no project or receipt. Both the direct and managed initial/retest operations use this fixed integration. Finance, staffing and dispatch remain in the provider campaign command path.

`plan(state, projectId, hooks)` derives an immutable plan from an already-paid operation. `startCommands(plan)` returns only the fixed product edge create or rebase command. `testCommands(plan)` returns the explicit product integration test command. The operation receipt is project/posting scoped:

```js
{
  kind: 'provider-uc-cc-integration', version: 1,
  projectId, postingId, submittedAt, plan,
  test: null, // later bound to the dispatched test result and scope
  task: null  // later bound to retained call/case/capture/review proof
}
```

Direct initial commissioning costs 40,000 cents plus 7,000 cents per period, with eight engineering minutes and one engineer plus one support worker. Its recurring charge begins at the successful explicit test, including while the separately purchased quality review is outstanding. Direct retesting costs 9,000 cents, three minutes and one engineer plus one support worker; it retains the initial ongoing supplier commitment. Earned IX and Level 3 offers provide separately quoted managed alternatives. All purchases use the authoritative Provider quote.

The initial edge does not turn on the linked capture feature. A passed explicit scenario test is required first. Changed product version or generation makes the edge stale and requires a funded retest project; a blocked test is not evidence of success. `observe` reports `awaiting-edge`, `awaiting-test`, `awaiting-work`, `awaiting-review`, `ready`, or `stale`, and reports capture availability separately from project commissioning.

The integration is ready only when a post-test, provider-arrived voice job completed on the same customer, tenant, resolved interaction and case; the interaction records actual accepted use of both the phone/telephony and recorder/quality-review bindings; the call has a complete, accessible, retained recording; and a separately funded, completed quality operation reviewed that exact interaction, case and recording after the call. A failed call, probe, partial recording, unrelated review or untrusted evidence fields do not satisfy this proof. Calls completed before testing remain valid ordinary contact-centre work but cannot prove the new edge.

The helper exposes `taskEvidence`, `validateTaskEvidence` and `validateRetainedTaskEvidence` for the progression adapter. The evidence names project/posting, product deployment generations and versions, test result, actual job/event, interaction, case, recording and quality project/review. The test receipt pins stable support IDs (`projectIds`, `postingIds`, `resources`) and actually bound boundary tuples (`resourceId`, `contractId`, `generation`). A changed ready scope makes the paid assessment stale and requires retest. The helper reports physical capture availability separately: it remains true while the tested product edge and physical resources remain ready, even when MSP assessment scope changed; an unready bound path blocks capture. Current availability checks support and relevant boundary readiness through caller hooks. Those hooks must derive their results from validated provider state and inspect actually bound paths; ordinary unbound commercial paths do not imply a compliance contract.

On restore, `validateRetainedTaskEvidence` checks the stored project task proof against its paid operation receipt, exact IDs and times, retained integration-test history, paid quality project and retained recording/review rows. Missing job/event/interaction/case rows are accepted only when their explicit bounded pruning checkpoints cover those IDs. The recording and paid review remain required retained lineage. It does not establish current service readiness; `observe` still reports stale scope after a deployment changes.

`source()` serializes the same pure helper kernel for workers. A host must validate saves and call the helper through the shared dispatcher; these unit tests alone are not proof of actual dispatched campaign behavior.

## Bounded verification

`tests/provider-uc-cc-integration.test.js` covers pure source-linked planning and serialization, prepayment refusal, explicit edge/test stages, same-case work and paid review, stale generations, partial/probe evidence, unsupported scope, and paid retest eligibility. `tests/provider-uc-cc-dispatch.test.js` exercises paid commissioning, actual capture gating, explicit testing, the same-call funded quality review, generation change and paid recovery, recurring exposure, public restore, worker equality and duplicate request IDs through `SOC.dispatch`. It also covers an already-reviewed service boundary: installing the untested edge does not revoke the underlying cloud licence or invent a boundary review, while actual capture remains gated until testing. Frozen-candidate browser and full regression evidence are still required.
