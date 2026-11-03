#!/usr/bin/env python3
"""Read-only restart diagnostics. Does not install, change policy or grant release readiness."""
import argparse
import datetime
import json
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tomllib

ROOT = Path(__file__).resolve().parents[2]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    checks = []
    def record(name, passed, detail):
        checks.append({'name': name, 'status': 'passed' if passed else 'blocked', 'detail': detail})
    def command(name, argv):
        try:
            run = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, timeout=15)
            # These explicit version/status commands never emit credentials.
            record(name, run.returncode == 0, (run.stdout + run.stderr).strip()[:1200])
        except (OSError, subprocess.TimeoutExpired) as error:
            record(name, False, str(error))
    command('node-version', ['node', '--version'])
    command('codex-version', ['codex', '--version'])
    command('genuine-repository', ['git', '-C', str(ROOT), 'rev-parse', '--show-toplevel'])
    # A parent repository is not evidence that this independent repository exists.
    record('own-git-metadata', (ROOT/'.git').exists(), 'Repository .git directory or worktree pointer required; never run git init to replace upstream history.')
    for host in ['github.com', 'registry.npmjs.org', 'cdn.playwright.dev']:
        try:
            socket.getaddrinfo(host, 443)
            record('dns:'+host, True, 'Resolved; this does not prove HTTPS or authentication.')
        except OSError as error:
            record('dns:'+host, False, str(error))
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            listener.bind(('127.0.0.1', 0))
            listener.listen(1)
            record('localhost-listener', True, 'Bound/listened on an ephemeral IPv4 loopback port; closed immediately.')
    except OSError as error:
        record('localhost-listener', False, str(error))
    lock = json.loads((ROOT/'package-lock.json').read_text())
    for package in ['jsdom', 'playwright-core']:
        path = ROOT/'node_modules'/package/'package.json'
        expected = lock['packages']['node_modules/'+package]['version']
        actual = json.loads(path.read_text())['version'] if path.is_file() else None
        record('locked-package:'+package, actual == expected, {'expected': expected, 'actual': actual, 'externalNodePathIgnored': True})
    for path in [ROOT/'.codex/config.toml', *sorted((ROOT/'.codex/agents').glob('*.toml'))]:
        try:
            parsed = tomllib.loads(path.read_text())
            if path.parent.name == 'agents':
                for key in ['name', 'description', 'developer_instructions']:
                    if not isinstance(parsed.get(key), str) or not parsed[key].strip():
                        raise ValueError('Missing agent field '+key)
            record('toml:'+str(path.relative_to(ROOT)), True, 'Parsed; client discovery must be verified separately.')
        except (OSError, ValueError) as error:
            record('toml:'+str(path.relative_to(ROOT)), False, str(error))
    record('github-cli', bool(shutil.which('gh')), 'CLI availability only; run gh auth status separately without printing tokens.')
    report = {'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'root': str(ROOT), 'checks': checks,
              'status': 'passed' if all(c['status'] == 'passed' for c in checks) else 'blocked',
              'scope': 'Local prerequisites only. Does not prove browser MCP connection, HTTPS/auth, clean npm ci, source completion or release eligibility.'}
    result = json.dumps(report, indent=2)+'\n'
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(result)
    print(result, end='')
    return 0 if report['status'] == 'passed' else 1

if __name__ == '__main__':
    sys.exit(main())
