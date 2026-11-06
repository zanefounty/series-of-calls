# View-stability preview deployment

The protected Pages deployment [42138289754](https://github.com/zanefounty/series-of-calls/actions/runs/42138289754) published main `0ef9432da2b00067870e51490e90dc8d682483e7`. This records bounded public-origin verification, not completion of the gameplay rebuild. The unmerged regional and L8 changes are outside this deployed scope.

The coordinator executed the persistent-profile browser driver against `https://zanefounty.github.io/series-of-calls/`. Independent review rehashed the downloaded artifact, browser reports, driver and saved states; checked all three trace ZIPs; and inspected delivered-service, Training and cold-offline screenshots.

- All **47 HTTPS asset hashes** match `/tmp/soc-public-view-artifact`. The initial navigation used the old cached HTML; ordinary service-worker update changed the controller, replaced the cache and removed the old cache.
- Separate paused Training and Provider saves survived unchanged through the update and offline reloads of both `/` and `/index.html`. Training remained at minute 1. Actual visible purchases then completed carrier and partner commissioning, followed by an ordinary human-handled call at Provider minute 12. Three paid stage postings total A$6,000, leaving A$14,000. The call retained its case, agent, context, two-way media and three metered voice minutes. This was not a settled period or mission win.
- A fresh browser in the coordinator-attested network-none container loaded both entrypoints from the new cache in **515 ms / 387 ms**. Its network probe failed with `ENETUNREACH`; browser offline emulation was disabled. Both latest paused saves remained exact.

The public runs use Playwright 1.64.1. Online Chromium was `156.0.8078.4`; cold Chromium was `156.0.8078.80`. Cold fallback typography differs, so no pixel-equivalence claim is made. These are Chromium desktop results, not a mobile/three-engine publication matrix or human pilot.

Evidence remains outside Git:

| Artifact | SHA-256 |
| --- | --- |
| `/tmp/soc-public-view-stability-independent-review.json` | `7964b12f48262c7682077fc4c3ff30a324ac9f9c9b609e53610c180766ec844b` |
| `/tmp/soc-public-view-stability/verify-report.json` | `536cec8b0720d8be56af54231b876d1d0b0733c168b0439694a569c1ec7b304a` |
| `/tmp/soc-public-view-stability/cold-report.json` | `74df386b6a21364119de49392e9542bf174d275a33bec6fafce8c5b54d1696e0` |
| Deployed `index.html` | `670c43218bfdadad6ef590ed642d7b7329823cef64b96b78997f4d85693cc306` |
| Deployed `sw.js` | `28375a794313eea375bf9f12555bd744a1dd7b372a7e2a63e8f03f18035799e1` |

The review JSON includes all artifact, screenshot, trace, driver and HTTPS-receipt hashes. The reviewer did not independently rerun HTTPS requests or inspect Docker configuration; those execution facts come from the retained coordinator receipts. No acceptance assertion was promoted by this review.
