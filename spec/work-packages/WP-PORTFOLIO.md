# WP-PORTFOLIO — Concurrent customer portfolio

## Scope

This work package adds a bounded portfolio of up to 20 customers. Each customer owns an independent, normally validated Series of Calls root. The portfolio routes allowlisted ordinary SOC commands to the selected customer and advances every active customer's clock together. Customer selection changes only the view target.

Five market IDs identify geography: Sydney, Melbourne, Seattle, Tokyo and Dublin. Sydney and Melbourne map to the same `AU` jurisdiction. Dublin maps to the game's fictional `EU` profile. The market mapping is scenario data, not a legal eligibility or approval claim. Customer scenario remains one of `smb`, `enterprise`, `government` or `defence`.

## State and hooks

`SOC_PORTFOLIO.create({clock})` creates an empty root. The parent kernel supplies:

- `createCustomer(portfolio, config)` returning a validated core root at the current portfolio clock and matching scenario/jurisdiction;
- `dispatchCustomer(root, command)` invoking the normal SOC dispatcher and returning its validated next root;
- optionally `validateCustomer(root)` returning `true` after recursive core validation.

Child roots must not contain nested portfolio, campaign or progression packs. Customer ID and tenant are unique portfolio bindings. Child resource, case, contract and interaction IDs remain local to each root; inspection qualifies exposed child IDs with the portfolio customer ID.

Portfolio finance is an aggregation of actual child business balances and ledgers. It separates external revenue, costs and operating profit from opening capital, cash including opening capital, funding and outstanding debt, and separates these from core operational revenue/cost. Each actual business root starts with 100,000 cents of opening cash. Portfolio internal cash is explicitly untracked and inter-customer transfers are not modeled. No profit is inferred from opening capital, loans or internal transfers.

## Commands

- `addcustomer`: creates an active customer root from its market, scenario and typed identity fields.
- `dispatchcustomer`: forwards one allowlisted ordinary SOC command. Child `advance` and nested portfolio/campaign/progression commands are rejected.
- `selectcustomer`: sets a view target only.
- `activatecustomer` and `deactivatecustomer`: change participation in shared time. Deactivation is blocked while the customer has live contracts, projects, interactions or other modeled obligations.

Every active customer receives exactly one validated one-minute child advance per portfolio tick. Inactive roots retain their clock. Reactivation catches up through one ordinary validated SOC advance command, bounded to 1,440 missed minutes. Larger gaps fail with `PORTFOLIO_CUSTOMER_CATCHUP_LIMIT` for staged/manual recovery.

## Acceptance

`tests/portfolio.test.js` exercises separate real SOC roots in distinct markets, actual child business contract acceptance and billing, simultaneous clocks independent of selection, tenant isolation, strict child command routing, obligation-aware deactivation, bounded inactive catch-up, and finance aggregation without counting internal transfers as profit. `tests/portfolio-integration.test.js` adds shared-dispatch tenant/calling identity, synchronized active roots with worker replay, and campaign track-switch preservation (AC-SOC-185, 188–189). `tests/portfolio-ui.test.js` covers locked portfolio controls and actual finance, plus assembled-page child configuration, shared time advance, return to portfolio-root view, and save restore (AC-SOC-186–187, 194). These cases establish the implemented portfolio mechanics; they do not establish source-catalogue completion.

## Pending boundaries

The portfolio clock advances independently of the selected campaign track, and campaign snapshots do not duplicate the portfolio. Active child clocks match the portfolio clock. This pack does not add a portfolio treasury, cross-customer transfers, automatic market qualification, legal checks, customer-root eviction, or portfolio-wide contracts. Internal cash is not tracked. Portfolio-wide incident fan-out requires a separately defined core policy.
