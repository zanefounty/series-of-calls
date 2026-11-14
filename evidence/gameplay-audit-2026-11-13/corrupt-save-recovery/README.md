# Corrupt Provider save and two-tab recovery

SOC-02 was exercised in Chromium 156.0.8078.4 using the built application, visible career controls, and the browser's native Web Locks. The test injected malformed bytes into local storage before either tab owned the career; it did not inject or mutate simulation state. The compressed [browser report](browser-report.json.gz) records five steps and `noSourceDrift: true`.

1. The owning tab opened the corrupt career. Its warning offered a new career or valid import, and the exact original bytes remained in the active slot until the player chose recovery.
2. A second tab could not acquire the lock. It showed the read-only ownership warning, kept the corrupt bytes unchanged, and created no quarantine record. This journey found and fixed a warning-priority bug that had shown the corrupt-save warning in the locked-out tab.
3. The owner used the visible **New career** form. The replacement started at sequence 1, and the exact malformed bytes moved to the quarantine key.
4. The owner's reload restored the replacement and preserved the quarantine record.
5. After the owner closed, the second tab reopened the replacement through the visible control and still saw the preserved quarantine bytes.

Screenshots show the [owner warning](owner-warning.png), [second-tab read-only warning](second-tab-read-only.png), and [recovered career](recovered-career.png). The focused runtime regression includes the lock-warning case. This is one browser engine and one malformed-save shape; it does not cover storage quota failure or every historical save schema.
