# Independent information-interface save audit

Repository worktree: `/tmp/soc-interface-implementation`.

Regression: `matching a forged origin receipt cannot downgrade the retained restricted capture contract` in `tests/information-interfaces-integration.test.js`.

Reproducer command:

```sh
node --test --test-isolation=none --test-name-pattern='matching a forged origin' tests/information-interfaces-integration.test.js
```

The original state is produced entirely through public `SOC.dispatch` commands: a defence administrative meeting captures restricted information, its archive classification is internal, and a provisioned administrative-to-training interface permits at most internal information. The original transfer is correctly blocked by `POLICY_CLASSIFICATION_EXCEEDED`.

The negative save test clones that valid state and changes these exact fields:

```js
const s=tick(info(record(ready({administration:true})),interfaceCommand(true)));
const forged=structuredClone(s), r=forged.records[0];
r.classification='internal';
r.origin.classification='internal';
r.origin.capture.informationClass='internal';
forged.information.originReceipts[0].origin=structuredClone(r.origin);
```

The live `source-environment` contract remains unchanged at the recorded generation, with its `recorder` flow marked `restricted`.

Before correction: `SOC.restore(JSON.stringify(forged))` accepted the save. A subsequent public transfer completed and copied an allegedly internal record into training. The retained negative test failed with `Missing expected exception`.

Required correction: reject capture or storage origin snapshots that contradict the retained effective boundary contract and resource flow at the same recorded generations. Compare classification, workload, jurisdiction profile and access roles. Preserve genuine historical snapshots when those generations legitimately advance; current transfer checks must still enforce their current lineage and eligibility. A resource being rebound must not erase a still-retained same-generation original contract contradiction.

After correction: the independent regression passes, including a second case where the recorder is legitimately rebound to another contract while the original contract remains retained. Both unmodified historical saves restore; both forged downgraded origins reject. The existing source-generation/reconfiguration/recovery test remains passing. Full owned UI/integration run: 16 tests passed, zero failed, using `node --test --test-isolation=none tests/information-interfaces-ui.test.js tests/information-interfaces-integration.test.js` with Node24.22.2, jsdom24.1.3 and no NODE_PATH override.

This is structural consistency validation of synthetic saves, not cryptographic authentication. An attacker able to rewrite every mutually consistent part of an unsigned save remains outside that claim.


## Follow-up imported-policy and historical-receipt audit

The coordinator independently found an imported-interface destination-workload/policy contradiction and a stale-capture classification bypass after the initial frozen Chromium matrix. Those initial 24 browser cases and keyboard receipts remain immutable pre-fix evidence in `/tmp/soc-interface-browser-final/`.

Independent historical-policy reproducer:

```js
const bad=structuredClone(journey().expectedState);
bad.records.at(-1).interfaceTransfer.policyId='defence-admin-to-training-v1';
SOC.restore(JSON.stringify(bad));
```

Before correction, this single-field change was accepted although the retained source and destination snapshots describe restricted-to-restricted environments. After correction, the independent regression `retained transfer policy cannot be relabelled and survives legitimate interface revocation or policy reconfiguration` passes: the forged policy rejects, while genuine completed records restore after the current interface is revoked or legitimately reconfigured to the administrative-to-training policy. Historical validation uses the receipt's own snapshots, not the current interface policy.

The additional regression `historical transferred records survive recorder reconfiguration while new copies require fresh capture lineage` uses separate recorder and archive contracts. After a recorder resource and capture-contract generation change, both archive endpoints remain eligible; the old completed copy and receipt remain intact and restore. A new copy from the old capture is blocked with `SOURCE_CAPTURE_LINEAGE_STALE` without record mutation. A newly booked and captured recording transfers successfully.

Both regressions committed in `1dce1b2`. The complete independent owned UI/integration set passed 18 tests on this patch. The builder-owned focused suite was also executed and exposed two fixture/expectation corrections still being completed at the time of this note; these are not silently represented as a passing combined suite. Final multi-engine browser collection waits for the subsequent confirmed freeze.


Final focused rerun: exact kernel commit `d3b3e87aca021d359167c506f6d1762bebbe3362`, using `node --test --test-isolation=none tests/information-interfaces-ui.test.js tests/information-interfaces-integration.test.js tests/information-interface-import-policy.test.js`, passed all 23 tests (18 independent-owned plus five builder-owned). The earlier builder fixture/expectation failures were corrected and the previously failing cases executed successfully. Coordinator assigned the independent historical invariants AC-SOC-491 and AC-SOC-492. Browser results still require the new final frozen run.


Final frozen browser follow-up completed after policy hardening: 24 visible interface cases per engine across Chromium141.0.7390.37, Firefox142.0.1 and WebKit26.0, plus two keyboard viewports per engine. All 72 interface cases and six keyboard checks passed. Independent verification checked 156 screenshot/trace hashes, matching input manifests and identical built artifact hash, with zero source drift or reported console errors. These are bounded feature checks, not full application acceptance. Receipts and exact commands are indexed in `verification.json` and `execution.json` alongside this note. Earlier failed diagnostic harness attempts and successful pre-fix receipts remain separately retained.
