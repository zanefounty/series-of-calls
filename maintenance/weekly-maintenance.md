# Weekly native GitHub maintenance

Owner choice, 4 November 2026: weekly maintenance review and draft fixes, with
outside/fork pull requests requiring approval and trusted PRs running automatically.

The [workflow](../.github/workflows/weekly-maintenance.yml) is prepared but its
review job is **hard-disabled**. Its weekly slot is Tuesday 22:15 UTC (Wednesday
09:15 AEDT / 08:15 AEST). No paid inference or automated fix has been run.

It uses GitHub's native Copilot CLI and ephemeral `GITHUB_TOKEN`, without an OpenAI
key or PAT. In a personal repository, usage is billed to the owner's Copilot seat.
See [GitHub's authentication and billing documentation](https://docs.github.com/en/copilot/concepts/agent-capabilities/agent-powered-workflows-and-operations/copilot-cli-in-github-actions).

The agent job has read-only repository access and the inference-only
`copilot-requests: write` permission. It makes one attempt within 20 minutes,
with a 100 AI-credit session ceiling and an explicitly selected model. That local
ceiling is additional protection, **not proof of a monthly provider hard stop**.
Tool permissions allow local edits and selected test/read commands; built-in MCP
servers are disabled and the CLI strips its token from child tool environments.
These permissions are not an OS/network sandbox. GitHub documents the direct CLI's
[broader environment access](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-in-actions).

A fresh publisher checks out the triggering main commit, validates the patch
with trusted code, and creates a draft only when an applicable patch exists.
It never executes candidate code or copies agent-written text into the PR body.
The existing validator rejects unsupported/protected paths, binary files,
symlinks, renames and oversized patches. CI, accountability and security are
explicitly dispatched because bot-token PR creation does not itself start CI.
Owner review and all required checks remain mandatory. There is no merge or
deployment step. Usage and patch artifacts expire after seven days; they are
not committed. This initial scope reviews local commits/application/tests;
it does not claim to ingest live issue or alert feeds.

Before activation, independently verify:

1. The owner's Copilot entitlement supports native Actions inference; choose an
   available inexpensive model and set `SOC_COPILOT_MODEL`.
2. A provider-enforced **US$25 monthly** limit covering this workflow's Copilot
   usage. In [personal billing settings](https://github.com/settings/billing),
   use Budgets and alerts, the applicable AI-credit SKU and scope, with **Stop
   usage when budget limit is reached** enabled. Confirm the chosen scope actually
   covers personal-repository Actions inference. Do not substitute an alert-only
   budget or affect unrelated account usage without owner direction.
3. Main required checks, owner review and all-external-contributor CI approval
   remain effective. Record the billing evidence and scope without credentials.
4. Submit a separate owner-reviewed activation PR removing the hard-disable,
   then exercise one manual run, its draft/empty-patch paths and actual billing.

GitHub documents [personal budgets and hard stops](https://docs.github.com/en/billing/how-tos/set-up-budgets),
but the documented REST budget endpoints cover organizations/enterprises, not
personal-account budget verification. Local flags and a usage total do not prove
the required account setting. This billing verification is still outstanding.

The separate legacy OpenAI adaptation workflow remains disabled with its existing
prerequisites. GitHub's cloud-agent Automations are private/internal-only; this
repository stays public. Agentic Workflows' compiler pins Actions to SHAs, so this
small direct-CLI workflow preserves the owner's current-major-tag policy instead.
