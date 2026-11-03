# Governance overlay validation

**Scope:** isolated proposal overlay at `/tmp/soc-governance-overlay`. Active repository governance and workflows were not modified.

Ran `python3 /tmp/soc-governance-overlay/tests/evidence_freeze_test.py`: **4 tests passed**. Three tests copied the proposed `scripts/record-evidence.py` into a temporary minimal repository and ran it with a controlled fake `node` child. The stable-input case accepted one synthetic passing TAP row and retained pre-run hashes. The mutation and deletion cases returned failure while preserving the original recorded hash and listing the changed or deleted input. These tests exercise the recorder guard; the fake TAP is not application acceptance evidence. The fixture uses the repository's real `scripts/verify.py` acceptance-result parser.

The fourth test inspected the overlay workflow text and confirmed the aggregate CI job depends on and checks the translation job, and the Pages build has a `main`-branch guard. This is a static check of the proposed files, not a hosted GitHub workflow run.

Test source: `/tmp/soc-governance-overlay/tests/evidence_freeze_test.py`. The overlay remains a proposal for separate owner review; this validation does not apply it to active governance or verify GitHub-side settings.
