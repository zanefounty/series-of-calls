# Bounded browser cache-upgrade verification

On 5 November 2026, an actual Chromium run reproduced a same-version offline upgrade defect: after loading the new page online, `/series-of-calls/` reloaded the new build offline, but `/series-of-calls/index.html` loaded the previous build. Both builds advertised `0.1.0-preview.1`; their identical service-worker bytes prevented a worker update. The cache contained a new root document and an old `index.html`.

Build fix `0666001` derives the cache generation from shipped file contents. The second actual run replaced the worker, removed the old application cache, and loaded the current build offline through **both entrypoints**. It preserved the exact Training save at minute 1 and the separate paused Provider save at minute 0, with one customer and a paid 380,000-cent base purchase. This does not demonstrate active Provider workload continuity.

Both runs used lockfile-matching Playwright **1.64.1**, Chromium **156.0.8078.4**, and a **1366×768** viewport. The driver served preserved prior and current compiled artifacts at one real origin under `/series-of-calls/`. It warmed the old cache and verified an old offline reload before switching the server artifact. It did not inject cache contents or simulation state. The fixed run observed `controllerChanged: true`; both offline navigation responses came from the service worker. Neither run recorded page errors.

The independently reviewed receipts contain equal source and artifact manifests before and after each run (`noSourceDrift: true`). The preserved prior and fixed HTML/worker files were also independently rehashed against those receipts. These are bounded development results; the final candidate freeze and complete browser matrix remain separate.

| Artifact | `index.html` SHA-256 | `sw.js` SHA-256 |
| --- | --- | --- |
| Preserved prior build | `077ce980cf94583741f179d4380ae9fb6bfd908ce2961001b48fceb0c79a32a6` | `7d309a2787973c9fb0633ee96b6781aeea15df7242d2c86f5e8341d262f351b3` |
| Unfixed candidate | `39fbcb7f075b5d2938d4ab83539940d7be17533a4e82d02f31f55da95866a4fa` | `7d309a2787973c9fb0633ee96b6781aeea15df7242d2c86f5e8341d262f351b3` |
| Fixed candidate | `bd4c5f7d8d88b71f35e3fec66c4f73eaac80ff5e4596af9732712b0145785539` | `b129af094804a0c7266a41d92a5cbd2c964953064f963573f1a1cd4898cae95d` |

The new cache was `series-of-calls-0.1.0-preview.1-0beba140466ec45d094299e18427e842f202647fc19f278f80db2eaccc60065b`. Its root and `index.html` entries both matched the fixed HTML hash above. The previous cache `series-of-calls-0.1.0-preview.1` was absent.

Raw reports, screenshots, traces and built files remain outside Git:

- Failure, 03:23:50 UTC: `/tmp/soc-cache-upgrade-before-fix-parent/report.json`; receipt SHA-256 `4accc0d86b04ffed8245690e55d101e72b28b2d5b9e506c4dac49f330d598dbd`. The exact failure was `OFFLINE_ENTRYPOINT_RETAINED_OLD_BUILD` at `index.html`.
- Success, 03:24:05 UTC: `/tmp/soc-cache-upgrade-fixed-development/report.json`; receipt SHA-256 `43e10a92d4b315f0fc56b2479ab58c1acbaea1d4c3839bf53cec679815814c97`.
- Prior artifact: `/tmp/soc-browser-campaigns/2026-11-05T00-10-35-097Z-5d0727/site`.
- Fixed artifact: `/tmp/soc-cache-upgrade-fixed-development/current-site`.

Reproduce from the repository root with the preserved prior artifact (or another independently identified prior compiled build):

```sh
node scripts/browser-cache-upgrade.js \
  --previous-build /tmp/soc-browser-campaigns/2026-11-05T00-10-35-097Z-5d0727/site \
  --out /tmp/soc-cache-upgrade-rerun
```

Omitting `--current-build` builds the current source into the output directory. Supplying `--current-build PATH` tests an existing compiled artifact without rebuilding it. `CHROMIUM_PATH` may select the lockfile-compatible installed executable. The driver refuses identical old/new HTML, records input drift, and cannot count a launch/listen failure as browser evidence.

This result does not cover Firefox, WebKit, mobile cache upgrades, every prior release, all gameplay journeys, human playability, or the deployed public origin. Those checks and a fresh run after relevant candidate changes remain required. No source-catalogue completion, release approval or acceptance exclusion follows from this result.
