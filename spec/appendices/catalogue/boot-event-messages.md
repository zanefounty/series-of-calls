# Boot event messages

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| asset:SLOW_BOOT:0 | Appliance self-test / uc:slow_boot:0 | REQ-7d34ed4b2926e4f0 | Use appliance self-test as a fictional restoration dependency; show affected journeys, completion time and available failover. |
| asset:SLOW_BOOT:1 | Configuration storage recovery / uc:slow_boot:1 | REQ-91f8a1188d5f0c90 | Use configuration storage recovery as a fictional restoration dependency; show affected journeys, completion time and available failover. |
| asset:SLOW_BOOT:2 | Firmware update check / uc:slow_boot:2 | REQ-b0671a050f0768a4 | Use firmware update check as a fictional restoration dependency; show affected journeys, completion time and available failover. |
| asset:SLOW_BOOT:3 | Directory and number inventory loading / uc:slow_boot:3 | REQ-0d644dff30d0be4b | Use directory and number inventory loading as a fictional restoration dependency; show affected journeys, completion time and available failover. |
| asset:SLOW_BOOT:4 | Media worker readiness / uc:slow_boot:4 | REQ-f1df3eb47230e610 | Use media worker readiness as a fictional restoration dependency; show affected journeys, completion time and available failover. |
| asset:SLOW_BOOT:5 | Hardware health check / uc:slow_boot:5 | REQ-d0f3dc33639dfa89 | Use hardware health check as a fictional restoration dependency; show affected journeys, completion time and available failover. |
| asset:SLOW_BOOT:6 | Standby service synchronisation / uc:slow_boot:6 | REQ-9e2bcc997a43cf49 | Use standby service synchronisation as a fictional restoration dependency; show affected journeys, completion time and available failover. |
