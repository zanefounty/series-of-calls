# Provider fast-speed repair and remaining limit

The previous [SOC-10 baseline](../provider-benchmark/README.md) measured one-minute updates at 220.7, 419.2 and 794.1ms for one, three and five customers. The old 8× loop requested one minute every 250ms and started a new Worker for every minute. The updated browser loop reuses its Worker, accumulates elapsed time during work and sends bounded 2-, 4- or 8-minute commands as the portfolio grows. The shared dispatcher still validates the command and breaks on new incidents, renewal or mission status changes. An explicit `stopOnProviderHandoff` option stops a batch when an authored queued case needs player attention; AC-SOC-893 checks the actual handoff minute, Worker replay, malformed flags and save restoration.

The [desktop report](desktop-report.json) and [390px, 4× CPU-throttled phone report](phone-report.json) import the same retained one-, three- and five-customer saves under real Chromium Web Locks. They run the actual frame, Worker, render and local-save path, verify restore/persistence and retain built-page, script and fixture hashes. Each 1× run advances two minutes; each 8× run advances sixteen. At five customers, both profiles also prove that pausing or dispatching a real incident acknowledgement during an in-flight batch prevents its old Worker result from overwriting the current save.

| Customers | Desktop 1× target pace | Desktop 8× target pace | Phone 1× target pace | Phone 8× target pace |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 96% | 96% | 89% | 57% |
| 3 | 92% | 92% | 75% | 69% |
| 5 | 86% | 86% | 56% | 57% |

These are short runs including the first tick, not a long-play guarantee or a claim that mobile 8× is fixed. The phone remains too slow, especially at five customers. A 4× CPU profile of that path showed roughly 0.4–0.6 seconds each for main-thread validation and Provider model construction after a batch; a larger source-level performance change and longer runtime acceptance are still required. Batching also makes the displayed clock advance in multi-minute steps at larger portfolios. Incident, renewal, mission-status and authored handoff stops are preserved; other short-window decisions need separate long-play verification.
