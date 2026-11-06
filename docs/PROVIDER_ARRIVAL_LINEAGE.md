# Provider arrival history validation

Provider saves reconcile emitted event IDs with retained rows and archived event
counts. Retained IDs must be unique, in range and no later than the saved clock;
the archived per-code counts must sum to the archived total. Removing a row
without accounting for it is rejected by restore and the normal dispatch boundary.

A paid UC/CC task proof must agree with any retained arrival for its job. It
cannot substitute an unrelated old event ID merely because that ID falls below
the pruning checkpoint. Missing legacy arrivals still require a checkpoint that
actually contains archived arrival events, alongside the existing paid project,
test, complete recording and funded review checks.

This preserves the supported version-one legacy representation. Aggregate
archive counters cannot distinguish every coordinated historical edit from
legitimate pruning; this change does not claim cryptographic provenance or
reconstruct missing events. New receipt versions would need their own migration
contract before imposing stronger historical requirements.

AC-SOC-845 rejects contradictory retained arrival provenance. AC-SOC-846 checks
event conservation and invalid IDs through public restore, preserving valid
dispatch, restored continuation and worker results. Both fail against the
previous runtime. Separate externally retained native saves from `25e9899` at
minutes 79 and 523 restore byte-identically, including the naturally pruned
minute-523 proof. The source archives and those original save files are unchanged.
