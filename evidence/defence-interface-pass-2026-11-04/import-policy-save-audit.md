# Read-only interface import audit and fix evidence

Worktree: `/tmp/soc-interface-implementation`
Fix commit: `d3b3e87` (`Harden information interface save policy validation`)
Scope: owned `src/game/52-information.js` and `tests/information-interface-import-policy.test.js` only.

## Confirmed policy redirection before the fix

Real dispatched setup in `tests/lib/information-interface-fixture.js` produced an internal administration capture and a delayed `defence-admin-to-training-v1` interface. Before import mutation:

```json
{"originWorkload":"administration","classification":"internal","policy":"defence-admin-to-training-v1","destinationWorkload":"training"}
```

I then changed the destination boundary contract through its ordinary boundary command to workload `administration`, advanced until effective, and changed the serialized interface desired/effective destination snapshot and ready generation to match that current effective contract. `SOC.restore` accepted it. A dispatched transfer completed:

```json
{"policy":"defence-admin-to-training-v1","destinationWorkload":"administration","liveWorkload":"administration","transfer":{"status":"complete","reason":null,"outputClass":"internal","outputWorkload":"administration"}}
```

After `d3b3e87`, the import-policy test confirms that the same contradictory named policy is rejected as `INVALID_INFORMATION_INTERFACE_CONFIG`.

## Confirmed stale capture classification downgrade before the fix

With separate source archive and recorder contracts, the record was captured restricted under recorder contract generation 1 while stored under an internal administration archive. The recorder contract was then legitimately revised to internal at generation 2, leaving archive storage and interface endpoints current. Modifying the saved record classification, old capture snapshot classification, and matching origin receipt together from restricted to internal passed `SOC.restore` and completed an admin-to-training transfer as internal.

After the fix, the historical save remains restorable, but a new transfer from that old capture is blocked with `SOURCE_CAPTURE_LINEAGE_STALE`. A fresh recording after the boundary revision transfers successfully. An already-completed transfer remains restorable after recorder reconfiguration.

## Confirmed copied-record retention/access tampering before the fix

A completed transferred record was imported with expiry 10,000 minutes after its parent and access broadened from `supervisor` to `supervisor, admin`. `SOC.restore` accepted both edits. The validator now rejects parent expiry/access broadening for every origin-bearing derivative, requires origin-bearing record access to fit its retained storage access roles, and applies source/destination access bounds to interface transfer records. The actual transfer output also intersects the source storage role snapshot before it creates a copy.

## Verification

Command (run before commit):

```sh
node --test --test-isolation=none tests/information-interface-import-policy.test.js tests/information-interfaces-integration.test.js tests/information-interfaces-ui.test.js
```

Result: 23 tests passed, 0 failed (five new focused import-policy tests plus existing integration and UI cases). `git diff --check` passed. The repository-wide suite was not run by this bounded task; coordinator owns the frozen full verification.

No signature or cryptographic immutability is claimed. A coordinated rewrite of every retained field in an exported save is outside what structural cross-validation can prove.
