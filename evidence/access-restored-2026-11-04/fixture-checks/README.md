# Gate fixture verification

Gate test fixtures now copy the acceptance/browser receipts they read and every verified upstream receipt and scoped TAP log, rather than unrelated browser captures. All declared acceptance inputs and mapped source files are still copied by the existing inventory loop. No gate assertion or expected failure was changed.

The fresh acceptance run executed 455 registered cases, followed by all 71 pre-governance Python tests, with no input drift: [results](results.json). After integrating the owner-reviewed governance changes, [all 82 Python tests passed](post-governance-gates.log), including the new receipt-freeze, workflow and observation path cases. The [post-integration receipt](post-governance-gates.json) records the actual command and exit code.

This changes test fixture I/O only. It neither accepts source requirements nor creates browser or release evidence.
