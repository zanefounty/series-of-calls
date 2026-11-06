# Progression inspection validation

The progression inspector previously validated the entire retained receipt set once for its summary, then again for every unlock proposal. It now validates the set once and calls a private proposal helper within that inspection. Independently requested public proposals still perform full validation. No persisted cache or caller-controlled validation bypass was added.

AC-SOC-795 compares inspection proposals with independently validated public proposals on an actual paid opening campaign and proves frozen-state purity. AC-SOC-796 changes an earned receipt and verifies inspection, public proposals and restore reject it before a quote hook executes. Five focused tests and source, coverage, mapping, translation and build checks passed on frozen `e340699` with unchanged inputs. Exact command/result receipts are `/home/zane-fountylabs/soc-evidence-archive/inspection-e340699-verification/`.

A separate diagnostic using the same actual clock660 five-market save measured baseline inspection at 7,609/7,192/6,996 ms and candidate inspection at 2,489/2,240/2,290 ms. Returned model hashes matched and neither inspection mutated the save. The diagnostic receipt is `/home/zane-fountylabs/soc-evidence-archive/inspection-cost-diagnostic/result.json`. These timings describe that specific measurement, not a browser performance guarantee or final whole-game acceptance.

The subsequent full regional suite at this candidate finished four of five tests successfully. C3, C5 and L7 passed; T2 reached an insufficient-cash refusal before its second required boundary review. See [arrival retention verification](PROVIDER_ARRIVAL_RETENTION.md). That funding-path failure remains actionable and was not waived by the inspection improvement.
