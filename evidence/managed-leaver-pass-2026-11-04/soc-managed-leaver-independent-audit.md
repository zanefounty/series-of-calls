# Independent managed identity-leaver verification

Worktree: `/tmp/soc-managed-leaver-implementation`. Ownership: only `tests/managed-leaver-integration.test.js` and `tests/lib/managed-leaver-fixture.js`. Runtime, shared dispatcher and acceptance registry remain coordinator/builder owned. All positive fixtures use `SOC.dispatch` including portfolio dispatchcustomer; no injected poststate.

## Delayed authority finding and evidence limit

The original estate applyLeaver hook checked child business.player rather than retaining the managed support operator/contract. Estate jobs apply on later clock advances. This was a read-only code finding, not an executed unauthorized-mutation receipt: when independently inspected, the in-progress managed kernel already required a leaverResources hook that had not yet landed in55, preventing submission from reaching a child job. The coordinator then installed the delayed approval guard before the bridge became executable. Do not call this an observed pre-fix exploit.

A second code-order concern was that estate.advance runs before business.advance changes a due contract status to renewal. Coordinator added an explicit renewAt deadline guard before the corresponding independent exact-boundary test. Again, no pre-fix runtime failure receipt is claimed.

## Prepared behavioral fixtures

Two enterprise customers use separately linked identity inventories and deprovision-capable connectors. Customer A receives a real accepted Chatterleaf service interaction at clock4 and a delivered receipt at clock5, while identity alex has no assigned device. The source snapshot removes exactly alex and its entitlement, retaining all other config. A separate real voice fixture assigns alex as a named workforce person for active-work failure/retry.

Twelve independent tests are drafted; execution is pending the builder completion of48 job approval metadata and exact job-id forwarding. Expected coverage: delayed desired/effective/observed settlement, retained case/acceptance/receipt, new UNKNOWN_CALLER, customer isolation, active-work failure/retry, canceled/renewal-boundary support contract, revoked grant, new calling/people dependency, excluded scope/connector capability, explicit revocation schema, stale generation, imported child approval and revocation contradictions, historical completion after later changes, direct-customer alternative, worker equivalence and pure inspection.

The slice is synthetic and bounded. It does not complete the source actor profiles or broader provisioning scope, and structural saves are not cryptographically authenticated.

## Executed findings and final verification

The first real integration run reported7 passes and5 failures. Four failures shared a genuine integration gap: the child identity was effectively retired and observed ready with an active contract, but54 business.managedUsage still allowed only joiner/mover estate jobs, leaving billing pending with zero charges. A direct diagnostic on a cloned completed child returned MANAGED_USAGE_EFFECTIVE_CHANGE_REQUIRED. The fifth failure was a verifier regex that omitted the valid INVALID_JML_SAVE rejection code; the expectation was corrected without weakening rejection. The original failure is recorded in the tool transcript; `/tmp/soc-managed-leaver-billing-probe.json` is explicitly a later PASS after the coordinator's billing repair, not a fabricated pre-fix receipt.

After the root billing repair and builder0a4a183 bridge, all13 independent integration tests pass. Retained actual output and complete game-source hashes are `/tmp/soc-managed-leaver-integration-final.txt` and `/tmp/soc-managed-leaver-integration-final.json`. Additional verification confirms a connector outage after submission holds its child job after repair and clock advancement, until the single explicit managed retry; direct portfolio child retry is rejected both without approval and with a copied matching approval, leaving the root unchanged. A completed child exported standalone cannot delete its estate managedApproval while retaining managed billing proof; the unmodified standalone save remains valid. The ordinary direct estate alternative without managedApproval remains valid and uncharged.

The active-work suspected automatic retry was not a runtime defect: WORKFORCE_ASSIGNMENT_ACTIVE is recorded as failed, already excluded from estate.advance automatic retries. Connector-blocked managed work did need the builder's explicit hold rule; the final tests cover that behavior.

Distinct integrator delegation remains an unimplemented public setup path: current business commands only create the default Orchard grant or revoke it. No synthetic poststate was injected to claim a successful Twig-owned delegation. The coordinator explicitly retained this gap and bounded actual positive journeys to the existing Orchard grant.
