# Series of Calls

Run a fictional communications provider: compare a customer plan, commit cash and staff, commission service, handle real simulated demand, repair incidents and expand from earned income. Provider campaign is the default experience in this branch. Training and Lab remain separate, with the same validated simulation and no live communications services.

**Status: incomplete preview.** The current application is a bounded training and campaign milestone, not the full Series of Tubes conversion or a release. Its specification tracks 4,839 requirements; at the 4 November 2026 verification checkpoint, 216 were partial, 4,623 pending and none had a final disposition. The full-release gate currently rejects deferred source review `REF-ac194430f67b3832`.

[Play the published incomplete preview (may precede this branch)](https://zanefounty.github.io/series-of-calls/). See the [Pages workflow](https://github.com/zanefounty/series-of-calls/actions/workflows/release.yml) for publication status.

All calls, messages, incidents, customers, providers, policies and evidence are fictional. AU/US/JP/EU are exercise profiles, not legal or regulatory approvals. No live telephony or provider credentials are used.

## What is implemented

The provider rebuild adds two costed SMB openings, four directly selectable segment missions, actual scheduled calls/messages/meetings, shared treasury and staff, history-based settlement, customer credits/renewal/exit, paid supplier products and scoped automation. The full-screen map shows purchased services and observed dependencies, with compact HUD, costed contextual actions and pause/speed controls. See [rebuild notes and reference strategies](docs/PROVIDER_REBUILD.md), [source accounting](docs/PROVIDER_SOURCE_ACCOUNTING.md), and the [supplied specification](spec/provider-gameplay-v1/implementation-prompt.txt).

The preview supports identity, routing, calling, media negotiation, workforce and queues, messaging, CRM continuity, rooms, recording, information handling and local infrastructure. Its core separates desired configuration, provisioning, effective configuration and observed readiness. Optional packs add typed contracts and billing, carrier onboarding and number ports, delivery receipts and retries, migration, processing and retention, workforce operations, site continuity, customer portfolios and bounded campaign progression.

Four campaign tracks exercise SMB/digital service, enterprise calling and rooms, government information handling, and defence disconnection. Selected mechanics and campaign paths have shared-dispatch, save/replay, worker, MCP and browser evidence. Full source-specific behaviour, all original progression goals, complete specialist and commercial coverage, research review and upstream adoption remain unfinished. See the [versioned specification](spec/README.md), [current status](STATUS.md) and [delivery plan](docs/DELIVERY_PLAN.md) for scope and gaps.

## Run locally

Requires Node.js 24 or later. From the repository root:

```sh
npm ci
npm run dev
```

Open the URL printed by the server (by default `http://127.0.0.1:8080/`) and choose **Play / Continue**. A new provider career starts paused. **Training** and **Lab** remain available separately. The development server assembles the page from `src/` and serves local assets. To build and preview the compiled site under its project path:

```sh
npm run build
npm run serve
```

The compiled preview defaults to `http://127.0.0.1:8080/series-of-calls/`. Both servers are local only; neither publishes the site. Provider, Training/Lab and the optional inherited SP game use separate save slots and editing locks. Provider decisions pause the clock; hidden tabs and lost editing ownership also pause. There is no offline catch-up.

## Develop and verify

Run the main local checks with:

```sh
npm run test:communications
npm run test:mcp
npm run evidence
npm run check:all
npm run i18n:check
npm run build
npm test
```

`check:all` checks development accounting while preserving pending work. `check:release` is the full-release gate; a passing preview workflow does not satisfy it. The [provider verification handoff](docs/PROVIDER_VERIFICATION.md) records the tested revisions, separate browser and long-run fixtures, failures and remaining limitations. Test counts overlap and are not source-completion counts. Older files in `evidence/` retain their original inputs; they are not receipts for this rebuild.

Use `npm run test:provider` for campaign behaviour, `npm run test:provider:stdio` for the actual communications MCP journeys, and `npm run test:provider:browser` for visible-control provider journeys. The browser driver covers both SMB plans at desktop/mobile sizes, four missions, 14 paid product-family paths, keyboard operation, persistence, ownership and offline reload. Install the locked browsers described in [browser acceptance](docs/BROWSER_ACCEPTANCE.md). `npm run test:browser` and `npm run test:browser:campaigns` separately check the retained Training experience. Raw screenshots, traces, saved states and test logs belong outside Git.

## MCP interfaces

For the communications training application, run `npm run mcp:calls`. It is a local stdio server and uses the same validator and dispatcher as the browser. It holds state in process memory and does not contact real providers. The inherited physical-network game has a separate server at `npm run mcp`; its tools, save format and state are distinct. `npm run test:mcp` exercises both. Read [MCP documentation](docs/MCP.md) before configuring a client.

## Security reporting

Report vulnerabilities privately through [GitHub Security](https://github.com/zanefounty/series-of-calls/security). GitHub secret scanning and push protection are enabled. See [SECURITY.md](SECURITY.md) for safeguards.

To scan a local build, install Gitleaks and run:

```sh
npm run build
python3 scripts/check-secrets.py --gitleaks /absolute/path/to/gitleaks --artifact _site
```

On Linux x64, `bash scripts/install-gitleaks.sh /absolute/path/to/gitleaks` installs the scanner binary at the selected path.

## Project and provenance

- [Documentation index](docs/README.md), [architecture](docs/ARCHITECTURE.md) and [development workflow](docs/DEVELOPMENT_WORKFLOW.md)
- [Research and upstream fork survey](research/forks/README.md), with pinned source comparisons and pending adaptation work
- [Source manifest](research/source-manifest.json), [implementation evidence](spec/implementation.json) and [upstream register](maintenance/upstream/register.json)
- [Contributing](CONTRIBUTING.md), [Code of Conduct](CODE_OF_CONDUCT.md), [security policy](SECURITY.md), [third-party notices](THIRD_PARTY_NOTICES.md) and [publishing audit](docs/PUBLISHING_AUDIT.md)

The optional physical-network game and preserved assets derive from [Series of Tubes](https://github.com/fjaeckel/seriesoftubes) by Frederic Jung. Its [MIT license](LICENSE) is retained byte-for-byte. This independent adaptation does not imply upstream endorsement; the source pack and third-party research remain attributed under their respective terms.

The accountable contact is `zanefounty`. The upstream project's issue tracker and Signal group are not contacts for this adaptation. Full conversion remains incomplete; see the publishing audit for the publication workflow.
