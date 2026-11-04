#!/usr/bin/env bash
# Official Linux x64 release, pinned by SHA-256; no installer pipes or API keys.
set -euo pipefail
[[ $(uname -s) == Linux && $(uname -m) == x86_64 ]] || { echo 'Requires Linux x64' >&2; exit 1; }
destination=${1:?Usage: install-gitleaks.sh /absolute/path/to/gitleaks}
[[ "$destination" == /* ]] || { echo 'Destination must be absolute' >&2; exit 1; }
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
curl --fail --silent --show-error --location --proto '=https' --tlsv1.2   https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz   -o "$work/gitleaks.tar.gz"
printf '%s  %s\n' 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb "$work/gitleaks.tar.gz" | sha256sum --check --status
tar -xzf "$work/gitleaks.tar.gz" -C "$work" gitleaks
install -m 0755 "$work/gitleaks" "$destination"
"$destination" version
