# Provider partner path contract

This package defines three bounded, versioned Provider route offers and a pure evidence adapter. The cost and staffing values are fictional scenario terms, not current vendor pricing or product claims. Offers refer to existing separately purchased product recipes and operations; they never start, deploy, configure, or authorize those prerequisites for the player.

| Route | Native tested direction | Delivery that earns the route |
|---|---|---|
| Workplace to suite calling | Microsoft `telephony` → Cisco suite `multitenant-calling` | A resolved, non-probe voice job and interaction on the tested endpoint generations. |
| Communications API to engagement workflow | Microsoft `embedded-communications` → Cisco `workflow-flows` | A receipt-bound API handoff whose source and human target interactions belong to the same case. |
| Local speech product integration | Cisco local speech `versioned-integration` → Cisco contact-centre `ai-assistance` | A complete recording, eligible local speech model and versioned adapter, completed transcription job, and transcript from that same voice interaction, with the tested assistance gate attached to the interaction. |

The native product family definitions contain all six selected features. The tests also provision each source and target recipe through the existing SOC product dispatch, run its native directional integration test, retire an endpoint, and require a new generation, explicit rebase, and successful retest before capability returns. These Lab exercises prove the product adapter and failure behavior only; they earn no Provider progression credit.

## Dispatch and evidence contract

The future Provider integration should consume `PATHS` and `OFFERS` from `src/game/23-provider-partner-paths.js`. Each base offer and retest has explicit setup, recurring, lead-time, engineer, support, resource, separately paid prerequisite, and supported-choice terms. Dispatch must issue a quote and project for the selected operation, then bind a native product integration test and a post-test delivery to that project. It must not auto-buy prerequisite recipes or award credit for an offer, deployment, test alone, or catalogue row.

`projectEvidence(state, projectId, hooks)` accepts only a completed paid project with a matching ledger posting and terms, the exact native edge and feature direction, an explicit successful test on the same deployment generations and versions, qualifying delivered work, and a current owner whose validated scope covers every resource in the route. Historical evidence re-derives the native test and delivery lineage and validates the retained owner without requiring present-day deployment readiness. `validateEvidence` rejects duplicates, incomplete path sets, foreign customers, mismatched project/posting IDs, and altered retained rows.

The `delivery` hook returns raw retained domain objects, not a boolean or precomputed `ready` result. The adapter inspects those objects itself. In particular, accepted delivery must include a trace event named `PRODUCT_INTEGRATION_ACCEPTED`, bound to the exact integration ID, test time, source/target deployment IDs, features, generations, and versions. The Provider dispatcher must emit that event only when the tested edge actually gates the route capability. If an ordinary successful call, unrelated message, or transcript is merely present beside an integration test, the path does not count.

The delivery hook contracts are:

- **Workplace:** raw job, resolved interaction, and same-case record. The job is a fresh voice job; both endpoint feature bindings and the exact integration-gate event occur in its interaction trace.
- **API engagement:** raw source interaction, human target interaction, same-case record, and receipt-bound API delivery. The API receipt links both legs and is later than the test; the target interaction shows human channel acceptance and the gate event.
- **Local speech:** raw voice job/interaction/case, recording, processing job, transcript, speech installation, speech adapter test, local resource states, and boundary/policy snapshots. The adapter checks the processing job starts from that recording, ends at that transcript, uses the supported local model and stages, stays within local processing/storage regions, and carries the tested AI-assistance gate in the same interaction.

The provider operation receipt stores only binding identifiers/timestamps and a retained support row; evidence values are re-derived from the native product, workload, recording, channel, and support state. Current claims require current endpoints and current support. Historical claims use their test-time generations, output lineage, and validated retained support. Upgrade, retirement, missing permission, stale model, unavailable local processing, and failed integration tests remove current readiness. Recovery requires the paid retest operation on the repaired generation.

## Integration status

The root owns the Provider offer registry, dispatch, UI, worker assembly, and current P5 aggregation. The native calling/message admission path now emits the exact tested integration scope only after its product gate admits that resource. Actual Lab voice failure/delivery/retirement/rebase/recovery verifies this trace. Until the paid Provider offer, project and support paths consume this contract, the three Provider routes are pending and this module must return no paid positive evidence. Tests in this package currently exercise real Lab product dispatch and the fail-closed Provider adapter; they are not campaign delivery receipts or a completed P5 goal.
