# Partner inbox mechanic

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| progress.partner-inbox-mechanic.request | Incoming partner request / ucc.partner-inbox-mechanic.request | REQ-5b7604c571c24c90 | Use evidence age, identity and requested scope to evaluate a partner onboarding request. |
| progress.partner-inbox-mechanic.max-prefix | Maximum-prefix alert / ucc.partner-inbox-mechanic.max-prefix | REQ-dc04a0d458af7f08 | Split into SIP admission/API quota alerts and configuration-scope anomalies; more capacity must not approve an unsafe route or privilege change. |
| progress.partner-inbox-mechanic.reply | Accept, decline, raise or keep / ucc.partner-inbox-mechanic.reply | REQ-54031d1476499522 | Retain explicit choices with consequences, evidence, owner and rollback path. |
| progress.partner-inbox-mechanic.reputation | Responsiveness reputation / ucc.partner-inbox-mechanic.reputation | REQ-b3a1c9ecf9c83638 | Base partner confidence on timely accurate decisions and support outcomes; restricted federation is not inherently poor service. |
| progress.partner-inbox-mechanic.bot | Large Peering Model / ucc.partner-inbox-mechanic.bot | REQ-29b4066530ae60f9 | Replace with operations automation having scoped permissions, task-specific accuracy, review requirements, cost and a durable audit trail. |
| progress.partner-inbox-mechanic.limits | Inbox and partner record limits / ucc.partner-inbox-mechanic.limits | REQ-bf022e3e2124c42a | Retain bounded state and pagination, with durable identifiers and clear stale-item treatment. |
