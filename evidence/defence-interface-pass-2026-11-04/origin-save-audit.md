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
