# Retained Provider bills and cash movements

Finance reads the existing Provider period summaries, customer histories and central business ledger. It does not create postings, advance time, alter prices or change save schemas. The map remains the active world; this is a contextual HQ drawer.

Players can select a retained settled period and inspect actual delivery, credits, retail revenue, supplier commitments and usage for each customer. Named central postings explain shared payroll, paid implementation, interest, funding and principal repayment. The cash bridge starts with opening cash and applies the recorded operating result plus funding minus principal repayment to reach closing cash. Setup, payroll and interest follow the simulation's recorded cost definition; borrowed principal is not revenue.

A settlement ends at the last posting explicitly tagged with that Provider period. A purchase or repayment after that boundary belongs to the next bill even if it has the same simulation-minute timestamp. Each shared payroll posting appears once. If retained postings or the required boundary are missing, or their revenue/cost totals cannot reconcile to the authoritative summary, Finance shows the available summary and explicitly withholds the detailed cash bridge.

Period selection is presentation state. Opening Finance selects the latest retained bill once; a subsequent settlement does not silently switch the selected bill. Focus, scroll and expanded posting references survive rendering. Opening this drawer preserves map selection.

The pure projection is `src/game/23-provider-finance-view.js`; the translated renderer is `src/game/93-ui/79-provider-finance.js`. The existing shell supplies view-only selection. Registered cases AC-SOC-623–630 cover real paid periods, borrowing during a loss, later same-minute transactions, two customers, missing postings, restore equality and persistent controls. English fallback strings are present in all six locale dictionaries; that is structural translation coverage, not human translation review.

The initial Chromium Swift desktop and Steady mobile journeys at runtime `e89dc8f` show actual failure-credit bills followed by measured recovery bills, visible posting reconciliation and retained selection across ticks. These are bounded automated observations, not a human pilot or a final cross-browser pass. Targets are PLAY-011-A03, PLAY-022-A02, PLAY-031-A01 and PLAY-050-A01; the 159-assertion ledger requires separate evidence review before any promotion.
