## Performance on a big network

104 POPs · 146 links · 950 PNIs · 832 cache boxes · 113 IX ports · 167 customers. Median of 15 runs, in milliseconds.

### Headless (jsdom)

Our JavaScript only: jsdom has no layout and its DOM is far slower than a browser's, so trust the routing rows most here.

| What | Time |
|---|--:|
| Routing: compute() | 19.3 |
| One game day: dayTick() | 24.2 |
| An action: after() | 2.32 |
| Side panel and left list | 72.2 |
| NOC dashboard tabs | 146 |
| Map at three zoom levels | 2.97 |

<sub>scripts/perf-bench.js · A row only counts as slower or faster when it moved by 15% or more and p &lt; 0.01 (Mann–Whitney U), and by more than 2 ms (8 ms on the phone). Headless Chromium draws the canvas in software; phones usually use the GPU.</sub>
