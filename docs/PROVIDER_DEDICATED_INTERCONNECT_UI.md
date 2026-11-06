# Dedicated interconnect controls

The Provider carrier and calling-service inspectors compare the direct and supplier-managed dedicated interconnect offers. They use the existing operation quote action for the selected customer; eligibility and commitment remain authoritative in the dispatcher. Other operation catalogues remain secondary.

The direct offer costs A$240 setup and A$60 per period, with six implementation minutes using one engineer and one support worker. The managed offer costs A$120 setup and A$90 per period, with eight implementation minutes using one support worker. The quote includes the additional commissioning minute: seven and nine minutes respectively. Its managed-market prerequisite remains visible even when the offer is blocked; reviewing it does not grant an achievement or enable commitment.

Quotes explain the authenticated gateway, certified SBC, trusted TLS, hostname and peer checks. They show the retained carrier session capacity from the quoted historical trunk configuration and explicitly add no sessions. A blocked quote with no complete plan reports capacity as unavailable rather than inferring a value. Existing supplier commitments and usage charges remain payable. Commissioning alone is not achievement evidence: both actual calling directions must complete and settle with successful signalling and media in each direction.

The two offer names also label funded map projects. Eighteen static translation keys are provided in English, German, Spanish, French, Italian and Portuguese.

`AC-SOC-695` in `tests/provider-dedicated-interconnect-ui.test.js` checks pure rendering, exact customer/action attributes, primary service-context placement, secondary catalogue placement, direct/managed terms, blocked quote review and disabled commitment, absent-plan capacity, eight readable prerequisite reasons, all six dictionaries and translated project names. Fixtures are isolated UI projections: this test does not prove paid runtime delivery, progression claims or browser geometry.

Verification in the mutable integration tree: the new DOM case plus existing owned-site quote and panel translation suites passed 10/10. The first translation check found no missing, unused or broken dictionary entries but failed on 23 raw progression identifiers in the concurrently generated rules mirror. After the coordinator preserved the existing source-identifier convention, the fresh check passed all 7,124 labels in six languages (`/tmp/soc-pn-i18n-r2.log`). No build or actual-browser pass is claimed for this UI slice. The coordinator owns runtime integration, registered evidence and final candidate verification.


## Bounded visible recorder

`scripts/provider-browser-test.js` is a standalone PN recorder using the existing `provider-browser.js` server, source manifest, artifact hash and final-report machinery. The filename was not previously present. It exports `runDedicatedInterconnectJourney` and, when invoked directly, records desktop 1366×768 and mobile 390×844 journeys. It is not registered in the general matrix by this change.

The journey uses the real new-game form (Enterprise, normal difficulty, seed 73), Swift stage purchases, room and recording, paid BPO, staged migration, incident acknowledgement/repair and renewal controls. At the actual carrier map object it reviews the visibly blocked unearned managed offer, then funds and commissions the direct gateway. It requires settled, nonprobe inbound and outbound interactions with admitted gateway paths, signalling and both media directions before claiming PN. Claiming must preserve cash and resources. It then reviews the managed trade-off, pays for its delivery without adding sessions, observes fresh completed calls in both directions and reloads the exact saved state. No simulation state or clock is written through browser evaluation.

Run on an isolated, frozen checkout with lockfile-compatible Playwright browsers:

```sh
SOC_PROVIDER_BROWSER_ENGINE=chromium SOC_PROVIDER_BROWSER_OUT=/tmp/soc-pn-visible-chromium node scripts/provider-browser-test.js
```

Use `firefox` or `webkit` for the other engines. The harness performs its own build; do not run concurrent builds in the same checkout. Each report retains exact source/build hashes, priced quotes, paid postings, both call proofs, earned receipt, screenshots, trace ZIPs and final save. Any source drift makes the run diagnostic and unsuccessful for final evidence.

Only syntax validation of this new recorder has been executed by its author. The coordinator's public dispatch AC696–698 run passed separately (`/tmp/soc-pn-public-dispatch-r6.log`); it does not establish a browser pass. Actual recorder execution, visual inspection and any driver or product defects discovered remain pending.
