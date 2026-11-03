# Provider routing preferences

| Mapping ID | Proposed representation | Requirement | Behaviour obligation |
| --- | --- | --- | --- |
| asset:PREF:high | Prefer eligible provider / uc:pref:high | REQ-cdb3c531e6387c77 | Apply after service eligibility and capacity checks; preserve default versus backup semantics and explain route choice. |
| asset:PREF:normal | Normal eligible provider / uc:pref:normal | REQ-11fb1857ff5edcf9 | Apply after service eligibility and capacity checks; preserve default versus backup semantics and explain route choice. |
| asset:PREF:low | Backup only eligible provider / uc:pref:low | REQ-3c4763067fb22209 | Apply after service eligibility and capacity checks; preserve default versus backup semantics and explain route choice. |
