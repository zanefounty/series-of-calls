# Policy recipe

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| recipe:shield | Protect service entry points / uc.recipe.shield | REQ-96dc3837a138344e | Apply supported admission, fraud and traffic controls; evaluate false positives and customer impact. |
| recipe:care | Prioritise contracted service journeys / uc.recipe.care | REQ-0f038cb4a2455729 | Respect explicit service priorities, agent skills and emergency handling; admission cannot create staff capacity. |
| recipe:peer | Prefer eligible direct integrations / uc.recipe.peer | REQ-e800dfe460462c04 | Prefer supported paths that satisfy feature and information requirements, then compare total cost. |
| recipe:pinch | Minimise eligible service cost / uc.recipe.pinch | REQ-b82ad47c81f1f478 | Compare total platform, carrier, message, processing and operating costs after eligibility. |
| recipe:diet | Rebalance provider traffic / uc.recipe.diet | REQ-e5652210b5fb6b04 | Retain BGP prepending as an underlay hint; add provider-routing weights only where the application supports them. |
| recipe:maint | Controlled maintenance window / uc.recipe.maint | REQ-a11bc853aef1f43d | Drain new interactions, finish or transfer active work, preserve records and execute rollback when needed. |
| recipe:calm | Maintain resource headroom / uc.recipe.calm | REQ-e1b75e38f8f22928 | Set separate headroom for sessions, people, APIs, meeting media and transcription workers. |
