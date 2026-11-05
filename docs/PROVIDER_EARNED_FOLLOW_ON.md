# Earned Provider follow-on purchase evidence

This slice checks that two earned Provider progression receipts can fund an
actual same-market follow-on purchase. The receipt authorizes a quote choice;
it does not add cash, create a customer service, or commission resources.

## RD: managed diverse upstream

`tests/provider-earned-follow-on.test.js` earns the RD receipt from a real
three-phase continuity sequence and a positive settled period, then buys the
next customer in the same market. The test compares the real quotes:

| Choice | Setup | Recurring | Work | Engineers | Support |
| --- | ---: | ---: | ---: | ---: | ---: |
| Direct diverse upstream | A$320 | A$70/period | 8 min | 1 | 1 |
| Managed diverse upstream | A$160 | A$110/period | 10 min | 0 | 1 |

It funds the managed option, checks its 20 Mbps independent failure domain
after commissioning, and proves a later phase-two customer call was admitted
over that path. The child customer ledger remains unchanged. The progression
claim itself leaves Provider cash unchanged, and the saved state restores.

## CA: managed local autonomy spares

The test earns CA through paid local deployment, recording, transcription,
actual disconnection and exhausted-autonomy failure, spares recovery, a
connected recovery call, and paid reconciliation. After the receipt is
claimed, it purchases a second Defence customer in the same market using the
Swift plan to keep the funded opening within available cash. It commissions
recording, transcription, local services and BPO, compares direct and managed
spares quotes, and checks that the managed order is paid and delivered. A real
offline call then completes while the target's autonomy remains 60 minutes;
the child treasury is unchanged and the state restores.

Before the CA claim, a managed-spares quote is refused because the market
receipt has not been earned. Claiming the receipt does not change cash.

The same test also pays for a second local-services commissioning project,
expands the provider team through the public staff command, and funds an
automation project in a restored branch of the real eligible state. With the
shared treasury below the managed setup price, the managed quote and dispatch
are refused for insufficient cash; the refusal leaves the save and cash
unchanged. A separate dispatch case buys an actual Swift-plan customer in
Melbourne after earning CA in Sydney and proves that the earned market cannot
be used there; the quote and refused dispatch leave the state unchanged.

## Verification and limits

Run with:

```sh
node --test --test-isolation=none tests/provider-earned-follow-on.test.js
```

The recorded focused run passed all three tests. This slice does not claim
the full central-progression or all-market compatibility contract; it covers
the earned managed-spares market and cash gates through the specific public
dispatch cases above.
