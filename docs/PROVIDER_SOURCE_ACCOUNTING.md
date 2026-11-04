# Provider rebuild source accounting

**Snapshot:** 4 November 2026. This is an implementation accounting against the supplied gameplay pack and unchanged mapping pack. It is not an owner disposition, source-fidelity acceptance, or release receipt. The machine-readable, row-by-row inventory is [provider-rebuild-accounting.json](provider-rebuild-accounting.json).

## Counts reconciled

The original mapping pack is `research/source/series-of-calls-full-mapping.json` (3,454 rows; SHA-256 `a971dd4fca10b44d258288b790631a963987999a272d1b5bc1780f31550c18af`). The pack is treated as read-only and remains the authority for source IDs and proposal context. The versioned provider specification adds 52 `PLAY-*` requirements and a 28-row mechanic crosswalk.

| Source set | Count | Current coverage summary |
|---|---:|---|
| Provider gameplay requirements (`PLAY-*`) | 52 | 51 shared/partial; 1 pending (independent human pilot) |
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

The [verification handoff](PROVIDER_VERIFICATION.md) records the executed checks, actual revisions, environment, failure history and external artifact locations. It includes real visible-control missions, fourteen representative paid family paths, long-run active demand, save/worker continuation and the development/release gate distinction. Raw logs and screenshots remain outside Git. Older committed `evidence/` receipts are historical and are not relabelled as this rebuild.

## Remaining source obligations

1. **Action catalogue fidelity:** all 193 source actions have a contextual home or explicit pending path in the JSON. Nine mapped symbols have no text match in their mapped legacy file: `action:inbox`, `action:inboxAct`, `action:inboxPol`, `action:inboxRaiseAll`, `action:inboxAll`, `action:inboxBot`, `action:advertise`, `action:ixbh`, and `action:cont`. Campaign, Training and Lab placement does not establish every transformed source behaviour.
2. **Actor fidelity:** Disco Collaboration, Genesys, Voss and Slack have runtime/profile references among the 51 preserved records. These references and representative category paths do not establish each actor's distinctive authority, pricing, failure, support or customer consequence. The other 47 records remain explicitly pending.
3. **Original goals and levels:** the new state-based coach and commercial segment progression are separate from complete adaptation of all 13 source levels and 19 source goal predicates/rewards. Their proposed placement is recorded without approving exclusions or declaring fidelity.
4. **Named companies and upstream mechanics:** shared implementations and authored market pressure do not complete all source-specific named-company, partner and infrastructure behaviour. Preserve the crosswalk's outstanding obligations.
5. **Product depth and jurisdiction:** each of the fourteen families has a representative paid campaign path. Feature-level lifecycle, pricing, delegation and supported-path fidelity remain individually tracked. Government/defence evidence is workload-scoped scenario evidence, not legal or security approval.
6. **Human pilot:** the counterbalanced 6–8-person protocol is prepared, but no independent participants have been observed. Automated UI tests do not replace those observations.

The supplied revision's visible gameplay and engineering checks are accounted separately from these broader conversion obligations. The canonical 4,839 requirements still have 216 partial and 4,623 pending records, zero final dispositions and zero owner-accepted research reviews. This document does not change those statuses or any release gate.

The JSON records each source identifier, mapped title/role, contextual home, status, relevant implementation paths and remaining distinct obligation. This accounting does not alter the full source dispositions, research proposals, owner decisions or release gates.
