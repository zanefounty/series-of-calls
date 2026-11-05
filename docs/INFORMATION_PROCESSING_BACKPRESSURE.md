# Processing backpressure and pending admission

Automatic capture no longer aborts the simulation when all 200 processing slots contain unfinished work. The recording remains stored, the attempted processing admission records `PROCESSING_ADMISSION_REFUSED`, and calls, commissioning, settlement and other customer work continue. A successful capture does not become a failed recording merely because its later processing queue is full.

A pending recording retains a versioned admission containing the capture time, refusal audit reference, original pipeline plan and optional speech model. When an actual terminal job frees a slot, the oldest eligible pending recording receives a real processing job. Retrying does not silently adopt a changed pipeline, discard another active job or create a processing output. Current resource, boundary, permission and storage checks still govern every processing stage. Explicit processing commands retain atomic refusal. Expiry or authorized removal cancels pending admission with an audit.

The focused domain regression completes a previously refused recording after capacity becomes available, checks unknown versions and mismatched receipts, and preserves explicit refusal behavior. The public Enterprise regression funds the existing transcription operation after reaching the full queue; an older refused recording receives a job, and previously queued work makes actual progress. Restore and worker continuation remain equivalent.

The public regression does not claim that its entire backlog drains: the separate fixed 500-record representation limit is reached before every six-stage job finishes. This limit is below the already purchased archive capacity. Correcting that representation and its associated retention limits remains engineering work; it does not justify charging again for storage already purchased or deleting retained records.

Tests: `tests/information-processing-capacity.test.js` and `tests/provider-processing-backpressure.test.js`. This bounded implementation does not close full gameplay acceptance or source catalogue obligations.
