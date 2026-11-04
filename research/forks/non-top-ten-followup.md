# Non-top-ten fork follow-up

**Checked:** 2026-11-04. Read-only inspection of existing bare clones at `/tmp/soc-fork-survey/repos`. The follow-up inspected immutable commits, code and test files; it did not run tests, query hosted checks or refresh clones. Test presence does not establish a pass. No gameplay, source-pack or acceptance/disposition edits were made.

## Flol0/seriesoftubes

Inspected extension history and cumulative archive ref:
[1db9201959ac](https://github.com/Flol0/seriesoftubes/commit/1db9201959ac3bd0ae720780e30f119818f0ea22), [688743ca0463](https://github.com/Flol0/seriesoftubes/commit/688743ca0463c4b3a5da25de323690c3a699a019), [1dc45bb81f81](https://github.com/Flol0/seriesoftubes/commit/1dc45bb81f81978c6dcdb8b7306c6e732a6637af), [07ce1a81fe1b](https://github.com/Flol0/seriesoftubes/commit/07ce1a81fe1b872750463a1c3763da56dd0f06cd), [7f2947bbe7dd](https://github.com/Flol0/seriesoftubes/commit/7f2947bbe7dd5dab213e48a29e46824b5100c7ea), cumulative ref [`1abd783e435c`](https://github.com/Flol0/seriesoftubes/commit/1abd783e435c27a5a76e076f86e67fb9ec978948). Concepts include power management and automatic maintenance, hosting and customer growth, own subsea cable/regeneration, service fabrics, redundant uplinks and POP planning.

Actual tests present: `tests/operations.test.js` covers power/tariff costs, UPS vs local/regional outage, overlapping faults, deferred generator maintenance, router/optic maintenance, hosting availability/revenue and legacy-save bounds. `tests/submarine.test.js` covers purchase rejection, owned routing, save reload, optical compatibility and regeneration cost/capacity. `tests/service-fabric.test.js` covers shared capacity, failure/redundancy, rolling maintenance, removal constraints and save sanitation; `tests/scaling.test.js` covers capacity growth. Not executed here.

**SOC comparison:** `src/game/32-site-operations.js` and `tests/site-integration.test.js` already exercise power domains, backup observations, continuity and recovery; SOC also has cable ships, own cable and subsea/optical behavior (`tests/cable-ships.test.js`, `tests/regions.test.js`). These are nearest anchors, not proof of semantic coverage. Fork power economics, hosting/customer growth, service-fabric sizing and POP capacity planning remain visible candidates for source mapping and distinctive-behavior comparison; this review makes no exclusion or acceptance decision. A focused follow-up could compare local-vs-regional outage diagnosis and bridge/recovery evidence against SOC's current exercises.

## LookedPath/seriesoftubes

Inspected refs: large-network responsiveness [`c0e76085504e`](https://github.com/LookedPath/seriesoftubes/commit/c0e76085504eeb4da9dc890be4bb4417fb57e38e); subsea designs [`d58ca2b14abf`](https://github.com/LookedPath/seriesoftubes/commit/d58ca2b14abf7fdbda31b789c6e690ed06b18eec); ocean routing [`8ac420c4c87a`](https://github.com/LookedPath/seriesoftubes/commit/8ac420c4c87aec7c23821422548f9424c5c8cc7c); upgrade scheduling [`2a83892de80d`](https://github.com/LookedPath/seriesoftubes/commit/2a83892de80dfefe5e256699dbf1fa2fb1e8bb78); routing reference/benchmark [`ffb8c50895ad`](https://github.com/LookedPath/seriesoftubes/commit/ffb8c50895ad27e117acd705dfaee68888931f58).

`tests/subsea-upgrade-timing.test.js` is present and covers commissioning dates tracking construction acceleration/delay, early-vs-late ordering, save repair/preservation, invalid or leased cases, atomic one-click pricing and equivalence to repeated hires. Current SOC has a same-named test and `src/game/10-catalog/60-reach-and-subsea.js`, including lay-ship timing and save behavior. This is strong overlap in the tested contract, not a claim of complete parity or reason to change any source disposition. The responsiveness commit has `tests/performance.test.js` for paused/animation-off redraw suppression; the routing benchmark tip adds a reference comparison and exported-save benchmark. These performance changes are distinct candidates; no equivalence review or execution was done.

## wesleymarquesnetworks/seriesoftubes

Inspected [`5dc81b38f643`](https://github.com/wesleymarquesnetworks/seriesoftubes/commit/5dc81b38f6432cf102f15dca2e13de46101ab3d9) (redundancy manager), [`c5f6bfb5f4db`](https://github.com/wesleymarquesnetworks/seriesoftubes/commit/c5f6bfb5f4db33463512aa1778abe06059dca31a) (dual-site PNI LAG) and [`839be19409cf`](https://github.com/wesleymarquesnetworks/seriesoftubes/commit/839be19409cf454692df949d1963ab096de911f9) (saturated-path scan).

`tests/redundancy.test.js` is present: it checks bulk link review, idle/standby selection, savings, capacity and diversity warnings, leased-link protection, last-link confirmation, and retaining a high-capacity link by default. SOC's `tests/standing-orders.test.js` covers automatic retirement with capacity/customer/diversity safeguards; one-link removal has confirmation and redundancy checks are non-mutating (`tests/link-trial.test.js`, `tests/issues.test.js`). A manual batch review with visible savings/capacity/diversity consequences may be a distinct user workflow; its relevance awaits source mapping, not exclusion.

The dual-site PNI change orders a two-member LAG when moving a single-member PNI to both sites. SOC `tests/issues.test.js` `#219` covers ordering, preserving Both intent, one charge, save/load and split on arrival. The saturated-path change skips full candidate paths; SOC `src/game/80-simulation/30-compute.js` and test `#210` cover related pruning. These are local overlaps for the inspected cases, not blanket parity. No patch or disposition change follows.

## Attribution and limits

All three fork tips inspected retain MIT `LICENSE` copyright Frederic Jung. Preserve license and upstream/fork-contributor attribution if any later reuse is considered. The pinned commit links identify provenance; they do not make fork-authored changes SOC-original. Fork/source statuses remain pending owner review; nothing is excluded or newly accepted. This is clone-snapshot evidence only: these additional fork tests were not executed and the clone refs were not refreshed. The coordinator verified all 14 immutable commit links against the exact survey objects and inspected the local PNI, saturated-path and retirement checks.

## Subsequent focused tests

After the read-only inspection above, isolated locked installs exercised the redundancy, Flol0 operations/submarine/service-fabric/scaling, and LookedPath performance tests. They passed 2, 36 and 6 cases respectively. [The execution record](executed-tests.md#non-top-ten-focused-execution) documents exact commands, source pins, restored partial-clone blobs and the unavailable initial test logs. This does not change source acceptance or establish full parity.
