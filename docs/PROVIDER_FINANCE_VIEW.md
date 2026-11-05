# Retained Provider bills and cash movements

Finance reads the existing Provider period summaries, customer histories and central business ledger. It does not create postings, advance time, alter prices or change save schemas. The map remains the active world; this is a contextual HQ drawer.

Players can select a retained settled period and inspect actual delivery, credits, retail revenue, supplier commitments and usage for each customer. Named central postings explain shared payroll, paid implementation, interest, funding and principal repayment. The cash bridge starts with opening cash and applies the recorded operating result plus funding minus principal repayment to reach closing cash. Setup, payroll and interest follow the simulation's recorded cost definition; borrowed principal is not revenue.

A settlement ends at the last posting explicitly tagged with that Provider period. A purchase or repayment after that boundary belongs to the next bill even if it has the same simulation-minute timestamp. Each shared payroll posting appears once. If retained postings or the required boundary are missing, or their revenue/cost totals cannot reconcile to the authoritative summary, Finance shows the available summary and explicitly withholds the detailed cash bridge.

Period selection is presentation state. Opening Finance selects the latest retained bill once; a subsequent settlement does not silently switch the selected bill. Focus, scroll and expanded posting references survive rendering. Opening this drawer preserves map selection.

The pure projection is `src/game/23-provider-finance-view.js`; the translated renderer is `src/game/93-ui/79-provider-finance.js`. The existing shell supplies view-only selection. Registered cases AC-SOC-623–630 cover real paid periods, borrowing during a loss, later same-minute transactions, two customers, missing postings, restore equality and persistent controls. English fallback strings are present in all six locale dictionaries; that is structural translation coverage, not human translation review.

The initial Chromium Swift desktop and Steady mobile journeys at runtime `e89dc8f` show actual failure-credit bills followed by measured recovery bills, visible posting reconciliation and retained selection across ticks. These are bounded automated observations, not a human pilot or a final cross-browser pass. Targets are PLAY-011-A03, PLAY-022-A02, PLAY-031-A01 and PLAY-050-A01; the 159-assertion ledger requires separate evidence review before any promotion.

## Bounded verification — 6 November 2026

Frozen candidate `4bc9d2005f9886d21b001d3d4f7c3f68c4becb88` passed all twelve visible SMB journeys: Swift and Steady, each at 1366×768 and 390×844, in Chromium, Firefox and WebKit using lockfile-matched Playwright 1.64.1. Independent review matched all 372 source inputs before/after execution and all 47 built files for each engine. There was no source drift. The Finance driver SHA-256 was `5f6128b92e3d160def9d9f57126f77faf9bc8c16617f33e4a6dbdab90fbd207b`.

Raw receipts and screenshots remain outside Git:

| Engine | Receipt under `/tmp/` |
| --- | --- |
| Chromium | `soc-finance-r3-chromium/provider-browser-20261105125805044.json` |
| Firefox | `soc-finance-r3-firefox/provider-browser-20261105125805057.json` |
| WebKit | `soc-finance-r3-webkit/provider-browser-20261105125805032.json` |

Each journey records `finance-period-0-overview.png`, `finance-period-0-cash-bridge.png`, `finance-period-0-postings.png` and the corresponding period-1 screenshots in its journey directory. Independent visual review sampled WebKit `steady-mobile` cash reconciliation, Firefox `swift-desktop` overview and Chromium `swift-mobile` recovered postings. Bill text was readable; the persistent heading and close target remained visible, the close target met 44px, and the full cash bridge fit without horizontal overflow. Recorded bounds cover both periods in all twelve journeys.

All displayed posting totals and cash deltas were independently reconciled. Swift's initial credit was A$208.63 and Steady's A$146.66; each recovered period showed zero credit and 24/24 on-time cases. Both strategies subsequently recorded two qualifying profitable periods, renewal/exit or continuation, and a funded next-customer base order. Selection and expanded posting details survived a real tick.

The focused Finance/shell run passed 22 tests (eight Finance cases, fourteen shell cases). At source `16d61d4`, actual stdio MCP passed five journeys, and the separate Playwright MCP process passed nineteen visible-control checks with no source drift. Logs are `/tmp/soc-finance-integrated-tests.log`, `/tmp/soc-finance-provider-stdio.log` and `/tmp/soc-finance-provider-browser-mcp.log`; the browser-MCP receipt is `/tmp/soc-finance-provider-browser-mcp/2026-11-05T12-43-24-227725Z/report.json`. That MCP process used package 0.0.84 and its Playwright 1.65.0-alpha-2026-10-30 dependency: it is transport smoke evidence, not the lockfile-matched browser matrix or native connector certification. The only source change from `16d61d4` to `4bc9d20` was the Finance browser scroll helper; application runtime was unchanged.

Earlier failures remain preserved. The initial Firefox run exposed fractional scrolling; the `16d61d4` WebKit run exhausted eight wheel attempts before animation settled (`/tmp/soc-finance-r2-webkit/provider-browser-20261105124046301.json`). The final helper waits for observed scrolling to settle between bounded real wheel inputs. Eighteen generated-DOM scroll cases passed across the three engines before the fresh twelve gameplay runs; those fixtures alone were not gameplay evidence.

The independent clause review is `/tmp/soc-finance-final-acceptance-review.json`. It recommends the exact original scope of PLAY-011-A03, PLAY-022-A02 (the bill explanation branch), PLAY-031-A01 and PLAY-050-A01 for coordinator reconciliation. This document does not alter the acceptance ledger. Browser debt principal and repayments were zero; nonzero borrowing/repayment distinctions come from the public-dispatch tests. Expansion evidence establishes a paid order in progress, not delivered second-customer service. Retention behavior is covered by the focused tests, not a new long-play run. These automated observations do not establish human comprehension, a human pilot, complete failure explanations, publication or the full gameplay rebuild.
