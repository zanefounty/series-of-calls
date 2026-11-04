# Independent Queueberry workforce-offer audit

Scope: bounded synthetic offer integration in `/tmp/soc-queueberry-implementation`; full product acceptance is not established. New owned integration tests: commit `4efc758`. All positive gameplay states were reached through `SOC.dispatch`; imported save edits are negative probes only. No source-pack, governance or release status changes.

## Findings reproduced before owner fixes

1. Transport coexistence: starting transport on an actual licensed root rejected `TRANSPORT_INVOICE_NOT_RECONCILED` because transport validated workforce invoices as its own. Root owner fixed source-specific reconciliation and required an actual WFM pack for its invoices.
2. Imported billing timeline: changing `workforceOffers.nextInvoiceAt` from 69 to 1008 at clock9 restored successfully, postponing renewal. Kernel now ties the deadline to the last typed cost record plus60.
3. Imported evidence chronology: observation/test timestamps at clock+1, or binding boundAt0 before test9, restored successfully. Kernel now checks chronology.
4. Imported paid cancellation: with actual pending cancellation at clock9 due69, changing offer provisioning.due to10 restored and advance1 removed entitlement early. The initial repair had put the check on integration instead of offer provisioning; independent reproduction caught this, and the builder corrected it in `b5783c6`.
5. Business ledger mismatch: changing only the retained WFM external cost row cents accepted import. Root owner now ties external invoice entryId to retained cost-row units/currency/category/reason/amount and rejects deletion without a genuine pruning marker. Positive historical test executes1001 real government qualification commands, observes actual eviction, and restores old invoice history.

## Verified behavior

16 full-dispatch integration tests passed; combined with14 kernel and2 DOM UI tests,32/32 passed on current live owner fixes. Two independent actual calls resolve through distinct agent-01/02 both without a WFM pack and with one licensed WFM person. The scoped60-minute forecast uses one person (15 projected contacts) while manual full-roster forecast uses two (30). Observed offline attendance reduces the scoped forecast to0; available attendance restores15. Licences neither add real people nor impose an artificial contact-routing restriction. Same-clock observations invalidate old tests; explicit retest and rebind repair coverage. Actual people resource generation changes stale tests; past receipts survive restore. Worker dispatch matches main-thread results, and repeated calculation leaves root bytes unchanged.

## Final ready-snapshot audit resolution

Builder added ready-state consistency guards. Independent full-dispatch test `ready workforce offer imports require consistent desired and effective snapshots` now rejects same-generation desired/effective units mismatch, null ready integration, and null effective offer with retained evidence using typed validator errors. The same test preserves a legitimate pending desired2/effective1 state. Public journey helper imports no tests; default31 commands cover recovery, forecasts, actual calls, prepaid renewal and cancellation. Eight replays across AU/US/JP/EU and success/recovery match their final expected states, without injected poststate. Default options omit a custom tenant to support visible new-exercise controls.

Save checks prove internal structural consistency, not cryptographic authenticity. WFM/source role and fictional Queueberry alias remain proposed-owner-review-required.

## Later lifecycle timestamp probe (pending final patch)

Before observations exist, the actual root at clock9 accepted offer/integration future activatedAt, past activatedAt0, and ready provisioning due8 instead of9. The immutable pre-fix receipt is `/tmp/soc-workforce-lifecycle-pre-fix.json`. In-progress guards reject all eight timestamp mutations (including the already rejected future ready due), but independently reject two legitimate command sequences: order1 → order0 → advance1 before first activation, and a paid cancelled offer → restart1 → cancel0 → advance1. The first must bill zero; the second must preserve its existing single invoice. `/tmp/soc-workforce-lifecycle-in-progress.json` preserves that regression. Kernel owner is correcting it; no full acceptance should rely on this intermediate source.

## Lifecycle final independent revalidation

Commit `f6ab055` independently passed the exact retained probe: all nine positive full-root restores pass and all eight negative timestamp mutations reject with `INVALID_WORKFORCE_OFFER_SAVE`. Cancelling before first activation has0 invoices/0 cents; cancelling a pending restart preserves1 invoice/4200 cents. Source SHA-256 `src/game/38-workforce-offers.js`: `dcebd56a4204d490e42fd5b69d3e3564cb5d8eebe87ca43656e63fa25c70a9f4`. Final result `/tmp/soc-workforce-lifecycle-final.json`, receipt `/tmp/soc-workforce-lifecycle-final-receipt.json`; fresh post-run input drift is empty. The earlier pre-fix and intermediate regression files remain unchanged. Checker source remains frozen; the previous80-case MCP receipt predates this kernel fix and still requires its final frozen-input rerun.
