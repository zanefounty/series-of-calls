# Security policy

## Supported versions

No Series of Calls release is currently supported. The `0.1.0-preview.1` development preview is incomplete. All communications, identities, records and faults are synthetic.

## Reporting a vulnerability

Report suspected vulnerabilities privately through [GitHub vulnerability reporting](https://github.com/zanefounty/series-of-calls/security/advisories/new). GitHub reports that private vulnerability reporting is enabled for this independent repository. The accountable maintainer is [zanefounty](https://github.com/zanefounty). Reporter-to-recipient delivery has not yet been independently tested.

Do not send reports to Series of Tubes; its maintainer is not responsible for this adaptation. No response-time commitment is published for the preview.

## Routine safeguards

GitHub secret scanning and push protection are enabled, and Dependabot alerts are enabled. CI runs Gitleaks against Git history, the current source tree and the built Pages site, plus `npm audit`. Findings fail the security check. Active Actions are pinned to reviewed commits; ordinary test jobs have read-only permissions and do not retain checkout credentials. Hosted agent workflows stay disabled.

After `npm ci` and `npm run build`, run these checks locally (the installer supports Linux x64):

```sh
bash scripts/install-gitleaks.sh /tmp/soc-gitleaks
python3 scripts/check-secrets.py --gitleaks /tmp/soc-gitleaks --artifact _site
python3 scripts/check-pages-artifact.py _site
npm audit --audit-level=low
```

Do not put real credentials in game data, saves, issues or screenshots. The static game needs no provider keys. Scan reports are redacted and kept outside Git. If a real credential is exposed, revoke or rotate it first, then remove it and assess any history cleanup; deleting a file alone does not revoke a credential.

Pages only uploads the reviewed static file inventory, with unchanged licence and attribution notices. It deploys from `main` through the owner-reviewed `github-pages` environment. Preview publication is labelled incomplete; a full release also requires the unchanged product release gate.
