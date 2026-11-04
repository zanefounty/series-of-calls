Series of Calls: gameplay and UI rebuild specification
4 November 2026

This pack specifies a proposed rebuild. It does not contain a finished game or claim that implementation/testing has occurred.

FILES

series-of-calls-gameplay-ui-spec.html
  Complete readable specification. Open it in a browser. It is self-contained, includes a proposed screen wireframe, and has print styling.

implementation-prompt.txt
  Copy/paste task for an implementation agent working in zanefounty/series-of-calls. Supply the whole pack with it. The prompt directs the agent to inspect the current checkout and implement the complete requested UI/gameplay revision.

requirements.json
  Machine-readable proposed requirements, phases, owning modules and behavioural acceptance cases. Their status is proposed_not_implemented, not a test result.

gameplay-crosswalk.json
  Upstream mechanic groups, all 25 existing UI mappings, all six tutorial mappings, and progression mappings. It supplements the existing full 3,454-row catalogue and preserves source identifiers.

scenario-contract.example.json
  Proposed executable SMB mission conditions: demand, timing, activation, costs, credits, renewal, insolvency and sustained victory. This is a design example to adapt and balance, not an existing runtime schema or tested game configuration.

series-of-calls-ui-wireframe.svg
  Editable visual reference for the proposed default campaign screen. It is not an interactive prototype. All shown game values are fictional.

sha256.json
  Checksums of the deliverable files for the exact handoff version.

HOW TO USE

1. Read sections 1, 4, 6, 11 and 12 of the HTML for the product decision, screen, opening, delivery sequence and acceptance.
2. Give the implementation agent the whole pack and the complete implementation-prompt.txt text.
3. Have the agent work in the actual repository and reconcile changes after the reviewed commit. Do not copy this pack over source files or replace the existing catalogue.
4. Review a real visible-UI playthrough, the alternative viable plan, four segment outcomes and exact verification. Screenshots and green unit tests alone do not prove gameplay.

BASELINES

Port source: 4d354ddb6118caccee9c4eea10ff8d879bc0be4c
Upstream gameplay reference: b2366ed26018f957309292d04adf5d6e76a89c65
Earlier executed behavioural audit: 365861e70460a91cfb42c63fe1dd7a3460913207
Original full mapping baseline: 48e6200c532d486f79bc8376de0aecbf6169123b, v1.37.0

The later port review inspected relevant changed source, including costed coaching and fork research. It does not claim a new complete build, browser run or behavioural audit at that later commit.

The game uses fictional prices and scenario conditions. Proposed time and acceptance targets are design choices for testing. They are not real vendor prices, operational forecasts, legal approvals or research-derived guarantees.

Publication, merging, source exclusions and release-policy changes remain subject to the repository's existing owner authorization and gates. This pack does not authorize those actions or waive outstanding conversion requirements.
