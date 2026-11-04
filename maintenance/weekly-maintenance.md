# Weekly native GitHub maintenance

Owner choice, 4 November 2026: weekly maintenance review and draft fixes, using
**the owner's OpenAI API key** in GitHub's native Copilot CLI. Outside/fork PRs
require approval; trusted repository PRs run automatically.

The [workflow](../.github/workflows/weekly-maintenance.yml) is prepared but its
review job is **hard-disabled**. Its weekly slot is Tuesday 22:15 UTC (Wednesday
09:15 AEDT / 08:15 AEST). No paid inference or automated fix has been run.

Copilot CLI bring-your-own-key mode calls OpenAI directly through the Responses
API at `https://api.openai.com/v1`. GitHub Copilot authentication or subscription
billing is not used for model requests. The installed CLI 1.0.105 documents these
provider environment variables in `copilot help providers`; see also
[GitHub's custom-provider documentation](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-llm-models).

The `maintenance-agent` GitHub environment is restricted to the **main branch**
by its server-side deployment policy. Store the dedicated project key there as
`SOC_OPENAI_API_KEY`, and set `SOC_OPENAI_MODEL` to an available inexpensive model.
Do not put the key in a repository file, prompt, command argument or chat. The
workflow passes it only to the Copilot step and strips it from shell/MCP child
environments with `--secret-env-vars`. The review job has only `contents: read`;
there is no GitHub model-inference permission or model-authentication token.

The job makes one attempt within 20 minutes. Selected local edit/test tools are
allowed; built-in MCP servers are disabled. These permissions are not an OS or
network sandbox. Provider-enforced spend limits remain necessary. A fresh
publisher checks out the triggering main commit, validates the patch using
trusted code, and creates a draft only when an applicable patch exists. It never
executes candidate code or copies agent prose into the PR body. The existing
validator rejects unsupported/protected paths, all Python governance tests,
binary files, symlinks, renames and oversized patches. Other test changes remain
subject to human review. CI, accountability and security are explicitly dispatched.
There is no merge or deployment step. Patch/usage artifacts expire after seven
days and are not committed. Initial reviews cover local commits/application/tests,
not live issue or alert feeds.

Before activation:

1. Add the dedicated OpenAI project key to the `maintenance-agent` environment
   secret and select its model with `SOC_OPENAI_MODEL`.
2. In that OpenAI project's **Limits → Spend → Edit spend limit**, set **US$25
   monthly** and enable **Enforce a hard limit**. Provide the project ID and
   dated non-secret evidence of the enforced setting for verification. A spend
   alert does not stop requests. Enforcement can slightly overshoot while the
   provider propagates its state. See [OpenAI spend limits](https://developers.openai.com/api/docs/guides/spend-limits).
3. Verify the environment restriction, required checks and owner-review rules.
   Submit a separate owner-reviewed activation PR removing the hard-disable.
4. Exercise one manual run, draft/empty-patch handling and actual provider usage.

The key and provider budget evidence are currently missing. The separate legacy
OpenAI adaptation workflow remains disabled with its existing prerequisites.
GitHub's cloud-agent Automations are private/internal-only; this repository stays
public. Agentic Workflows compiles Actions to SHA pins, so this small direct-CLI
workflow preserves the owner's current-major-tag policy instead.
