# Provider view persistence browser evidence

`scripts/provider-view-stability-browser.js` is a bounded real-control recorder for PLAY-020-A01 and PLAY-020-A02. It creates separate fresh SMB careers at 1366×768 and 390×844, buys all three Swift stages through map controls, and records screenshots, Playwright traces and final saves outside Git.

Run from this checkout after the coordinator freezes tested inputs:

```sh
SOC_PROVIDER_BROWSER_ENGINE=chromium \
SOC_PROVIDER_BROWSER_OUT=/tmp/soc-view-stability-chromium \
node scripts/provider-view-stability-browser.js
```

The same command accepts `firefox` or `webkit`. Use browsers matching the lockfile and the compatible browser container where required. The existing main recorder builds and serves the checkout; do not run concurrent builds in the same worktree. The new recorder includes its own file in the before/after source manifest without changing the shared journey registry. Changed inputs invalidate candidate evidence. Its exported `runViewStabilityJourney(hooks, {mobile})` accepts the same real-control hooks as the other Provider journey modules.

The recorder checks a native retail-price edit and Enter submission, retained value and focus, and subsequent native replacement of selected text. It compares the complete simulation before and after review. Number inputs do not expose `selectionStart`; the native replacement is the selection check, rather than a fabricated caret offset.

After paid commissioning, it sets a nondefault camera through the visible zoom control, selects the customer, expands an inspector section and scrolls it with the mouse wheel. Two actual clock advances must occur, with a real browser worker observed. It compares selected customer, camera, layer, focused element, expanded details and scroll offset before and after those responses. Each failed comparison remains in the report; the recorder exits unsuccessfully if either viewport fails. No evaluation changes state, DOM, time, focus or scroll.

## Limits and current findings

Opening a purchase quote invokes `providerDecision(true)`, pauses the clock and cancels pending work. The production quote callback is synchronous. Therefore the quote check does **not** prove an unfinished purchase draft surviving ticks or an asynchronous quote response. Those portions of PLAY-020-A01 remain open; the inspector check does exercise real asynchronous worker results. A successful recorder is bounded evidence, not automatic acceptance closure.

The initial Chromium development run recorded both desktop and mobile failures: retail draft value/focus/selection loss, closed inspector details and changed scroll. Its receipt is `/tmp/soc-view-stability-diagnostic/provider-browser-20261105235010146.json`; inputs changed during execution, so it is diagnostic evidence only. Preserve that failure.

The repair scopes inspector presentation to the selected object and keys journey evidence by actual job ID. It retains open/closed details and scroll only for the same scope. Quote refresh keeps the same native retail input while revised terms are pending; commitment remains disabled until the new quote arrives. Opt-in Provider keys let the DOM morph retain a form or journey when adjacent content changes; unrelated controls retain the existing action-identity replacement checks. No pause or dispatch rule changes.

Validation: Node syntax and diff checks passed. The isolated main-based UI slice passed 21 DOM/shell tests (including seven new AC-SOC-688–694 cases) in `/tmp/soc-view-stability-main-ui-r2.log`. These cover asynchronous and synchronous quote responses, refusal, disabled commitment while pending, another-plan/customer isolation, job insertion/reordering, dynamic section counts and changed job-action identity. The initial isolated attempt lacked the jsdom module; the successful rerun used the existing integration node_modules through NODE_PATH, without installing dependencies. This is DOM evidence, not a repaired-browser pass; the actual browser rerun is pending. The coordinator owns actual execution and any runtime fixes; this slice changes no dispatch, economy, persistence schema or shared registry.

The second Chromium diagnostic (`/tmp/soc-view-stability-repaired/provider-browser-20261105235334177.json`) had unchanged inputs and passed inspector details, focus, scroll, camera and customer selection at both sizes, but still failed retail draft preservation. The trace showed an empty inline style attribute on the native input, which made the generic input comparison replace it. AC-SOC-694 reproduces that condition; the scoped retail template now retains that nonsemantic attribute. Keep the failed report; the final repaired browser run remains pending.
