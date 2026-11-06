# Product integration test history

Each native product integration keeps its latest test in `result`. New and migrated records may carry `testHistory: { version: 1, entries: [...] }`; a missing envelope is accepted for older saves and unknown versions fail restore. When a new test replaces a result, the previous result is copied to a bounded history entry containing its exact source and target generation/version scope. Entry `at` records the minute it was superseded; the original test minute remains `result.checkedAt`. Up to 100 prior results are retained; a test that would evict history is refused.

Restore validates the envelope, exact row fields, ordering, test-result shape and scope against the current integration or its explicit rebase history. Rebase still uses the existing `history` collection and continues to reject a same-generation rebase. The live `result` remains the current health assessment; retained results only support claims tied to an earlier successful test. UC-CC paid receipts can validate against the retained exact result after a same-scope retest.

The bounded public-dispatch and restore cases are in `tests/product-integration-retest-history.test.js`. This mechanism preserves synthetic scenario evidence; it does not establish external product support.
