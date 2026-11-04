#!/usr/bin/env python3
"""Fail closed unless a Pages artifact matches the reviewed static file inventory."""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'maintenance' / 'pages-artifact-files.json'
MAX_FILE_BYTES = 100_000_000
MAX_SITE_BYTES = 1_000_000_000
NOTICES = ('LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md')
PRIVATE_SUFFIXES = {'.pem', '.key', '.p12', '.pfx', '.p8', '.jks', '.keystore', '.crt'}
PRIVATE_NAMES = {'.npmrc', '.pypirc', '.htaccess', '.htpasswd', 'web.config', 'id_rsa', 'id_ed25519'}
SERVER_NAMES = {'nginx.conf', 'apache.conf', 'httpd.conf', 'php.ini', 'dockerfile', 'procfile'}


def fail(message):
    raise ValueError(message)


def load_manifest(path):
    try:
        value = json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        fail(f'Cannot read Pages file manifest: {error}')
    if not isinstance(value, dict) or value.get('schemaVersion') != 1:
        fail('Unsupported Pages file manifest schema')
    files = value.get('files')
    if not isinstance(files, list) or not files:
        fail('Pages file manifest must contain a non-empty files array')

    expected = set()
    for name in files:
        if not isinstance(name, str) or not name or '\\' in name or '\x00' in name:
            fail('Pages manifest contains an invalid path')
        path = PurePosixPath(name)
        if path.is_absolute() or any(part in ('', '.', '..') or part.startswith('.') for part in path.parts):
            fail(f'Unsafe Pages manifest path: {name!r}')
        if any(not re.fullmatch(r'[A-Za-z0-9_.-]+', part) for part in path.parts):
            fail(f'Unsafe Pages manifest path: {name!r}')
        lowered = [part.lower() for part in path.parts]
        basename = lowered[-1]
        if (any(part in PRIVATE_NAMES or part in SERVER_NAMES for part in lowered)
                or any(any(term in part for term in ('credential', 'secret', 'password', 'token')) for part in lowered)
                or basename.endswith(tuple(PRIVATE_SUFFIXES))):
            fail(f'Pages manifest contains a private or server-side path: {name!r}')
        if path.as_posix() != name:
            fail(f'Non-canonical Pages manifest path: {name!r}')
        if name in expected:
            fail(f'Duplicate Pages manifest path: {name}')
        expected.add(name)

    if not set(NOTICES).issubset(expected):
        fail('Pages file manifest omits a required distribution notice')
    return expected


def validate(artifact, repo=ROOT, manifest=MANIFEST):
    artifact = Path(artifact)
    repo = Path(repo)
    expected = load_manifest(manifest)

    try:
        root_stat = artifact.lstat()
    except OSError as error:
        fail(f'Cannot inspect Pages artifact directory: {error}')
    if not stat.S_ISDIR(root_stat.st_mode):
        fail('Pages artifact root must be a real directory, not a symlink or special file')

    expected_dirs = set()
    for name in expected:
        parent = PurePosixPath(name).parent
        while parent != PurePosixPath('.'):
            expected_dirs.add(parent.as_posix())
            parent = parent.parent

    actual = set()
    total = 0
    for directory, dirnames, filenames in os.walk(artifact, topdown=True, followlinks=False):
        current = Path(directory)
        rel_dir = current.relative_to(artifact).as_posix()
        for dirname in list(dirnames):
            path = current / dirname
            rel = path.relative_to(artifact).as_posix()
            try:
                info = path.lstat()
            except OSError as error:
                fail(f'Cannot inspect Pages artifact path {rel}: {error}')
            if not stat.S_ISDIR(info.st_mode):
                fail(f'Pages artifact contains a symlink or non-directory path: {rel}')
            if rel not in expected_dirs or dirname.startswith('.'):
                fail(f'Unexpected Pages artifact directory: {rel}')
        for filename in filenames:
            path = current / filename
            rel = path.relative_to(artifact).as_posix()
            if rel not in expected:
                fail(f'Unexpected Pages artifact file: {rel}')
            try:
                info = path.lstat()
            except OSError as error:
                fail(f'Cannot inspect Pages artifact path {rel}: {error}')
            if not stat.S_ISREG(info.st_mode):
                fail(f'Pages artifact file is not a regular file: {rel}')
            if info.st_nlink != 1:
                fail(f'Pages artifact file has multiple hard links: {rel}')
            if info.st_size > MAX_FILE_BYTES:
                fail(f'Pages artifact file exceeds {MAX_FILE_BYTES} bytes: {rel}')
            actual.add(rel)
            total += info.st_size

    missing = sorted(expected - actual)
    if missing:
        fail('Missing Pages artifact files: ' + ', '.join(missing))
    if total > MAX_SITE_BYTES:
        fail(f'Pages artifact exceeds {MAX_SITE_BYTES} total bytes')

    for name in NOTICES:
        try:
            shipped = (artifact / name).read_bytes()
            source = (repo / name).read_bytes()
        except OSError as error:
            fail(f'Cannot compare distribution notice {name}: {error}')
        if shipped != source:
            fail(f'Pages distribution notice differs from repository bytes: {name}')

    return {'files': len(actual), 'bytes': total}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('artifact', help='built Pages artifact directory')
    parser.add_argument('--repo', default=str(ROOT), help=argparse.SUPPRESS)
    parser.add_argument('--manifest', default=str(MANIFEST), help=argparse.SUPPRESS)
    args = parser.parse_args(argv)
    try:
        result = validate(args.artifact, args.repo, args.manifest)
    except ValueError as error:
        print(f'Pages artifact rejected: {error}', file=sys.stderr)
        return 1
    print(f"Pages artifact accepted: {result['files']} files, {result['bytes']} bytes")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
