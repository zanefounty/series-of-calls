# Provider rebuild source accounting

**Snapshot:** 4 November 2026. This is an implementation accounting against the supplied gameplay pack and unchanged mapping pack. It is not an owner disposition, source-fidelity acceptance, or release receipt. The machine-readable, row-by-row inventory is [provider-rebuild-accounting.json](provider-rebuild-accounting.json).

## Counts reconciled

The original mapping pack is `research/source/series-of-calls-full-mapping.json` (3,454 rows; SHA-256 `a971dd4fca10b44d258288b790631a963987999a272d1b5bc1780f31550c18af`). The pack is treated as read-only and remains the authority for source IDs and proposal context. The versioned provider specification adds 52 `PLAY-*` requirements and a 28-row mechanic crosswalk.

| Source set | Count | Current coverage summary |
|---|---:|---|
| Provider gameplay requirements (`PLAY-*`) | 52 | 50 shared/partial; 2 pending (complete visible-UI acceptance and human pilot) |
| Gameplay mechanics crosswalk | 28 | 25 shared/partial; 3 pending |
| Views | 25 | 25 shared/partial |
| Tutorial steps | 6 | 6 shared/partial |
| Progression levels | 13 | 13 shared/partial |
| Goals | 19 | 19 shared/partial |
| Existing player-action mappings | 193 | 193 pending item-specific provider/Lab disposition; 184 source-symbol strings are present in the mapped legacy file and 9 are not. All 193 have a proposed contextual home in the inventory. A textual match does not establish an executable handler or provider adaptation. |
| New ecosystem actor records | 51 | 4 have runtime/profile references; 47 have no runtime reference. No record is treated as fully realized actor-specific gameplay. |

“Shared/partial” means that relevant infrastructure or a contextual screen/command exists in this checkout. It does not mean the source item has passed its individual acceptance criteria. For action mappings in particular, a legacy Lab handler does not prove campaign adaptation. For actors, an ID referenced by a family/profile is not proof that the actor changes a player choice, price, dependency, capacity, failure or customer result. The inventory keeps source-specific obligations beside each row to prevent those inferences.

## Evidence checked

The accounting was checked against all 52 records in `spec/provider-gameplay-v1/requirements.json`, all 28 rows in `gameplay-crosswalk.json`, and the unchanged full mapping pack, then reconciled with the current provider campaign, rules, UI, products, history, channels, workforce modules and focused behavioural tests. Evidence paths identify relevant coverage; they do not imply every acceptance point in a requirement is complete.

Current local diagnostics available outside Git on 4 November 2026 are:

- The provider-focused run in `/tmp/soc-provider-all.log` records 74 tests: 73 passed, none failed and one skipped. The skipped test is the opt-in 20-customer/10,000-minute soak; its existence is not execution evidence.
- The full JavaScript run in `/tmp/soc-provider-full-js-2026-11-04.log` records 1,537 tests: 1,536 passed, none failed and one skipped. These are diagnostic logs rather than a regenerated acceptance receipt.
- The focused channel integration command `rtk node --test --test-isolation=none tests/provider-demand-integration.test.js` passed 3/3. It exercised actual campaign scheduling, case identity, workplace permissions, completed meeting sessions, webhook retries, period usage posting, incident recovery and save restoration.
- `rtk node scripts/build.js` and `rtk node scripts/i18n-check.js` passed; the latter reported 5,818 English labels and no translation problems across the five dictionaries.
- `/tmp/soc-provider-gameplay-browser/provider-browser.json` records one passing defence desktop journey with Chromium 141.0.7390.37 and Playwright 1.56.0, from paused career through incident recovery, two-period evidence and mission victory. The recorded viewport was 1366 pixels with no document-width overflow and no reported browser errors. This is one scenario at one desktop viewport, not the required four-mission desktop/mobile acceptance set.

The checked-in `evidence/acceptance.json` is older: it records 603 passing cases at 2026-11-04 07:29 UTC and predates this rebuild. `evidence/browser.json` and `evidence/verification.json` likewise belong to their recorded candidate/input snapshot. Neither substitutes for the diagnostics above or establishes source completion. The logs and browser report remain outside Git; no raw artifacts were added to this accounting.

## Highest-priority remaining gameplay obligations

1. **Current visible journey evidence:** finish the fresh-player quote, commissioning, delivery, incident, settlement and expansion journey through the current UI, at desktop and mobile sizes and by keyboard. Keep UI state/focus stable through ticks. Record current candidate/browser/viewport and console output. `PLAY-050` remains pending; browser receipts from an earlier candidate are not current acceptance.
2. **Action catalogue contextualization:** all 193 source action mappings now have a contextual home or explicit pending path in the JSON. The 9 mapped symbols without a source-file text match are `action:inbox`, `action:inboxAct`, `action:inboxPol`, `action:inboxRaiseAll`, `action:inboxAll`, `action:inboxBot`, `action:advertise`, `action:ixbh`, and `action:cont`. For all 193, verify which actions belong in Campaign, Training or Lab and test their transformed behaviour; do not expose campaign authoring or grant unearned authority.
3. **Actor ecosystem fidelity:** Disco Collaboration, Genesys, Voss and Slack currently have runtime/profile references among the 51 records. Slack's reference is a fictional workplace-channel profile in `src/game/47-channels.js`, exercised with actual account eligibility and case-bound delivery; it does not implement the whole source actor. Keep the 47 unreferenced records visible as pending. For each actor promoted into the experience, define ownership/resale/support authority and at least one meaningful commercial or service consequence; avoid a flat supplier catalogue.
4. **Tutorial, goals and levels:** the existing tutorial and progression systems are present and current provider goals render, but each of the six adapted lessons, 13 source-derived level predicates/unlocks and 19 source-derived goal predicates/rewards still need item-specific mapping and acceptance. Generic progression machinery is not completion.
5. **Distinctive source behaviour:** the 28 mechanic rows include infrastructure that is shared with the upstream game and provider-specific additions. Finish obligations for partner/events, market/rival supply, source-specific named company/partner behaviours and mapped service counterparts; a reusable recipe or representative product path does not discharge every catalogue row.
6. **Four missions and 14 product families:** current tests cover real campaign mission evidence and representative product paths, but remaining feature-level behaviour, lifecycle, pricing, authority, provider roles and channel substitution remain separate work. Keep government/defence evidence workload-scoped and synthetic; geography or a product label is not approval.
7. **Long-run and release checks:** the declared 20-customer/10,000-minute workload has an opt-in fixture but was skipped in the current focused run; execute it with nonzero demand and deterministic continuation. Complete current worker/save parity, all-mission desktop/mobile browser acceptance and remaining gate checks. Build and translation diagnostics passed for this candidate. Keep the release gate failing until required obligations have real evidence.
8. **Human pilot:** no human playtest is evidenced. Recruit the specified 6–8 independent participants and retain counterbalanced individual observations before claiming usability findings. `PLAY-052` remains pending.

The JSON records each source identifier, mapped title/role, contextual home, status, relevant implementation paths and remaining distinct obligation. This accounting does not alter the full source dispositions, research proposals, owner decisions or release gates.
