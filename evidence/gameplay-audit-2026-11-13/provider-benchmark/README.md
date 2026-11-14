# SOC-10 Provider performance baseline

`tests/provider-segments.test.js` produced the three compressed saves through actual validated dispatch during its passing full segment journey (`SOC_PROVIDER_PERF_FIXTURE_DIR=/tmp/soc-provider-perf-fixtures-20261113 node --test tests/provider-segments.test.js`). Each saved root was restored and checked against its customer count before use. The one-customer checkpoint is a qualified SMB period; three customers includes active Enterprise service and a recorded partner meeting; five includes Government delivery. These are distinct career stages, so growth in timings is not attributable to customer count alone.

`node scripts/provider-perf-bench.js --runs 5 --out /tmp/soc-provider-perf-retained.json` replayed the retained saves in built Chromium on an AMD Ryzen 9 9950X Linux host at baseline commit `9ebac67`. [The report](report.json) contains all samples, host and browser versions, fixture and source hashes, and save states. Timings are medians in milliseconds, with DOM layout forced during render. At this baseline the runtime started a new Worker for each minute. At 1× it scheduled a minute every 2,000ms; at 8×, every 250ms. Pipeline figures sum separately measured medians for fresh Worker turnaround, validation, Provider model, render and save, so they are an estimate rather than a measured frame interval. [Later real-frame measurements](../provider-speed/README.md) use the changed runtime.

| Customers | Dispatch one minute | Fresh Worker | Inspect | Model | Render | Save | Pipeline estimate | 8× budget used |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 23.8 | 122.1 | 30.7 | 30.1 | 58.3 | 0.7 | 220.7 | 88% |
| 3 | 63.3 | 190.8 | 85.9 | 76.7 | 121.0 | 2.5 | 419.2 | 168% |
| 5 | 192.7 | 355.1 | 142.2 | 131.0 | 214.1 | 6.6 | 794.1 | 318% |

All direct dispatch, Worker and save/restore outcomes matched. One hundred forty percent or more of the 8× tick budget is a concrete responsiveness problem in larger portfolios. The next work is to reduce repeated Worker startup and model/render work, then run the same saves through the real frame loop at 1× and 8× while checking incident, renewal, handoff and save boundaries. Do not claim that 8× meets its requested speed from this benchmark.
