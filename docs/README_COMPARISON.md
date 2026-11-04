# README comparison and source pins

Reviewed 4 November 2026 while refreshing the project README. The snapshot was taken from the supplied bare clones in `/tmp/soc-fork-survey/repos` and the AU checkout in `/tmp/soc-fork-survey/au`; pins below are immutable Git commit IDs. This is a documentation comparison, not a fresh hosted-state check, feature acceptance or upstream adoption decision. Full gameplay and testing findings are in the [fork survey](../research/forks/README.md).

## README snapshots reviewed

| Project / branch | Commit pin | README SHA-256 | Useful README pattern or observed difference |
| --- | --- | --- | --- |
| [Series of Tubes upstream](https://github.com/fjaeckel/seriesoftubes/tree/b2366ed26018f957309292d04adf5d6e76a89c65) | `b2366ed26018f957309292d04adf5d6e76a89c65` | `0b2d3e31fd54a5f3a0d032f27a78ff8e259af550d2d9e9d4883a252f409ebb93` | Clear player-facing premise, feature groups, local start and learning context. Its live game and inherited-network claims do not describe this preview. |
| [Series of Tubes Australia](https://github.com/thesysadmindev/SeriesOfTubesAU/tree/c650d84d0f79219e8b2249bae9bac3bbfe3b2d5e) | `c650d84d0f79219e8b2249bae9bac3bbfe3b2d5e` | `a32dcb4f0f616a29c1b4520f9b8959417e87c099da69211a50a7dd7634955bc3` | Strong versioned release notes, player/developer entry points and a clear separation between its regional fork and inherited project. SOC keeps the attribution distinction and does not claim AU NBN/hosting features. |
| [Alex cloud-sync fork](https://github.com/alexgn100/seriesoftubes/tree/48bb34e61f4c325e1bd59437f8bc90897602cfc5) | `48bb34e61f4c325e1bd59437f8bc90897602cfc5` | `4e8543024548f82d3bfe3d4ccbdcf10df454dfb46b6946c49023a05e1703cab2` | README is largely inherited. Cloud sync is documented in feature commits `6971f2d7ad72c60abf051815f7305eb801b88825` and `ef0fc63e45d338cf1e5abddd1b8505901474302c`, not represented here as a SOC feature. |
| [Wnagele MCP/browser-agent branch](https://github.com/wnagele/seriesoftubes/tree/7438fd106562506f5e6ab774d9d04905c5cd4d58) | `7438fd106562506f5e6ab774d9d04905c5cd4d58` (`mcp-browser-mode`) | `0b2d3e31fd54a5f3a0d032f27a78ff8e259af550d2d9e9d4883a252f409ebb93` | README remains the upstream copy at this feature tip. The branch-specific MCP/HTTP relay, browser-agent mode and clock control are described in the source survey, not claimed by SOC. |
| [Flol0 extension archive](https://github.com/Flol0/seriesoftubes/tree/1abd783e435c27a5a76e076f86e67fb9ec978948) | `1abd783e435c27a5a76e076f86e67fb9ec978948` (`archive/fork-extensions-1.15.0`) | `22708f87cb4cc1d9d0213b2cf743bdb2befef40b0d1033240506c5aa8d166934` | Its README is an effective release note: versioned feature summary followed by test/build and publication instructions. Its power, hosting, service-fabric and cable extensions are fork features, not SOC claims. |

The AU hash was computed from the supplied checkout after confirming its `HEAD` is `c650d84d0f79219e8b2249bae9bac3bbfe3b2d5e`; the Flol0 hash was computed from `README.md` at the pinned bare-clone commit. The original survey records AU behavior, source tests and attribution in [australia.md](../research/forks/australia.md), and the Flol0 feature commits and local overlaps in [non-top-ten-followup.md](../research/forks/non-top-ten-followup.md).

## Top-ten default-branch README pins

The survey ranked ten forks by push time from a 39-fork snapshot in which all had zero stars. Ranking is a sampling rule, not a measure of feature quality or originality. The top-ten default-branch pins are:

| Rank | Fork | Default-branch pin | README snapshot |
| --- | --- | --- | --- |
| 1 | Lambro-codes/seriesoftubes | `b2366ed26018f957309292d04adf5d6e76a89c65` | Same bytes as inspected upstream README |
| 2 | wnagele/seriesoftubes | `da1a4e2f3c9f7fac12c94eefb8d35bd6b1e4ae16` | Same bytes as inspected upstream README |
| 3 | thesysadmindev/seriesoftubes | `66aaaec5f1cca7e2efd834b1d3d89ef7193ec704` | Fork variant; see AU and top-ten source reviews |
| 4 | pcn/seriesoftubes | `41d5bc8b2118d3de49df59dc35a522eb12b17227` | Same bytes as inspected upstream README |
| 5 | yeled/seriesoftubes | `de4a750cdd8231e24efddb2d59c5c07b2f767fa8` | Same bytes as inspected upstream README |
| 6 | alexgn100/seriesoftubes | `48bb34e61f4c325e1bd59437f8bc90897602cfc5` | Fork variant; cloud-sync distinction above |
| 7 | tannerryan/seriesoftubes | `10e5ff0073eef8f630592ce1d07c945892898907` | Same bytes as inspected upstream README |
| 8 | hdecreis/seriesoftubes-hdc | `add3d67e48b701289be661c44d70ddf3a14031a4` | No `README.md` at this pin |
| 9 | ddryden/seriesoftubes | `20c70f16e684fe76e3c9ee60b5e5adc75f4b9a37` | Fork variant |
| 10 | cookiesowns/seriesoftubes | `664dd24bbd1d013ad5fe290c49287fba5b64135a` | Fork variant |

The README refresh adopts portable onboarding patterns: explain the project before detailed implementation, show a working local start, state scope and provide clear routes to developer docs, testing, attribution and policy. It avoids upstream's live-play link, copied upstream education recommendations, fork-specific gameplay promises and implied publication. SOC's implementation inventory and operational instructions are linked to the maintained specification, status, evidence and MCP guides rather than being described as equivalent to surveyed fork features.

The survey selected branches by source behavior as well as default branches. Notable immutable pins include Alex's sync feature commits above; Wnagele's `mcp-browser-mode` at `7438fd106562506f5e6ab774d9d04905c5cd4d58`; and Flol0's cumulative extension archive above. The fork research distinguishes these source features from existing SOC overlap, executed fork tests and pending SOC review. No proposal or passing fork test automatically changes canonical acceptance.
