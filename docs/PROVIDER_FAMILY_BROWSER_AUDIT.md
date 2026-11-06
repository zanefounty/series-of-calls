# Fourteen-family visible-control audit

Dated 6 November 2026. This is a driver and evidence-scope audit, not a current browser pass or release declaration. Driver preparation starts from `f9d6445` and incorporates `cf8788e` (bridge/reinstallation repair). Final combined runtime inputs must be frozen before new matrix receipts are recorded. Only the browser driver and this document are owned by this slice.

## Existing evidence and its limits

The historical `0ac943090073ebd558349ccf6d9c48a31f4e40a7` matrix contains 45 desktop paths: fourteen product paths plus workplace retirement, on Chromium, Firefox and WebKit. Its independent review is `/tmp/soc-family-visible-0ac9430-three-engine-independent-review.json`, SHA-256 `34148d29b531f69619067f9670166a534c0b46de42ca60280d757e2a5eaa8394`. The three reports are:

- Chromium: `/tmp/soc-family-visible-0ac9430-chromium/provider-browser-20261105220800742.json`, `9c224e810cafd9e269427fd885503af0b5823c2f79469d3efeb039b80b505f1a`.
- Firefox: `/tmp/soc-family-visible-0ac9430-firefox/provider-browser-20261105221019693.json`, `a8741e7d94aa90d0a08102b42eefe5701c5ed86cf67e51df894eabd7614a06fa`.
- WebKit: `/tmp/soc-family-visible-0ac9430-webkit/provider-browser-20261105221021332.json`, `22d365d0f1061cdbaac461fec9c9d01860e194117dd35f13c96aefdfebdfc11d`.

These are older inputs and desktop only. They do not establish a current mobile pass, fourteen complete product catalogues, every family limitation, or per-family save/reload. Native family tests supply additional domain evidence but are not visible UI receipts. No exclusion is approved here.

## Actual family contracts

Recipe IDs and bindings come from `src/game/23-provider-products.js`; service observations use `src/game/55-communications.js`, `src/game/52-information.js`, and the real campaign jobs/events. The existing domain contract is exercised in `tests/provider-family-capabilities.test.js`. Each browser path buys the recipe using visible paid operations, then requires family-specific delivered evidence. An aggregate count of four completed customer jobs is supplementary, never the product capability proof.

| Recipe | Actual capability required | Bounded limitation and recovery | Remaining scope |
| --- | --- | --- | --- |
| ms-workplace-calling | Duration-bearing voice with accepted paid product binding | Separate `product-retirement`: actual in-flight call fails when retired; retained records; paid recommission delivers new bound voice | Link the matching retirement receipt; wider workplace features remain separate |
| ms-meetings-room | Recorded completed meeting, actual authored job or mission origin, current paid room binding and admission generations | Authored zero participant capacity refuses meeting without capture/reservation; paid repair restores a fresh recorded meeting | Calendar permission withdrawal and wider family features |
| ms-contact-centre | Staffed digital case with context and accepted routing/CRM features | Paid licences alone do not remove peak queue delay; paid BPO staff improve next-period delivery while old history remains | CRM permission withdrawal and broader features |
| ms-communications-api | Workplace account case, embedded/supported-architecture accepted features, same-case workflow receipt | Actual HTTP 503/backoff/202 sequence; one period message charge despite retries | Wider API catalogue; retry is included in the paid blueprint, not a fictitious extra repair |
| ms-government-boundary | Bound voice and deployment-generation scoped effective proofs | Retirement makes historical scope unavailable; paid recommission creates new proofs and fresh delivered work | Legal authorization and discretionary eligibility withdrawal |
| ms-local-deployment | Accepted local voice during actual disconnection | Finite autonomy expiry refuses work; paid reconnection delivers a fresh bound case while failed work remains unchanged | Product support/licensing lifecycle changes |
| cisco-suite-calling | Duration-bearing multitenant voice with paid binding | Authored carrier loss blocks actual product call despite commissioned product; paid repair restores bound PSTN delivery | Wider suite features |
| cisco-dedicated-uc | Alex's actual dedicated-platform call while Bea remains on original phone | Local compute autonomy expiry blocks dedicated cohort; paid reconnection restores recorded dedicated service | Wider dedicated estate and arbitrary fault scenarios |
| cisco-contact-centre | Accepted quality-review feature with recording, stored transcript and processing from that recording | Capture capacity denial creates no AI output; paid recorder headroom enables fresh capture/processing and paid same-case review | Consent withdrawal and wider contact-centre features |
| cisco-programmable-engagement | Chatterleaf case with channel/workflow/webhook feature bindings and receipt | Actual HTTP 503/backoff/202 and once-only period usage reconciliation | Wider engagement catalogue |
| cisco-meetings-interoperability | Actual authored recorded bridge meeting, distinct platforms, current room/profile generations and product binding | Paid native-room comparison discloses disabled bridge and retained deployment; real meeting refuses; paid bridge recommission delivers fresh meeting | Wider provider eligibility; integrated bridge/reinstall runtime still needs fresh receipts |
| cisco-provider-operations | Scoped automation creates actual fulfilled migration order, paid posting and reconciled wholesale rows | Zero budget refuses order without charge; visible budget change permits paid action | Wider operations catalogue |
| cisco-government-boundary | Bound voice with this family's scoped proofs | Retirement invalidates current use of old proofs; paid generation replacement restores work | Wider sovereign catalogue and external approvals |
| cisco-local-speech | Actual stored transcript from recording, with model bound to paid deployment generation | Retirement makes model/integration stale; paid new-generation model/integration restores processing | Independent language/stage policy changes |

