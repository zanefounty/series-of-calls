# Security endpoint prerequisite — 6 November 2026

Candidate `0a1be9d337abf8db111be32d789e9a0d70552d4b` repairs a native security compatibility defect. A permitted, duration-bearing call routed to an endpoint entered `connected`, but the security reservation validator rejected that legitimate phase. The usage engine already recognized it. The validator now retains the reservation during that phase; all admission, linked usage and terminal settlement checks remain in place.

AC-SOC-773 uses public dispatch to configure the three independent controls and route a real call to an endpoint. It verifies live restore and worker parity, three charged minutes followed by one settlement, and a two-cent rolling limit that terminates a second scenario before its next charged minute. Later advancement preserves the settlement. This is an explicit Lab regression of the shared native engine, not evidence of a paid Provider security offer or a completed scrub progression goal.

The frozen candidate passed 24 focused security, calling-achievement and progression cases, source/coverage/mapping checks, translation checks, build and Gitleaks. All tracked inputs remained unchanged. The failing pre-fix regression is retained at `/tmp/soc-security-endpoint-red.log`; the frozen manifest, logs and result are under `/tmp/soc-security-endpoint-verification/`.

The Python gate/mutation run executed 99 tests: 96 passed, two failed and one skipped. Both failures encountered the stale acceptance input inventory before their intended mutation check. The acceptance producer must finish against the integrated candidate before those checks can pass. This result is preserved in `check-6.log`; no receipt or gate was altered to claim success.

Paid Provider network, SIP and destination/spend offers, authored abuse, historical authority, useful unlocks and visible gameplay remain separate implementation work. The full release gate and research obligations are unchanged.
