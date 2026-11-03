# Third-party notices and provenance boundaries

This file records the third-party material identified in the current local preview. The application code is MIT licensed; separately attributed third-party excerpts retain their original rights.

## Series of Tubes upstream material

The inherited static build and physical-network game derive from [Series of Tubes](https://github.com/fjaeckel/seriesoftubes) by Frederic Jung. The imported upstream snapshot is pinned at `da1a4e2f3c9f7fac12c94eefb8d35bd6b1e4ae16`, with acquisition and file-level records under [`maintenance/upstream/`](https://github.com/zanefounty/series-of-calls/blob/main/maintenance/upstream/). Its original documentation is retained under [`maintenance/upstream/documentation/`](https://github.com/zanefounty/series-of-calls/blob/main/maintenance/upstream/documentation/). The separately supplied Series of Calls communications design and mapping are discussed below and are not upstream Series of Tubes documentation.

The root [`LICENSE`](LICENSE) file is preserved byte-for-byte and contains the upstream MIT text and its copyright notice. This adaptation is independent and is not endorsed by Frederic Jung or the upstream project. The imported snapshot does not include genuine Git history; see [README.md](https://github.com/zanefounty/series-of-calls/blob/main/README.md) and [STATUS.md](https://github.com/zanefounty/series-of-calls/blob/main/STATUS.md).

## Supplied design and mapping material

The design document and full mapping JSON in `research/source/` were supplied as project inputs and are preserved with hashes and provenance in `research/source-manifest.json`. They remain unchanged research inputs, separate from the application license declaration. Citations and third-party excerpts within them retain their original source attribution; they do not grant a license to the external works they reference.

## External research and product references

Research records cite official product material, public standards, public agency guidance, and historical operator mailing-list posts. Findings are dated and scoped in [`research/`](https://github.com/zanefounty/series-of-calls/blob/main/research/) and [the specification audit](https://github.com/zanefounty/series-of-calls/blob/main/spec/audit/README.md). Mailing-list and other historical reports are paraphrased as uncertain anecdotes; they are not prevalence data or legal claims. Product names and marks identify researched reference products and do not imply partnership, certification, or endorsement. A cited URL is provenance, not a license grant.

The generated catalogue contains source attributes and short labels needed for traceability. Review the source record and applicable terms before reusing a source-derived excerpt outside this project. This preview does not reproduce complete operator mailing-list posts.

## Build and development dependencies

The package lock lists development tools used for tests and browser checks. `scripts/build.js` copies the static `site/` tree and assembles application files; it does not copy `node_modules/` into the built site. This notice does not replace the license notices shipped with development dependencies or any future runtime dependency review.

## Project-generated illustration assets

The six communications scenes were newly generated for this project with an image-generation tool. Original PNGs, generation briefs and hashed responsive exports are recorded in `artwork/`; the tool did not report a model identifier. The social preview and installed-app icons are derived project assets, not recovered upstream binaries. See [artwork/BRIEFS.md](https://github.com/zanefounty/series-of-calls/blob/main/artwork/BRIEFS.md) and [artwork/manifest.json](https://github.com/zanefounty/series-of-calls/blob/main/artwork/manifest.json). These provenance records do not replace the separate upstream asset obligations or claim endorsement by the upstream author.

## Publication follow-up

The package's `MIT` metadata describes the application. Inventory the exact shipped assets and keep their notices attached; the [publishing audit](https://github.com/zanefounty/series-of-calls/blob/main/docs/PUBLISHING_AUDIT.md) records remaining delivery checks. No local review here changes the terms of `LICENSE`.
