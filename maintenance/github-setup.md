# GitHub setup for Series of Calls

Prepared 3 November 2026. The local preview is not a release. Repository creation, authentication, protections and publication have not been completed.

## Create the destination

Create a **public, ordinary repository** owned by **zanefounty**, named **series-of-calls**. Leave README, licence and `.gitignore` initialization unchecked. The existing files include MIT attribution. Do not use GitHub's Fork button. GitHub recommends an empty destination when importing existing history. [GitHub import instructions](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).

## Authenticate the same WSL environment

Run these in the WSL terminal where this workspace lives. Complete the browser login as `zanefounty`; keep tokens out of chat and repository files.

```sh
rtk gh auth login --hostname github.com --git-protocol https --web --scopes workflow
rtk gh auth setup-git
rtk gh auth status
rtk git ls-remote https://github.com/fjaeckel/seriesoftubes.git refs/heads/main
```

The workflow scope permits pushing the prepared `.github/workflows` files. The browser login and Git credential setup are described in the [GitHub CLI authentication manual](https://cli.github.com/manual/gh_auth_login). Shell network access must work as well as browser access. This session cannot create IPv4 or IPv6 TCP sockets (`EPERM`); name resolution also fails across GitHub and unrelated hosts. Browser/connector access uses a separate network path. Changing WSL DNS alone cannot remove this session restriction.

The agent can then run `rtk python3 scripts/hydrate-history.py` from `series-of-calls`. It clones genuine upstream history into a temporary checkout and attaches its Git metadata while preserving local work. Do not run `git init` in this snapshot: an unrelated first commit would violate the history requirement. Expected remotes are `origin=https://github.com/zanefounty/series-of-calls.git` and `upstream=https://github.com/fjaeckel/seriesoftubes.git`.

Before the first push, verify the pinned ancestry, recover the six outstanding upstream binary assets, review the working tree and run the locked dependency checks. Create the initial project commit with the configured contributor identity. Publish an accurately labelled preview branch/main only after those checks; full release remains gated separately. Never force-push over an unexpectedly populated destination.

## Protect the repository after bootstrap

Enable Actions. Keep default workflow permissions read-only; trusted publisher jobs request their explicit write permissions. Allow Actions to create pull requests for the prepared observation workflows.

After the first CI run establishes check names, use separate active rules on `main`:

1. Required status checks **`test`**, **`translations`** and **`accountability`**, with no bypass actors. Require the expected GitHub Actions source. Block deletion and force pushes.
2. Pull requests with one approval, CODEOWNER review and dismissed stale approvals. Bot changes require `zanefounty`'s review. If owner-authored PRs need a review exception, put the owner's narrowly scoped PR bypass on this review rule only; never on the required-check rule. Verify that a deliberately failing owner PR still cannot merge and that a bot PR cannot merge without owner approval.

Keep the bot identity without administrator/bypass permissions. `test` aggregates the four test shards and build; `translations` checks dictionary structure; `accountability` reruns evidence and all coverage gates. Governance/workflow changes require a separate owner-reviewed PR. GitHub combines applicable protections, so validate the actual effective rules rather than relying on their names. [Ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges/managing-rulesets/available-rules-for-rulesets), [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges/managing-protected-branches/about-protected-branches).

## Pages and maintenance

In **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**. The prepared `release.yml` publishes `_site` to `https://zanefounty.github.io/series-of-calls/` only after release eligibility passes. Protect the `github-pages` environment so deployment comes from `main`. Selecting a publishing source does not make this incomplete preview release-ready. [GitHub Pages configuration](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Manually test the weekly upstream and monthly reference workflows, confirm their bot PRs explicitly run validation, then retain their schedules. Test failure recording as well as success. Do not change readiness flags until evidence exists.

The unattended Codex adaptation workflow remains hard-disabled. Later setup requires a dedicated API project with an actually enforced **US$25 monthly limit**, its `SOC_OPENAI_API_KEY` secret, and independently verified budget/protection evidence referenced by `SOC_LIMIT_RECEIPT`. An alert-only budget is insufficient; provider enforcement may slightly overshoot. Credentials alone do not authorize activation. Enable it only through the required owner-reviewed governance change after checking the trusted writer, bounded runtime, usage reporting and one-run concurrency.
