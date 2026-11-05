# Scheduled external guest participation

SOC_INFORMATION keeps external guest collaboration on the scheduled meeting lifecycle. A new booking may carry the optional versioned descriptor:

    externalGuest: { version: 1, guestId, guestTenant, hostTenant }

The descriptor names one synthetic guest from a tenant different from the host. Host tenant must match the customer root, and the booking must include at least two attendees. A descriptor is only an intent; it does not prove admission or delivered participation.

At meeting start, the information domain requires effective guestJoin, a declared effective platform dependency with matching generation, and two-way observed media. It asks the trusted admitExternalGuest hook to admit the same named foreign guest. Each active minute rechecks the same admission, guest policy, platform generation and media. guestJoin remains required when the platform is native and matches the native platform.

An actual session records externalGuest evidence with the admission ID, guest and host tenants, admission and last-presence times, observed duration, policy generation, platform resource and generation, media directions, and terminal status/reason. Completion requires the guest to have remained present for the full scheduled duration. Guest or service loss fails the session and releases any capture reservation through the existing exactly-once lifecycle. A later booking must establish a fresh guest session to recover.

Legacy bookings and sessions without the optional fields retain their former meanings. The diagnostic join path remains a noncommercial probe and cannot create this evidence. The information pack validates exact field shapes and links guest proof to its booking and scheduled session; Provider save authority must additionally bind the booking descriptor to the versioned authored campaign and trusted scheduler. All names, tenants, admission IDs and media outcomes are synthetic and make no claim about external reach or vendor approval.

The boundary is exercised in tests/information-external-guests.test.js; Provider campaign scheduling, progression receipts and map controls have separate integration owners.
