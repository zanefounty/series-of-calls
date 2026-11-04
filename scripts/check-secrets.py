#!/usr/bin/env python3
"""Run redacted Gitleaks scans on repository history, current files, and a Pages artifact."""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / '.gitleaks.toml'
TIMEOUT_SECONDS = 300
REQUIRED_VERSION = '8.30.1'


class ScanError(Exception):
    pass


def _paths(repo):
    result = subprocess.run(
        ['git', '-C', str(repo), 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if result.returncode:
        raise ScanError('Could not enumerate repository source files')
    for raw in result.stdout.split(b'\0'):
        if not raw:
            continue
        name = os.fsdecode(raw)
        rel = PurePosixPath(name)
        if rel.is_absolute() or any(part in ('', '.', '..') for part in rel.parts) or '\\' in name:
            raise ScanError('Repository contains an unsafe tracked path')
        yield rel


def _copy_snapshot(repo, destination):
    for rel in _paths(repo):
        source = Path(repo).joinpath(*rel.parts)
        try:
            info = source.lstat()
        except FileNotFoundError:
            # A deleted tracked path is represented by its historical scan.
            continue
        if not stat.S_ISREG(info.st_mode):
            if stat.S_ISDIR(info.st_mode):
                continue
            raise ScanError('Repository contains a symlink or special file in the scan set')
        parent = Path(repo)
        for part in rel.parts[:-1]:
            parent = parent / part
            if parent.is_symlink():
                raise ScanError('Repository contains a symlinked parent in the scan set')
        if not source.resolve(strict=True).is_relative_to(Path(repo).resolve()):
            raise ScanError('Repository scan path resolves outside the repository')
        target = destination.joinpath(*rel.parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)

def _copy_artifact(artifact, destination):
    artifact = Path(artifact)
    if not artifact.exists() or not artifact.is_dir() or artifact.is_symlink():
        raise ScanError('Pages artifact must be a real directory')
    for current, dirs, files in os.walk(artifact, topdown=True, followlinks=False):
        src_dir = Path(current)
        rel_dir = src_dir.relative_to(artifact)
        dst_dir = destination / rel_dir
        dst_dir.mkdir(parents=True, exist_ok=True)
        for name in list(dirs):
            entry = src_dir / name
            if entry.is_symlink() or not entry.is_dir():
                raise ScanError('Pages artifact contains a symlink or special directory')
        for name in files:
            entry = src_dir / name
            if entry.is_symlink() or not entry.is_file():
                raise ScanError('Pages artifact contains a symlink or special file')
            shutil.copyfile(entry, dst_dir / name)


def _gitleaks(binary, command, source, report, ignore_file):
    args = [
        str(binary), command, '--config', str(CONFIG),
        '--gitleaks-ignore-path', str(ignore_file),
        '--ignore-gitleaks-allow', '--redact=100', '--no-banner', '--no-color',
        '--log-level=error', '--report-format=json', '--report-path', str(report),
    ]
    if command == 'git':
        args.extend(['--log-opts=--all --full-history'])
    args.append(str(source))
    environment = os.environ.copy()
    environment.pop('GITLEAKS_CONFIG', None)
    environment.pop('GITLEAKS_CONFIG_TOML', None)
    try:
        result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                env=environment, timeout=TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        raise ScanError(f'Gitleaks {command} scan timed out after {TIMEOUT_SECONDS} seconds') from None
    except OSError as error:
        raise ScanError(f'Could not run Gitleaks for {command}: {error.__class__.__name__}') from None
    try:
        data = json.loads(report.read_text(encoding='utf-8')) if report.exists() else None
    except (OSError, UnicodeError, json.JSONDecodeError):
        data = None
    if not isinstance(data, list):
        raise ScanError(f'Gitleaks {command} did not produce a valid report (exit {result.returncode})')
    if result.returncode not in (0, 1) or (result.returncode == 1 and not data):
        raise ScanError(f'Gitleaks {command} failed (exit {result.returncode})')
    if result.returncode == 0 and data:
        raise ScanError(f'Gitleaks {command} reported findings with a success exit code')
    counts = {}
    for finding in data:
        rule = finding.get('RuleID') if isinstance(finding, dict) else None
        if not isinstance(rule, str) or not rule:
            rule = 'unknown-rule'
        counts[rule] = counts.get(rule, 0) + 1
    return counts


def scan(binary, repo=ROOT, artifact=None):
    repo = Path(repo).resolve()
    binary = Path(binary).resolve() if os.path.sep in str(binary) else shutil.which(str(binary))
    if not binary:
        raise ScanError('Gitleaks binary was not found')
    binary = Path(binary)
    if not binary.is_file():
        raise ScanError('Gitleaks binary is not a file')
    try:
        version = subprocess.run([str(binary), 'version'], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                 text=True, timeout=10)
    except (OSError, subprocess.TimeoutExpired):
        raise ScanError('Could not verify Gitleaks version') from None
    if version.returncode or version.stdout.strip() != REQUIRED_VERSION:
        raise ScanError(f'Gitleaks {REQUIRED_VERSION} is required')
    shallow = subprocess.run(['git', '-C', str(repo), 'rev-parse', '--is-shallow-repository'],
                             stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if shallow.returncode:
        raise ScanError('Could not determine whether repository history is complete')
    if shallow.stdout.strip() == 'true':
        raise ScanError('Full-history secret scanning requires a non-shallow repository clone')

    tmp_parent = Path(tempfile.gettempdir()).resolve()
    if repo == tmp_parent or tmp_parent.is_relative_to(repo):
        raise ScanError('Temporary scan output would be inside the repository')
    with tempfile.TemporaryDirectory(prefix='soc-gitleaks-', dir=tmp_parent) as temporary:
        work = Path(temporary)
        ignore_file = work / '.gitleaksignore'
        ignore_file.write_text('', encoding='utf-8')
        history_report = work / 'history.json'
        current_report = work / 'current.json'
        history = _gitleaks(binary, 'git', repo, history_report, ignore_file)
        snapshot = work / 'source'
        snapshot.mkdir()
        _copy_snapshot(repo, snapshot)
        current = _gitleaks(binary, 'dir', snapshot, current_report, ignore_file)
        counts = [history, current]
        if artifact is not None:
            artifact_snapshot = work / 'artifact'
            artifact_snapshot.mkdir()
            _copy_artifact(artifact, artifact_snapshot)
            artifact_report = work / 'artifact.json'
            counts.append(_gitleaks(binary, 'dir', artifact_snapshot, artifact_report, ignore_file))
    total = {}
    for scan_counts in counts:
        for rule, count in scan_counts.items():
            total[rule] = total.get(rule, 0) + count
    return total


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gitleaks', default=os.environ.get('GITLEAKS_BIN', 'gitleaks'), metavar='PATH',
                        help='Gitleaks executable (or GITLEAKS_BIN; default: gitleaks on PATH)')
    parser.add_argument('--artifact', help='optional built Pages artifact directory')
    parser.add_argument('--repo', default=str(ROOT), help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    try:
        counts = scan(args.gitleaks, args.repo, args.artifact)
    except ScanError as error:
        print(f'Secret scan failed: {error}', file=sys.stderr)
        return 2
    except Exception as error:
        # Do not forward scanner output or candidate content through an unexpected exception.
        print(f'Secret scan failed: {error.__class__.__name__}', file=sys.stderr)
        return 2
    total = sum(counts.values())
    if total:
        summary = ', '.join(f'{rule}={counts[rule]}' for rule in sorted(counts))
        print(f'Secret scan found {total} finding(s); rules: {summary}', file=sys.stderr)
        return 1
    print('Secret scan passed: no findings in history, current files, or supplied artifact')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
