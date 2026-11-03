# Contributing to Series of Calls

Series of Calls is an incomplete synthetic communications-training preview. Its source pack, specification, and runtime deliberately distinguish preserved upstream material from proposed and tested adaptations. See [README.md](README.md), [STATUS.md](STATUS.md), and [the specification](spec/README.md) before proposing a change.

## Current contribution status

The independent public repository is [zanefounty/series-of-calls](https://github.com/zanefounty/series-of-calls), with genuine upstream history retained. [zanefounty](https://github.com/zanefounty) is the accountable support contact; use the project GitHub issue tracker when public intake opens. Do not send project reports to the upstream Series of Tubes issue tracker, its Signal group, or its maintainer. Private vulnerability reporting is enabled in GitHub. Public contribution intake remains subject to the publication review and contribution terms. The [publication audit](docs/PUBLISHING_AUDIT.md) records those remaining steps.

## Development

The app builds as a static page from `src/` and `site/`. It has no server-side runtime. Use Node 24 and Python 3. Install the locked dependencies with `npm ci` in a network-enabled environment.

```sh
npm run dev
npm run test:communications
node --test --test-isolation=none tests/training-console.test.js
npm run test:gates
npm run i18n:check
npm run build
```

For the current environmental test limitations and actual recorded results, see [`evidence/verification.json`](evidence/verification.json) and [STATUS.md](STATUS.md). Do not describe DOM checks as real-browser checks, or development gates as proof of complete source coverage.

## Source and implementation boundaries

- Do not edit, remove, or normalize files under `research/source/`; verify them against `research/source-manifest.json`.
- Keep upstream attribution, the unchanged `LICENSE`, and the pinned snapshot records intact. Do not recreate or claim Git history that is not present.
- Preserve original source identifiers, source attributes, hashes, uncertainty, pending mechanics, and explicit negative acceptance conditions. A mapping or reference is not evidence that its behaviour is implemented.
- Keep all calls, messages, identities, numbers, customer data, network events, and controls synthetic. Do not add live integrations or real subscriber data.
- New state and commands must use the validated `SOC` dispatch boundary, deterministic saved state, and the existing desired/provisioning/effective/observed distinctions. Reads and rendering must remain pure.
- Do not claim a legal approval, provider certification, complete conversion, or upstream endorsement. Maintain the incomplete status until source obligations and release gates support a narrower claim.
- Do not add material unless you have permission to share it. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the current attribution and licensing boundary.

## Tests and review

Add deterministic behavioural coverage for each implementation change, including a meaningful negative case. Update only the acceptance and provenance records that directly correspond to the tested behaviour. Preserve failing tests and pending requirements; do not weaken gates to obtain a pass.

Before a release, the full project checks, locked dependency install, real-browser test, and publication review must all be completed. `npm run check:all` is a development check and does not replace `npm run check:release`.

## Contributions and licensing

The current [`LICENSE`](LICENSE) is the preserved upstream MIT license, and package metadata also says MIT. This workspace does not declare a separate license for the supplied design/mapping research. The owner must confirm the scope for new project contributions and retained research before opening public contribution intake. This guide does not add or extend any license grant.
