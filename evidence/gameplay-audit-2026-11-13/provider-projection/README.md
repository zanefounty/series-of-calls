# Provider Worker inspection checkpoint

The Provider Worker now returns a read-only inspection beside the dispatched state. The main thread still validates that state, checks the inspection clock and customer IDs, and keys the UI model to the accepted state identity. A selected customer's contextual actions reuse that model. AC-SOC-894 compares the entire Worker inspection with a direct inspection of the same state and checks input immutability. The Chromium reports also compare the rendered projection with direct inspection after each timed run.

The [desktop](desktop-report.json), [phone](phone-report.json), and [phone with the last customer selected](phone-selected-report.json) reports use the same built-page and script hashes. They import retained one-, three-, and five-customer dispatched saves, run through the actual frame and Web Lock, and verify save restoration, pause, and interruption by a real incident command. The phone uses a 390px viewport with 4× CPU throttling. The short 1× runs advance two minutes; the 8× runs advance sixteen.

| Customers | Desktop 8× | Phone 8× | Phone 8× with inspector |
| ---: | ---: | ---: | ---: |
| 1 | 95% | 74% | 56% |
| 3 | 92% | 79% | 74% |
| 5 | 86% | 67% | 61% |

Percentages are simulated-time target pace, including the first tick. Relative to the [previous runtime report](../provider-speed/README.md), the unselected five-customer phone view rose from 57% to 67%; the selected view rose from a measured 51% before contextual-model reuse to 61%. The phone remains below the intended pace, especially with a selected inspector. These runs do not establish sustained career performance or behavior for all short-window decisions. SOC-10 remains open.
