# W44 balance correction adoption

The authorized backlog reconciliation adopts upstream revision 3 (target 28, par 198) of the historical W44 scenario. Revision 2 and its reference replay remain preserved under `files/pinned/` and `weekly-w44-repro.json`. The current upstream engine no longer completes revision 2 within its 250-day window; revision 3 passes its reference plan.

Existing saves retain their embedded revision, objective and reference parameters. A recorded revision-2 win remains historical evidence but does not count as a revision-3 win: the existing explicit revision comparison is preserved. This update does not rewrite saved exercises or old results. The archived week is changed explicitly because the normal weekly refresh skips past valid weeks. Full browser validation remains pending.
