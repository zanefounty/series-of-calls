/* Authored, versioned fictional provider campaign content. */
function socProviderRulesKernel(){
 'use strict';
 const data={
  "version": 1,
  "id": "provider-campaigns-1",
  "periodMinutes": 60,
  "secondsPerMinute": 2,
  "startingCashCents": 2000000,
  "staff": {
    "engineers": 2,
    "support": 1,
    "payrollCentsPerPerson": 10000
  },
  "missions": {
    "smb": {
      "id": "smb",
      "scenario": "smb",
      "name": "The Orchard Repairs desk",
      "brief": "Win a small service desk with external calling and digital enquiries. Keep the activation bill inside the owner\u2019s budget, then protect eight-minute response promises when a carrier outage arrives.",
      "customerName": "Orchard Repairs",
      "retailCents": 180000,
      "maxRetailCents": 180000,
      "deadlineMinutes": 30,
      "termPeriods": 3,
      "minimumOnTime": 22,
      "demand": {
        "voiceMinutes": [
          4,
          7,
          10,
          13,
          16,
          19,
          22,
          25,
          28,
          31,
          34,
          37,
          40,
          43,
          46,
          49
        ],
        "digitalMinutes": [
          5,
          11,
          17,
          23,
          29,
          35,
          41,
          47
        ],
        "voiceDuration": 3,
        "digitalDuration": 2,
        "deadlineMinutes": 8
      },
      "requirements": {
        "context": true,
        "recording": false,
        "transcript": false,
        "meeting": false,
        "local": false
      },
      "incident": {
        "afterDelivered": 4,
        "delayMinutes": 4,
        "resource": "carrier",
        "kind": "outage"
      },
      "nextOpportunity": {
        "name": "Harbour Health service desk",
        "retailCents": 260000,
        "deadlineMinutes": 30
      },
      "victoryPeriods": 2
    },
    "enterprise": {
      "id": "enterprise",
      "scenario": "enterprise",
      "name": "Canopy Group coexistence",
      "brief": "Migrate a mixed estate in stages. Keep current identities and calling available while one occupied meeting room is upgraded; the migration wave consumes provider engineers that would otherwise repair faults.",
      "customerName": "Canopy Group",
      "retailCents": 420000,
      "maxRetailCents": 500000,
      "deadlineMinutes": 90,
      "termPeriods": 6,
      "minimumOnTime": 22,
      "demand": {
        "voiceMinutes": [
          4,
          7,
          10,
          13,
          16,
          19,
          22,
          25,
          28,
          31,
          34,
          37,
          40,
          43,
          46,
          49
        ],
        "digitalMinutes": [
          5,
          11,
          17,
          23,
          29,
          35,
          41,
          47
        ],
        "voiceDuration": 3,
        "digitalDuration": 2,
        "deadlineMinutes": 12
      },
      "requirements": {
        "context": true,
        "recording": true,
        "transcript": false,
        "meeting": true,
        "local": false
      },
      "incident": {
        "afterDelivered": 8,
        "delayMinutes": 6,
        "resource": "room",
        "kind": "capacity"
      },
      "nextOpportunity": {
        "name": "Northstar regional migration",
        "retailCents": 620000,
        "deadlineMinutes": 120
      },
      "victoryPeriods": 2
    },
    "government": {
      "id": "government",
      "scenario": "government",
      "name": "Civic Grove permitted workload",
      "brief": "Serve a scoped public-service workload using eligible regional processing, encryption keys, retention and delegated support. Availability evidence is workload-specific; geography alone does not satisfy the brief.",
      "customerName": "Civic Grove",
      "retailCents": 360000,
      "maxRetailCents": 440000,
      "deadlineMinutes": 90,
      "termPeriods": 6,
      "minimumOnTime": 22,
      "demand": {
        "voiceMinutes": [
          4,
          7,
          10,
          13,
          16,
          19,
          22,
          25,
          28,
          31,
          34,
          37,
          40,
          43,
          46,
          49
        ],
        "digitalMinutes": [
          5,
          11,
          17,
          23,
          29,
          35,
          41,
          47
        ],
        "voiceDuration": 3,
        "digitalDuration": 2,
        "deadlineMinutes": 12
      },
      "requirements": {
        "context": true,
        "recording": true,
        "transcript": true,
        "meeting": false,
        "local": false
      },
      "incident": {
        "afterDelivered": 8,
        "delayMinutes": 6,
        "resource": "processor",
        "kind": "capacity"
      },
      "nextOpportunity": {
        "name": "Regional records service",
        "retailCents": 540000,
        "deadlineMinutes": 120
      },
      "victoryPeriods": 2
    },
    "defence": {
      "id": "defence",
      "scenario": "defence",
      "name": "Wattle disconnection exercise",
      "brief": "Keep administrative calling and retained work available during a scheduled external disconnection. Local identity, licensing, time and service dependencies consume deployment and support capacity; reconcile retained work after reconnection.",
      "customerName": "Wattle Training Centre",
      "retailCents": 390000,
      "maxRetailCents": 460000,
      "deadlineMinutes": 90,
      "termPeriods": 6,
      "minimumOnTime": 22,
      "demand": {
        "voiceMinutes": [
          4,
          7,
          10,
          13,
          16,
          19,
          22,
          25,
          28,
          31,
          34,
          37,
          40,
          43,
          46,
          49
        ],
        "digitalMinutes": [
          5,
          11,
          17,
          23,
          29,
          35,
          41,
          47
        ],
        "voiceDuration": 3,
        "digitalDuration": 2,
        "deadlineMinutes": 12
      },
      "requirements": {
        "context": true,
        "recording": true,
        "transcript": false,
        "meeting": true,
        "local": true
      },
      "incident": {
        "afterDelivered": 8,
        "delayMinutes": 8,
        "resource": "connectivity",
        "kind": "disconnection"
      },
      "nextOpportunity": {
        "name": "Field support deployment",
        "retailCents": 570000,
        "deadlineMinutes": 120
      },
      "victoryPeriods": 2
    }
  },
  "plans": {
    "swift": {
      "id": "swift",
      "name": "Swift Start",
      "description": "Lower entry cost and short lead times; carrier and partner terms cost more each period and leave less room for a later outage.",
      "family": "microsoft:workplace-phone",
      "sourceId": "uc-new:family:microsoft:workplace-phone",
      "base": {
        "setupCents": 380000,
        "periodCents": 47000,
        "workMinutes": 3,
        "engineers": 1,
        "resources": [
          "identity",
          "access",
          "phone",
          "desk",
          "people",
          "local"
        ],
        "config": {
          "phone": {
            "deployment": "multitenant",
            "capacity": 10
          },
          "people": {
            "people": 2,
            "operator": "customer"
          }
        }
      },
      "carrier": {
        "setupCents": 80000,
        "periodCents": 25000,
        "workMinutes": 2,
        "engineers": 0,
        "resources": [
          "carrier"
        ],
        "config": {
          "carrier": {
            "capacity": 4
          }
        }
      },
      "partner": {
        "setupCents": 140000,
        "periodCents": 30000,
        "workMinutes": 2,
        "engineers": 0,
        "resources": [
          "service",
          "messages",
          "cases",
          "engage"
        ],
        "config": {
          "engage": {
            "handoff": true,
            "botResolves": false
          }
        }
      },
      "voiceCents": 50,
      "messageCents": 75,
      "minimumPeriods": 3
    },
    "steady": {
      "id": "steady",
      "name": "Steady Route",
      "description": "Higher setup commitment and longer provisioning, with lower recurring carrier and partner charges and more capacity headroom.",
      "family": "cisco:suite-calling",
      "sourceId": "uc-new:family:cisco:suite-calling",
      "base": {
        "setupCents": 700000,
        "periodCents": 35000,
        "workMinutes": 8,
        "engineers": 1,
        "resources": [
          "identity",
          "access",
          "phone",
          "desk",
          "people",
          "local"
        ],
        "config": {
          "phone": {
            "deployment": "multitenant",
            "capacity": 20
          },
          "people": {
            "people": 2,
            "operator": "customer"
          }
        }
      },
      "carrier": {
        "setupCents": 120000,
        "periodCents": 17000,
        "workMinutes": 3,
        "engineers": 0,
        "resources": [
          "carrier"
        ],
        "config": {
          "carrier": {
            "capacity": 8
          }
        }
      },
      "partner": {
        "setupCents": 180000,
        "periodCents": 20000,
        "workMinutes": 3,
        "engineers": 0,
        "resources": [
          "service",
          "messages",
          "cases",
          "engage"
        ],
        "config": {
          "engage": {
            "handoff": true,
            "botResolves": false
          }
        }
      },
      "voiceCents": 50,
      "messageCents": 75,
      "minimumPeriods": 3
    }
  },
  "operations": [
    {
      "id": "repair",
      "name": "Funded repair",
      "description": "Restore the observed failed carrier, meeting, processing or connectivity dependency using a funded engineering job.",
      "setupCents": 8000,
      "periodCents": 0,
      "workMinutes": 3,
      "engineers": 1,
      "support": 1,
      "resources": [
        "carrier",
        "room",
        "speech",
        "access"
      ],
      "config": {},
      "requirements": [],
      "sourceIds": []
    },
    {
      "id": "mitigate",
      "name": "Capacity mitigation",
      "description": "Repair the affected dependency and reserve one additional unit of its capacity, with an ongoing support commitment.",
      "setupCents": 12000,
      "periodCents": 2000,
      "workMinutes": 4,
      "engineers": 1,
      "support": 0,
      "resources": [
        "carrier",
        "room",
        "speech",
        "access"
      ],
      "config": {},
      "requirements": [],
      "sourceIds": []
    },
    {
      "id": "expand",
      "name": "Service expansion",
      "description": "Add funded capacity before accepting the next customer.",
      "setupCents": 90000,
      "periodCents": 12000,
      "workMinutes": 12,
      "engineers": 1,
      "support": 0,
      "resources": [
        "phone",
        "carrier"
      ],
      "config": {
        "phone": {
          "capacity": 20
        }
      },
      "requirements": [],
      "sourceIds": []
    },
    {
      "id": "room",
      "name": "Meeting room fit-out",
      "description": "Provision a room endpoint and calendar path; meeting occupancy remains a separate admitted resource.",
      "setupCents": 75000,
      "periodCents": 9000,
      "workMinutes": 10,
      "engineers": 1,
      "support": 0,
      "resources": [
        "room"
      ],
      "config": {
        "room": {
          "calendar": true
        }
      },
      "requirements": [],
      "sourceIds": [
        "uc-new:family:microsoft:meetings-rooms",
        "uc-new:family:cisco:meetings-devices"
      ]
    },
    {
      "id": "recording",
      "name": "Consent and recording",
      "description": "Add consent-aware capture and retained archive capacity for eligible voice work.",
      "setupCents": 60000,
      "periodCents": 8000,
      "workMinutes": 8,
      "engineers": 1,
      "support": 0,
      "resources": [
        "recorder",
        "archive"
      ],
      "config": {
        "recorder": {
          "capacity": 4,
          "consent": true
        }
      },
      "requirements": [],
      "sourceIds": [
        "uc-new:family:microsoft:contact-center"
      ]
    },
    {
      "id": "transcription",
      "name": "Permitted transcription",
      "description": "Fund processing, permitted storage and an eligible local language model path.",
      "setupCents": 85000,
      "periodCents": 14000,
      "workMinutes": 12,
      "engineers": 1,
      "support": 0,
      "resources": [
        "speech",
        "archive"
      ],
      "config": {
        "speech": {
          "capacity": 10,
          "operation": "transcription"
        }
      },
      "requirements": [],
      "sourceIds": [
        "uc-new:family:cisco:local-speech"
      ]
    },
    {
      "id": "local-deployment",
      "name": "Local services deployment",
      "description": "Provision local identity, time, licensing and support dependencies before disconnecting.",
      "setupCents": 180000,
      "periodCents": 18000,
      "workMinutes": 24,
      "engineers": 2,
      "support": 1,
      "resources": [
        "local",
        "identity",
        "phone"
      ],
      "config": {
        "phone": {
          "deployment": "dedicated"
        },
        "local": {
          "identity": true,
          "dns": true,
          "time": true,
          "certificates": true,
          "licensing": true
        }
      },
      "requirements": [],
      "sourceIds": [
        "uc-new:family:microsoft:local",
        "uc-new:family:cisco:dedicated-premises"
      ]
    },
    {
      "id": "coaching",
      "name": "Costed staff coaching",
      "description": "Coach a named BPO cover worker in advanced service for four minutes. That person is unavailable during the course; the shared treasury pays once.",
      "setupCents": 18000,
      "periodCents": 0,
      "workMinutes": 4,
      "engineers": 0,
      "support": 1,
      "resources": [
        "people"
      ],
      "config": {},
      "requirements": [
        "bpo"
      ],
      "sourceIds": [
        "uc-new:family:cisco:provider-operations"
      ]
    },
    {
      "id": "quality",
      "name": "Recorded quality review",
      "description": "Assign an eligible reviewer to actual consented recording evidence.",
      "setupCents": 9000,
      "periodCents": 0,
      "workMinutes": 3,
      "engineers": 0,
      "support": 1,
      "resources": [
        "recorder",
        "people"
      ],
      "config": {},
      "requirements": [],
      "sourceIds": [
        "uc-new:family:cisco:contact-center"
      ]
    },
    {
      "id": "automation",
      "name": "Scoped automation policy",
      "description": "Fund a bounded provisioning or assurance policy with an explicit budget limit.",
      "setupCents": 25000,
      "periodCents": 6000,
      "workMinutes": 5,
      "engineers": 1,
      "support": 0,
      "resources": [
        "engage"
      ],
      "config": {},
      "requirements": [],
      "sourceIds": [
        "uc-new:family:cisco:programmable-engagement"
      ]
    },
    {
      "id": "bpo",
      "name": "Qualified BPO cover",
      "description": "Purchase qualified human handling capacity under a scoped service agreement.",
      "setupCents": 30000,
      "periodCents": 18000,
      "workMinutes": 6,
      "engineers": 0,
      "support": 1,
      "resources": [
        "people",
        "service"
      ],
      "config": {},
      "requirements": [],
      "sourceIds": [
        "uc-new:family:microsoft:contact-center"
      ]
    },
    {
      "id": "compliance",
      "name": "Scoped public-service procurement",
      "description": "Commission a workload-specific regional processing, retention, key-custody and delegated support contract. This is a fictional scenario decision, not real authorization.",
      "setupCents": 120000,
      "periodCents": 16000,
      "workMinutes": 14,
      "engineers": 1,
      "support": 1,
      "resources": [
        "archive",
        "recorder",
        "speech"
      ],
      "config": {},
      "requirements": [
        "recording",
        "transcription"
      ],
      "sourceIds": [
        "uc-new:family:microsoft:government-clouds",
        "uc-new:family:cisco:government"
      ]
    },
    {
      "id": "migration",
      "name": "Canopy coexistence wave",
      "description": "Commission a dedicated coexistence platform, then migrate Bea\u2019s endpoint with a retained rollback checkpoint. Existing calling continues on the old platform until cutover.",
      "setupCents": 125000,
      "periodCents": 14000,
      "workMinutes": 16,
      "engineers": 1,
      "support": 0,
      "resources": [
        "phone",
        "desk"
      ],
      "config": {},
      "requirements": [],
      "sourceIds": [
        "uc-new:family:cisco:dedicated-premises",
        "uc-new:domain:journeys"
      ]
    },
    {
      "id": "partner-qualification",
      "name": "Branch Distribution partner review",
      "description": "A distributor reviews an actually qualified customer period and grants access to its supported room bundle. This fictional commercial qualification costs provider engineering and support time.",
      "setupCents": 20000,
      "periodCents": 0,
      "workMinutes": 6,
      "engineers": 1,
      "support": 1,
      "resources": [
        "identity",
        "engage"
      ],
      "config": {},
      "requirements": [],
      "sourceIds": [
        "uc-new:domain:commercial-roles"
      ]
    },
    {
      "id": "distributor-room",
      "name": "Qualified distributor room bundle",
      "description": "A qualified reseller can procure this supported room/calendar bundle through Branch Distribution: lower setup cost with a larger recurring support commitment.",
      "setupCents": 45000,
      "periodCents": 13000,
      "workMinutes": 8,
      "engineers": 1,
      "support": 0,
      "resources": [
        "room"
      ],
      "config": {
        "room": {
          "calendar": true
        }
      },
      "requirements": [
        "partner-qualification"
      ],
      "sourceIds": [
        "uc-new:domain:commercial-roles",
        "uc-new:family:cisco:meetings-devices"
      ]
    },
    {
      "id": "migration-consolidated",
      "name": "Canopy consolidated cutover",
      "description": "Replace the existing platform with a dedicated shared target and migrate both identities in one wave. Eight minutes and two engineers; the old platform generation retires, with a commissioning interruption and changed platform compatibility. Lower recurring support than coexistence.",
      "setupCents": 160000,
      "periodCents": 8000,
      "workMinutes": 8,
      "engineers": 2,
      "support": 1,
      "resources": [
        "phone",
        "desk"
      ],
      "config": {},
      "requirements": [],
      "sourceIds": [
        "uc-new:family:cisco:dedicated-premises",
        "uc-new:domain:journeys"
      ]
    },
    {
      "id": "local-spares",
      "name": "Wattle autonomy spares",
      "description": "Fund local licensing and power spares: extend the authored offline autonomy from 30 to 60 minutes. Reserves an engineer and support person; cannot repair an external connection.",
      "setupCents": 48000,
      "periodCents": 4000,
      "workMinutes": 6,
      "engineers": 1,
      "support": 1,
      "resources": [
        "local"
      ],
      "config": {},
      "requirements": [
        "local-deployment"
      ],
      "sourceIds": [
        "uc-new:family:cisco:dedicated-premises"
      ]
    },
    {
      "id": "sync-records",
      "name": "Reconcile captured records",
      "description": "After reconnection, reconcile only captured service records. Unrecorded case work remains pending; synchronization never bills the same customer work again.",
      "setupCents": 12000,
      "periodCents": 0,
      "workMinutes": 4,
      "engineers": 0,
      "support": 1,
      "resources": [
        "local",
        "archive"
      ],
      "config": {},
      "requirements": [
        "local-deployment",
        "recording"
      ],
      "sourceIds": [
        "uc-new:domain:journeys"
      ]
    },
    {
      "id": "sync-all",
      "name": "Reconcile records and case work",
      "description": "After reconnection, reconcile all retained captured records and case work for this customer. Costs more support time; no duplicate service revenue.",
      "setupCents": 22000,
      "periodCents": 0,
      "workMinutes": 8,
      "engineers": 0,
      "support": 1,
      "resources": [
        "local",
        "archive"
      ],
      "config": {},
      "requirements": [
        "local-deployment",
        "recording"
      ],
      "sourceIds": [
        "uc-new:domain:journeys"
      ]
    }
  ],
  "families": [
    {
      "id": "microsoft:workplace-phone",
      "sourceId": "uc-new:family:microsoft:workplace-phone",
      "representativeFeature": "telephony",
      "dependencies": [
        "identity",
        "carrier"
      ],
      "gameplayEffect": "numbering and external calling consume carrier sessions",
      "operations": []
    },
    {
      "id": "microsoft:meetings-rooms",
      "sourceId": "uc-new:family:microsoft:meetings-rooms",
      "representativeFeature": "room-devices",
      "dependencies": [
        "identity",
        "calendar"
      ],
      "gameplayEffect": "room endpoints and calendar integration gate occupied meetings",
      "operations": [
        "room"
      ]
    },
    {
      "id": "microsoft:contact-center",
      "sourceId": "uc-new:family:microsoft:contact-center",
      "representativeFeature": "omnichannel-routing",
      "dependencies": [
        "identity",
        "workforce",
        "crm"
      ],
      "gameplayEffect": "routing requires staffed handling and customer records",
      "operations": [
        "recording",
        "bpo"
      ]
    },
    {
      "id": "microsoft:communication-apis",
      "sourceId": "uc-new:family:microsoft:communication-apis",
      "representativeFeature": "embedded-communications",
      "dependencies": [
        "identity",
        "api-access"
      ],
      "gameplayEffect": "API workflow requires provisioned API access and identity",
      "operations": [
        "automation"
      ]
    },
    {
      "id": "microsoft:government-clouds",
      "sourceId": "uc-new:family:microsoft:government-clouds",
      "representativeFeature": "workload-scoped-availability",
      "dependencies": [
        "jurisdiction-evidence",
        "eligibility-evidence"
      ],
      "gameplayEffect": "mission evidence is scoped to workload, region and eligibility",
      "operations": [
        "local-deployment"
      ]
    },
    {
      "id": "microsoft:local",
      "sourceId": "uc-new:family:microsoft:local",
      "representativeFeature": "local-infrastructure",
      "dependencies": [
        "compute",
        "identity",
        "licensing-service"
      ],
      "gameplayEffect": "local service consumes compute and staffed lifecycle support",
      "operations": [
        "local-deployment"
      ]
    },
    {
      "id": "cisco:suite-calling",
      "sourceId": "uc-new:family:cisco:suite-calling",
      "representativeFeature": "multitenant-calling",
      "dependencies": [
        "identity",
        "carrier"
      ],
      "gameplayEffect": "external calling depends on paid carrier reach",
      "operations": []
    },
    {
      "id": "cisco:dedicated-premises",
      "sourceId": "uc-new:family:cisco:dedicated-premises",
      "representativeFeature": "survivability",
      "dependencies": [
        "compute",
        "local-services"
      ],
      "gameplayEffect": "disconnection operation needs local support dependencies",
      "operations": [
        "local-deployment"
      ]
    },
    {
      "id": "cisco:contact-center",
      "sourceId": "uc-new:family:cisco:contact-center",
      "representativeFeature": "digital-handling",
      "dependencies": [
        "identity",
        "workforce"
      ],
      "gameplayEffect": "digital cases use staffed queues; review requires retained capture",
      "operations": [
        "recording",
        "bpo"
      ]
    },
    {
      "id": "cisco:programmable-engagement",
      "sourceId": "uc-new:family:cisco:programmable-engagement",
      "representativeFeature": "webhook-delivery",
      "dependencies": [
        "api-access",
        "channel-supplier"
      ],
      "gameplayEffect": "delivery uses quotas, retries, usage costs and context handoff",
      "operations": []
    },
    {
      "id": "cisco:meetings-devices",
      "sourceId": "uc-new:family:cisco:meetings-devices",
      "representativeFeature": "interop-join",
      "dependencies": [
        "interop-provider",
        "media"
      ],
      "gameplayEffect": "room path consumes room and media admission",
      "operations": [
        "room"
      ]
    },
    {
      "id": "cisco:provider-operations",
      "sourceId": "uc-new:family:cisco:provider-operations",
      "representativeFeature": "order-fulfilment",
      "dependencies": [
        "tenant-authority",
        "order-system"
      ],
      "gameplayEffect": "provider operations consume fulfilment and support capacity",
      "operations": [
        "automation"
      ]
    },
    {
      "id": "cisco:government",
      "sourceId": "uc-new:family:cisco:government",
      "representativeFeature": "workload-scoped-availability",
      "dependencies": [
        "jurisdiction-evidence",
        "lifecycle-evidence"
      ],
      "gameplayEffect": "sovereign profiles need workload evidence and lifecycle work",
      "operations": [
        "local-deployment"
      ]
    },
    {
      "id": "cisco:local-speech",
      "sourceId": "uc-new:family:cisco:local-speech",
      "representativeFeature": "local-inference",
      "dependencies": [
        "compute",
        "language-model"
      ],
      "gameplayEffect": "transcription consumes processing, storage and permitted-path capacity",
      "operations": [
        "transcription",
        "local-deployment"
      ]
    }
  ],
  "difficultyCapitalCents": {
    "easy": 2500000,
    "normal": 2000000,
    "hard": 1600000
  },
  "offerValidityMinutes": 180,
  "marketTerms": {
    "au-sydney": {
      "retailBps": 10000,
      "rival": "Direct Desk"
    },
    "au-melbourne": {
      "retailBps": 9800,
      "rival": "Harbour Bundle"
    },
    "us-seattle": {
      "retailBps": 9500,
      "rival": "Rainy Day Direct"
    },
    "jp-tokyo": {
      "retailBps": 9700,
      "rival": "Station Direct"
    },
    "eu-dublin": {
      "retailBps": 9600,
      "rival": "Green Lane Bundle"
    }
  },
  "rivalPressure": {
    "startsAfterPeriods": 6,
    "discountBps": 300,
    "description": "Fictional rival bundles reduce willingness for new contracts; existing agreed terms are protected."
  }
};
 function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;}
 deepFreeze(data);
 const source=()=>`const SOC_PROVIDER_RULES=(${socProviderRulesKernel.toString()})();`;
 return {data,source};
}
const SOC_PROVIDER_RULES=socProviderRulesKernel();
if(typeof module!=='undefined'&&module.exports)module.exports=SOC_PROVIDER_RULES;
