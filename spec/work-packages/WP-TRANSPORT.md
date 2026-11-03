# Application transport contract

The optional `soc-transport-1` pack connects communications to a bounded physical graph. It complements the inherited SP expansion; it does not claim all source infrastructure catalogues have been adapted.

Sites have independent power, administrative location and failure-domain observations. Purchased access and owned links have explicit Mbps capacity, latency, construction lead time and integer AUD-cent charges. Orders progress through desired, pending, effective and observed state. Shared failure-domain faults disable every affected site/link. A second edge sharing the failed domain is not diversity.

Media demand uses declared Kbps profiles (including overhead and both directions), converted only to the same physical bandwidth dimension. Voice uses 160 Kbps; a two-party room test uses 5,000 Kbps. These are synthetic workload assumptions, not seat or agent conversions. Deterministic least-latency routing admits a reservation only if every edge has residual capacity. Failed active paths can reroute within the same demand; otherwise the parent records a transport failure. Inspection is pure.

Owned-link recovery consumes a compatible spare and a free repair crew exactly once, then requires elapsed repair time. Purchased-link recovery is a supplier job and uses no player spare. Repair completion does not clear a failed shared domain. A provider or site fault must be independently recovered.

Charges use a separate, reconciled external-transport ledger. The consolidated communications profit subtracts its cumulative external costs once. A link may explicitly reference an active purchased-access business contract instead; such a link posts no duplicate transport lease charges. Construction and repair remain explicit external costs. Contract association is validated against an access offer and sufficient purchased Mbps, with no repeated allocation of the same contract capacity.

All commands flow through SOC.dispatch; worker execution, saves and local MCP share the same pack. Bound resource paths affect voice admission and room joins. The original SP world's full construction, optical/cable/port combinations and acquisition ledger remain pending separate source-by-source adaptation.
