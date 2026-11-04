# Codex setup and session recovery

Checked 4 November 2026 against installed Codex CLI **0.166.0** and current official documentation. This is the installed version, not a claim that it is the newest published binary. Use the [restart handoff](RESTART_HANDOFF.md) to resume implementation.

## Current verified setup

Access was restored in this continuation. Genuine Git history, clean locked dependencies, DNS/HTTPS and localhost listening now work. The owner already applied the user-config migration; do not repeat it. [Current preflight](https://github.com/zanefounty/series-of-calls/blob/11e16893a9598f96f340aa07322497219bf2c019/evidence/access-restored-2026-11-04/codex-preflight-current.json) and [actual native client discovery](https://github.com/zanefounty/series-of-calls/blob/11e16893a9598f96f340aa07322497219bf2c019/evidence/access-restored-2026-11-04/native-codex.json) supersede the earlier blocked observations below.

A direct interactive `codex --no-daemon --no-alt-screen --strict-config` launch from the project root connected Calls (5 tools), SP (22), browser MCP (29) and official documentation (5). The `/skills` menu discovered Series of Calls development. No model prompt was sent. The test exposed and corrected the old stdio `cwd = ".."`: the installed native client resolved it against the project root, so Node searched for scripts in the parent. The corrected `cwd = "."` was verified in a fresh client. All eight setup tests pass with the actual client path semantics. These are connection/discovery checks; behavior remains evidenced separately.

## Earlier blocked findings (historical)

The active executor reports workspace-write access, restricted networking and disabled sandbox escalation. After the owner selected Full access, fresh probes still rejected an IPv4 loopback listener with `EPERM`, failed GitHub/npm DNS and could not write Codex's user-directory PATH aliases. These establish the effective restrictions; they do not prove whether a stale executor, remote configuration or managed policy caused the mismatch. WSLg cannot fix a denied socket. Connected GitHub/web tools use separate connections and retrieved exact upstream files while shell DNS remained blocked.

`codex doctor --json --network-only` also found that global `analytics_enabled` is ignored. The current key is `analytics.enabled`. The global config trusts the parent `zefun` directory; independent project discovery remains unverified. This snapshot lacks `.git`, locked jsdom/Playwright dependencies and a connected browser MCP. Those are separate issues from configuration syntax.

## Project configuration

[`.codex/config.toml`](../.codex/config.toml) registers communications MCP, optional SP MCP, pinned browser MCP and official OpenAI documentation. Native Codex 0.166.0 resolves these stdio working directories from the project root. Use `cwd = "."`; the former `".."` launched Node in the parent directory and failed with `MODULE_NOT_FOUND`. The file limits spawned agents to three plus the coordinator and requests live research search. Existing standalone agents retain the requested cheaper `gpt-6-luna` roles and inherited verifier model.

The project does not force a global model, credential, provider, analytics preference or permission policy. Select Full access on launch. A repository file cannot elevate the current executor or override managed requirements. Project configuration loads only in a trusted project; parsing is not proof of discovery or a connected MCP server. Sources: [config precedence](https://learn.chatgpt.com/docs/config-file/config-basic), [relative paths](https://learn.chatgpt.com/docs/config-file/config-advanced), [agent fields](https://learn.chatgpt.com/docs/agent-configuration/subagents), [MCP settings](https://learn.chatgpt.com/docs/extend/mcp).

Before native discovery was tested, the installed app-server accepted these settings supplied as explicit CLI overrides and returned valid startup JSON without starting a model or MCP connection; [the parser receipt](https://github.com/zanefounty/series-of-calls/blob/11e16893a9598f96f340aa07322497219bf2c019/evidence/completion-pass-2026-11-04/codex-native-config.json) records the config hash. That was a parser check only; it did not catch the working-directory defect found by the later native session.

`requirements.toml` is administrator-enforced policy, not a repository dependency manifest. A pretend project-local requirements file would not repair this session. No managed policy, approval rule, credential or disabled hosted adaptation setting has been changed. See [official configuration requirements](https://learn.chatgpt.com/docs/config-file/config-basic#configuration-precedence).

## Relaunching an already prepared checkout

The owner has already completed migration for this checkout. Only for a new, unprepared user config, preview and then apply:

```bash
rtk proxy python3 maintenance/codex/prepare-user-config.py
rtk proxy python3 maintenance/codex/prepare-user-config.py --apply
```

The script preserves the analytics choice under the supported key and trusts this exact repository path. It refuses conflicting preferences or an existing explicit untrusted decision, validates TOML, backs up beside the global config and writes atomically. It does not print credentials or change models, providers, sandbox settings or hosted automation. The earlier restricted session could only preview it; the owner subsequently applied it successfully.

Close the old client, then start a fresh process and select this conversation:

```bash
codex resume --no-daemon \
  --sandbox danger-full-access \
  --ask-for-approval never \
  -c 'project_root_markers=["AGENTS.md"]' \
  -C /home/zane-fountylabs/workspace/zefun/series-of-calls
```

Launch this interactive command directly, without `rtk proxy`: the proxy captures stdout, so Codex reports `stdout is not a terminal`. Keep RTK for the noninteractive commands elsewhere in this guide. The configuration migration does not need repeating after it succeeds.

These flags implement the owner's explicit Full access choice. `--no-daemon` avoids reusing the shared background server; it cannot override organization/host policy. Installed CLI help confirms the flags. For an IDE client, select Full access and restart the extension. See [official permission controls](https://learn.chatgpt.com/docs/sandboxing).

The one-off root marker matters while `.git` is absent: Codex normally discovers project roots through `.git`. `AGENTS.md` identifies this snapshot without creating fake history or changing root detection for every other project. The override parser was checked through `codex app-server --print-startup-config` without a model call. Genuine history is now present and native project MCP discovery has passed. After genuine history is attached, the default `.git` marker can be used again.

## Verify after restart

```bash
rtk proxy python3 maintenance/codex/preflight.py --output evidence/codex-restart-preflight.json
rtk proxy codex doctor --summary --network-only
rtk proxy gh auth status
```

Preflight checks sockets, DNS, local dependency versions, Git metadata, tool versions and TOML. Missing Git/dependencies will still report blocked until those separate prerequisites are repaired. Do not copy user auth/config files into the repository or print tokens.

Use `/permissions` to inspect the active profile and `/mcp` to confirm live connections. Verify the four `soc_*` roles and `$series-of-calls-development` are discovered. Configuration and package availability do not prove connection. Repeat listener/DNS checks even if the UI says Full access. If they fail outside Codex too, diagnose WSL/host networking; if only Codex fails, inspect effective managed policy/executor configuration. Do not disable host security controls speculatively.

In the installed CLI, `codex mcp get/list` returned the user registry rather than these project servers. Do not interpret that alone as a missing project configuration; verify the runtime session with `/mcp`. The command also rejects `--strict-config` on the `mcp` subcommand, so that invocation is not a valid project validation check.

## Browser packages are independently versioned

The app lockfile requires `playwright-core@1.56.0`. The separately verified browser MCP release is `@playwright/mcp@0.0.84`, published 31 October 2026; its own dependency is `playwright-core@1.65.0-alpha-2026-10-30`. These packages need different browser builds. Do not replace the app lockfile merely to match MCP. After clean app installation, run in the permitted terminal:

```bash
rtk proxy npm ci
rtk proxy npx --no-install playwright-core install chromium firefox webkit
rtk proxy npx --yes @playwright/mcp@0.0.84 install-browser chromium
```

The configured MCP flags are supported by that release. `--isolated` keeps its browser profile in memory; `--save-session` separately writes MCP session output. Existing `maintenance/baseline.json` is historical and reports a different app Playwright version; the earlier preflight found no local app package at all. The access-restored clean install and current preflight supersede that historical dependency limitation. Sources: [MCP package](https://github.com/microsoft/playwright-mcp/blob/v0.0.84/package.json), [CLI](https://github.com/microsoft/playwright-mcp/blob/v0.0.84/cli.js), [flags](https://github.com/microsoft/playwright-mcp/blob/v0.0.84/README.md), [version-specific browser installation](https://github.com/microsoft/playwright/blob/v1.56.0/docs/src/browsers.md).

## Continue after access works

1. Recover genuine upstream history using `scripts/hydrate-history.py` and its documented checks. Do not `git init`. Verify the independent destination and remotes before pushing.
2. Run `npm ci` without external `NODE_PATH`. Preserve the lockfile; install matching browser binaries and separately verify the pinned browser MCP package.
3. Run the full suite, acceptance recorder, Python mutation tests, development/release gates, stdio MCP with `--campaigns`, build and translations. Retain exact inputs and failures.
4. Run compact/campaign browser matrices and browser MCP exploration, offline reload, tab ownership, keyboard and responsive checks. Follow [browser acceptance](BROWSER_ACCEPTANCE.md).
5. Continue source-specific implementation and owner research review. Infrastructure readiness alone cannot authorize publication. GitHub protection, governance review, provider budget and Pages release remain separate evidenced operations.
