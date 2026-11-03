# Architecture decisions

Reviewed for Series of Calls on 4 November 2026. ADRs 0001–0003 originated in Series of Tubes. Their historical dates and rationale remain visible; dated applicability notes explain the independent adaptation. Historical operational claims are not evidence that this repository is published or its workflows are enabled.

| Decision | Current applicability |
| --- | --- |
| [0001: GitHub Pages](0001-github-pages-only.md) | Static deployment target retained; independent project path, local assets and gated release replace the upstream custom domain/analytics assumptions |
| [0002: assembled page](0002-one-page-assembled-at-build.md) | Source assembly retained; SOC factories/dispatcher and optional SP runtime coexist in the assembled page |
| [0003: labelled translations](0003-translations-by-label.md) | Label mechanism retained for all training consoles, diagnostics and adapted humour; dictionary parity is not translation-quality review |

Current state, interfaces and persistence are documented in [ARCHITECTURE.md](../ARCHITECTURE.md), with full product contracts in [the specification](../../spec/README.md). New decisions should identify the affected source requirements, alternatives, compatibility effects and verification rather than retroactively changing an inherited decision's author or date.
