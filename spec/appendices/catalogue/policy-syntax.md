# Policy syntax

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| policy-rule:0 | Resource-specific headroom / uc.policy.rule.0 | REQ-312611651287cb4b | Apply admission or overflow to a named resource and workload. |
| policy-rule:1 | Prefer an eligible service path / uc.policy.rule.1 | REQ-a3faa82bc6c9aef3 | Check feature scope and eligibility before preference. |
| policy-rule:2 | Avoid a service path for a workload / uc.policy.rule.2 | REQ-c8cdd3aad6cf8128 | Keep a reason and distinguish preference from a forbidden boundary. |
| policy-rule:3 | Cap a typed upstream resource / uc.policy.rule.3 | REQ-1d4ae47f22c73d88 | Use explicit units: Gbit/s, calls, messages per second or spend. |
| policy-rule:4 | Prioritise an upstream provider / uc.policy.rule.4 | REQ-453ac1be8b4ed5a6 | Retain transport preference and add supported calling-provider preferences. |
| policy-rule:5 | Underlay route advertisement hint / uc.policy.rule.5 | REQ-cf1499c232db7b3f | Retain only in advanced SP transport; do not pretend it changes application call control. |
| policy-rule:6 | Protect specified service classes / uc.policy.rule.6 | REQ-5749db0dc2d78ac2 | Use explicit workload and contract priorities. |
| policy-rule:7 | Drain service region or component / uc.policy.rule.7 | REQ-04b2b8a0698382b8 | Define in-flight behaviour and continuity checks. |
| policy-rule:8 | Exclude physical dependency / uc.policy.rule.8 | REQ-3ba1d05d1735f720 | Retain physical path controls and add typed application-dependency exclusions. |
| policy-rule:9 | Isolate affected traffic or service / uc.policy.rule.9 | REQ-2eb9ac2064472523 | Show legitimate traffic lost; separate network filtering from identity or fraud response. |
