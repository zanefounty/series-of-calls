# Managed identity leaver handoff

Branch: `implementation/managed-leaver`
Commit: `0a4a183 Add contract-scoped managed identity leavers`
Retry-cap follow-up: `582855d Cap managed leaver child retries`

## Owned changes

- `src/game/29-managed-operations.js`: adds strict identity-only `leaver` participants/items; requires `revocations: ['identity']`; captures exactly one removed canonical identity and its entitlement; requires a concrete `leaverResources` hook; scopes the active managed contract and delegated operator authorization to every returned resource; requires a `deprovision` user connector; carries exact approval metadata into the child JML request; retains required resource scope and revocation lineage in saves; rechecks scope/authority on managed retry; validates one managed retry against child attempts.
- `src/game/48-estate.js`: stores and validates optional managed-leaver approval metadata against the tenant, retained contract owner/role/scope and identity-only child item; passes the exact estate job id to `applyLeaver`; holds managed jobs after their first attempt until parent-authorized retry, and requires the exact saved approval on retry. Legacy/direct estate jobs and joiner/mover retry behavior remain unchanged.
- `tests/managed-operations-leaver.test.js`: positive delayed/effective/billing case, exact revocation input negatives and indirect resource contract-scope negative.
- Retry-cap follow-up: managed estate child retries reject after the one allowed parent retry; standalone imports reject managed approval jobs with more than two attempts. A focused case keeps active work unresolved through initial attempt and one managed retry, then verifies third retry rejection and malformed import rejection.

## Integration contract

Submission item:

```js
{ resource: 'identity', config: capturedIdentityConfigWithoutOnePrincipalAndEntitlements, revocations: ['identity'] }
```

Root hook required:

```js
leaverResources(root, { customerId, resource: 'identity', config, revocations: ['identity'] })
// returns a sorted list from ['identity', 'phone', 'people'] of the concrete affected scopes
```

The participant stores `requiredResources`. The child estate job stores exact metadata:

```js
{ tenant: child.tenant, contractId, operator: contract.supportOwner, requiredResources }
```

The coordinator's `applyLeaver` hook must check this exact child-job-bound approval against current tenant, active contract/deadline, support owner/role, required resource scope and current operator grants before mutating. It receives the exact child `jobId` as the sixth argument. Managed retry must include the stored `managedApproval` and increment the parent retry count before nested dispatch so save validation sees the child attempt and parent counter together. Unit billing remains one identity resource; dependency scopes do not add units.

The read-only browser integration suite currently covers accepted history retention, `UNKNOWN_CALLER`, delayed observation, active work and explicit retry, contract cancellation/renewal, revoked authority, newly introduced indirect scopes, connector/scope/revocation failures, stale generation, save lineage, direct customer alternative and worker/read purity. Those fixtures/tests are owned by the verifier/coordinator/UI agents, not this commit.

## Verification

Exact combined command:

```sh
rtk node --test --test-isolation=none tests/managed-operations.test.js tests/managed-integration.test.js tests/managed-operations-ui.test.js tests/managed-operations-leaver.test.js tests/managed-leaver-integration.test.js tests/managed-operations-leaver-ui.test.js tests/estate-lifecycle-integration.test.js
```

Result after retry-cap follow-up: 38/38 passed. `rtk git diff --check` passed on the owned files before commit.

Source/requirement scope: `REQ-3ec2c90c193eeca4` (`uc-new:domain:provisioning`), `REQ-0c0957908726a4ad` (`uc-new:actor:kurmi`), and `REQ-d12858f7b9b9cb5b` (`uc-new:actor:voss`). This implements only the tested synthetic managed identity-leaver slice. It does not approve source proposals or complete JML, bulk execution, device custody, number porting, migration or the full actor/domain profiles.