## Driver gaps addressed in preparation

`runProductJourney` now has desktop and 390×844 mobile entry points for all fourteen recipes and the retirement comparison. It captures native traces and exact final/failure state JSON. These snapshots are observations, not injected states or proof of a visible save roundtrip. Browser evaluation remains read-only.

Room capability previously selected any completed post-project session. The revised predicate requires a capture, paid room feature binding, recorded admission generations matching the current room/profile, and the exact real Provider job/event or scheduled mission meeting/event. It follows the origin shapes used in `src/game/23-provider-room-integration.js`. Bridge capability additionally requires an actual bridge admission and distinct platforms. Interop refusal requires its actual Provider job; recovery requires either that exact job/event lineage or the canonical scheduled mission meeting/event lineage, with the same paid scope and generation checks. Unbound sessions remain insufficient.

Local recovery previously selected any completed voice. It now requires the same customer/job/case, positive usage, accepted local product binding, connected context, and unchanged failed interaction. Local speech requires processing to consume the actual recording and the current paid model generation. Retirement reports explicitly link their bounded limitation evidence; base workplace completion alone still does not prove that limitation.

## Execution contract

Use `SOC_PROVIDER_BROWSER_JOURNEYS=product-<recipe>` for desktop and `product-<recipe>-mobile` for mobile; `product-retirement` and `product-retirement-mobile` cover workplace retirement. `SOC_PROVIDER_BROWSER_PRODUCTS=<comma-separated recipe IDs>` selects both viewports. Keep each engine's build output isolated. Freeze the combined runtime and driver, record pre/post tracked input hashes, dependency lock and pinned image identity, and retain all failures before any rerun. Start with targeted room/local mobile diagnostics, then execute the fourteen recipes plus retirement across the required viewports/engines after coordination.

The pinned execution image is `mcr.microsoft.com/playwright:v1.64.1-noble@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f`; dependencies are `/tmp/soc-room-r7-lock-deps` with package SHA-256 `903d9412879438c8fd09c08d6e18d4e8188e65d8817625252ad54caef74c8007` and lock SHA-256 `8606aeece2b3b0af655f1902f33292862a2fef7694ee6fd88f156dcd2745309a`. Recheck these before launch. No new browser pass is claimed by this preparation document.

## First frozen mobile diagnostic

The exact `28414c0658cf6b37f38340d2e857197245396832` Chromium mobile diagnostic completed two paths (MS room and MS local), then failed a driver-only job assertion in interoperability recovery. Local speech was not reached. The report is `/home/zane-fountylabs/soc-evidence-archive/family-28414c0-evidence/diagnostic/provider-browser-20261106090606072.json`, SHA-256 `e1b6ae02270e0d6799048735a19923eac884d8a807124e2455bc902243fdc945`; all 1,459 tracked input hashes were unchanged and 77 artifacts were retained.

The actual recovered bridge session `meeting-session-5` ran at 200–204 after paid recommission project `provider-project-11` completed at 155. Its canonical origin is the scheduled mission meeting for period 3 and `MISSION_MEETING_BOOKED` event `provider-event-128`, with booking `booking-46`, recorded bridge admission/profile generation 6, room generation 2, and capture `record-172`. There is correctly no Provider job for this authored mission meeting. The driver correction uses the strict capability proof for recovery and accepts either canonical origin. The failed run remains visible; it is not converted into a pass. Affected diagnostics and the fresh matrix remain to be executed on the corrected driver.

The corrected-driver diagnostic at `1a1e7ceabf2e0bdd9d4b717d22ed06f9c338368c` passed interoperability/mobile and local-speech/mobile. Its runtime (`src`, `site`, `content`) is identical to `28414c0`. Report: `/home/zane-fountylabs/soc-evidence-archive/family-1a1e7ce-evidence/diagnostic/provider-browser-20261106091740707.json`, SHA-256 `f3558691453b52756ab1d1791eb23c8c45cd3a696cd4ebe59e0906087167f25f`. All 1,459 tracked inputs remained unchanged; 71 artifacts were retained. The final matrix driver additionally scrolls the compatibility panel into view before its screenshot, because the earlier mobile image showed only the upper cost panel. The full ninety-case matrix is still pending; these two corrected cases and the two earlier successful cases are not relabelled as that matrix.
