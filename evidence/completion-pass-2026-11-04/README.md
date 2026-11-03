# Continuation verification and Codex restart preparation

Execution dates are UTC on 3 November; the local session date is 4 November 2026 in Australia/Sydney. The full app remains incomplete and unreleasable. The owner requested setup and a handoff before restarting Codex with effective access.

## Executed evidence

| Check | Actual result and scope |
| --- | --- |
| [Complete JavaScript suite](final-suite/results.json) | **1,314 passed in 194 files**; zero failures, cancellations, skips or input drift during execution. Every `tests/*.test.js` ran in its own Node process; individual TAP files and input hashes are retained. |
| [Actual stdio MCP](mcp-final.json) | **63 passed cases**: 48 compact references, SP and two pack cases, plus twelve sequences spanning the four current campaign tracks across jurisdiction/mode combinations. No browser rendered. |
| [Registered checks](registered-checks/results.json) | **445 acceptance cases and 71 Python tests passed**. Development/delivery gates, 5,596 translation labels and build passed, with no input drift. Release correctly fails at unreviewed reference `REF-ac194430f67b3832`; the full product and operational blockers remain. |
| [Codex setup tests](codex-setup-tests.json) · [log](codex-setup-tests.log) | **Eight passed**: preference preservation, idempotence, conflicting/untrusted configuration refusal, project path escaping and stdio entrypoint resolution. These do not prove native session discovery. |
| [Native config parser](codex-native-config.json) | Installed Codex app-server accepted the project settings supplied as explicit overrides and returned valid startup JSON. No model call or MCP connection was started; project discovery remains a restart check. |
| [Browser campaign attempt](browser/2026-11-03T20-53-17-538Z-943df5/browser-campaigns.json) | Build succeeded, listener failed with `EPERM`; zero viewport results and no browser launched. The attempt was limited to one profile and could not constitute full acceptance even if it had run. |
| [Inherited SP benchmark](sp-performance.md) | Median of 15 headless/jsdom runs on the large-network fixture. Measures JavaScript, not browser painting, and has no comparison baseline or release performance threshold. |
| [Environment](environment.json) · [restart preflight](codex-preflight.json) | No Git metadata or locked local jsdom/Playwright; DNS and loopback listener blocked. Fresh probes after the owner's Full access selection still failed. |

JavaScript/MCP/translation checks use **Node 24.22.2 and external jsdom 30.0.1** through the explicitly supplied `NODE_PATH=/home/zane-fountylabs/workspace/fountry/node_modules`. The lockfile requires jsdom 24.1.3 and playwright-core 1.56.0. These are diagnostic results, not clean locked-dependency release evidence. The browser MCP independently pins version 0.0.84 and its own browser dependencies.

A separate [development-gate attempt without the dependency override](no-dependency-override.json) passed structural checks and failed behavioral execution (424 reported tests: 396 passed, 28 failed). The local dependency tree remains absent. That failed attempt is not counted as a successful release baseline or folded into the passing diagnostic totals.

The full JavaScript run preceded one acceptance metadata correction: adding `scripts/mcp-smoke.py` to the input inventory. [Input reconciliation](input-reconciliation.json) verifies that no runtime, tests, build or content changed afterward and that the actual MCP receipt still matches all its inputs. Registered acceptance and gate checks were then rerun on the corrected inventory. Original full-suite hashes were not rewritten.

## Retained failures and repairs

The [first complete run](full-suite/results.json) passed 1,313 of 1,314 cases. A negative progression test expected the old validation error; the new orphan-assignment check correctly rejected missing interactions earlier. The test now checks that exact error for deleted interactions and retains its other proof-loss checks. A clean full rerun then passed all 1,314 cases.

An initial Python run encountered the stale acceptance inventory. After recording acceptance, its baseline still failed because the progression case failed; the [initial check receipts](checks/results.json) preserve those outcomes and the failed TAP/acceptance files. Following the negative-test repair, [the next checks](final-checks/results.json) passed all 445 acceptance cases and 71 Python tests, but the development gate exposed the missing MCP-script input. That inventory omission was fixed and the recorder/gates rerun. No enforcement rule or expected release failure was removed.

## Delivered scope and limits

Customer requirements, workforce attendance/forecasts, synthetic callback delivery, their consoles, and longer campaign/MCP/UI recipes are integrated. Source-specific fidelity remains partial. New translation keys have English fallback values in the five non-English dictionaries; structural completeness is not human translation quality.

All 91 references/100 claims have [review proposals](../../research/review-proposals/README.md); the canonical owner-accepted register remains empty. All 4,787 requirements retain their honest statuses (209 partial, 4,578 pending); no final disposition or readiness flag was granted.

Project configuration, migration preview and restart instructions are in [Codex setup](../../docs/CODEX_SETUP.md). The global config migration was previewed and tested, not applied from this restricted executor. Managed policies, credentials, GitHub workflows, release governance and the disabled adaptation agent remain unchanged. Use [the handoff](../../docs/RESTART_HANDOFF.md) after relaunch.
