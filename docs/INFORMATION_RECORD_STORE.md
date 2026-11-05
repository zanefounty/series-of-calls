# Information record storage boundary

The version 1 record store keeps the existing decoded `state.records` shape. It accounts retained records by archive resource and region; it does not compress or discard record history.

The current synthetic capacity scale is 100 retained payload records per archive unit labelled GB. A customer with 20 effective archive units can therefore retain up to 2,000 live records at one archive destination. Held rows count toward usage. Expired rows stop counting only after the normal retention transition marks them deleted. The noncommercial meeting join probe is excluded; a real meeting recording is stored and counted.

Version 1 roots carry `recordStore: { version: 1 }`. They are bounded at 2,000 live payload rows per archive destination and 4,000 total record rows, including deleted rows and probes. Origin receipts share the 4,000 row bound. These representation limits are distinct from paid archive capacity. A larger authored archive limit does not imply that this representation can use more than 2,000 live rows.

Legacy roots without a marker remain valid through 500 rows. A root above that legacy limit needs a supported version marker. Unknown versions and conflicting archive identities fail validation. Existing overfull roots remain restorable after capacity is reduced; new capture, processing output, and transfer admissions refuse with a reason until the relevant archive has room. Clock advancement and settlement continue, and pending processing keeps its original plan and lineage.

The helper reports exact UTF-8 serialized byte counts. The root restore and portfolio save limits remain separate; a record count alone does not guarantee that a complete exported save fits browser storage. This slice does not add compaction, shorten retention, prune live parents, or add archive charges for capacity already purchased.
