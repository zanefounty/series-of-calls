# Classification of the 3 November upstream observation

The 17 commits, four changed-file records and 35 new file-version records detected at `2026-11-03T21:30:48.263614+00:00` were classified on 13 November 2026. The seven-day classification deadline was missed. The original `detectedAt` values remain unchanged so this delay stays auditable.

All 56 records are marked `adapt`, `pending`, with no adoption evidence. This is a conservative triage of new upstream behavior against the fork's separate Provider, Training, Lab and SP rules. It does not claim implementation, approve an exclusion, or refresh the successful observation date. The exact identities and individual rationales are in `../register.json`.

| Change group | Reason for adaptation before adoption |
| --- | --- |
| Keyboard shortcuts, help and MCP views | Map controls must respect the active experience, focus and dialogs; MCP view classification must retain SOC authority. |
| Capital, region, cable and network data | Geography and route behavior must be mapped to the fork's world data and tested with its existing market and save rules. |
| Scenario, runtime and UI changes | Scenario revisions and service behavior need compatibility and domain review before use in synthetic gameplay. |
| Tests, dependencies, release notes and translations | Upstream assertions and tooling need fork-specific verification; localized copy still needs editorial review. |

`python3 scripts/verify.py upstream` passes after classification. Development can continue; release adoption deadlines and any separate research obligations remain in force.
