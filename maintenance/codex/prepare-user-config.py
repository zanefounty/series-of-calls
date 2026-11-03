#!/usr/bin/env python3
"""Preview (or explicitly apply) this repository's local Codex trust/config migration.

Run from the owner's normal terminal. Does not change sandbox, approvals,
managed requirements, providers, credentials, models or hosted automation.
"""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import shutil
import stat
import tempfile
import tomllib

ROOT = Path(__file__).resolve().parents[2]

def migrate(text, repo):
    original = tomllib.loads(text)
    proposed = text
    actions = []
    if 'analytics_enabled' in original:
        value = original['analytics_enabled']
        if not isinstance(value, bool):
            raise ValueError('analytics_enabled is not boolean; review manually')
        modern = original.get('analytics', {}).get('enabled')
        if modern is not None and modern != value:
            raise ValueError('Conflicting old/new analytics settings; review manually')
        # The legacy setting is a top-level key. Preserve its value and avoid
        # duplicating an existing [analytics] table or dotted key.
        pattern = r'(?m)^analytics_enabled\s*=\s*(?:true|false)\s*(?:#[^\n]*)?$'
        replacement = '' if modern is not None else 'analytics.enabled = '+str(value).lower()
        proposed, count = re.subn(pattern, replacement, proposed)
        if count != 1:
            raise ValueError('Cannot identify exactly one legacy analytics key; review manually')
        actions.append('Replace ignored analytics_enabled with analytics.enabled, preserving the current preference')
    project = original.get('projects', {}).get(repo)
    if project is None:
        proposed = proposed.rstrip()+'\n\n[projects.'+json.dumps(repo)+']\ntrust_level = "trusted"\n'
        actions.append('Trust this exact repository path for project config/agents/skills')
    elif project.get('trust_level') != 'trusted':
        raise ValueError('An explicit project trust decision already exists; change it in the client permissions/trust UI')
    parsed = tomllib.loads(proposed)
    if 'analytics_enabled' in parsed or parsed.get('projects', {}).get(repo, {}).get('trust_level') != 'trusted':
        raise ValueError('Proposed configuration did not validate')
    return proposed, actions

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Write a backup and atomically apply the previewed migration')
    args = parser.parse_args()
    config = (Path(os.environ.get('CODEX_HOME', str(Path.home()/'.codex')))/'config.toml').resolve()
    original = config.read_text() if config.exists() else ''
    proposed, actions = migrate(original, str(ROOT))
    print(json.dumps({'config': str(config), 'actions': actions, 'applyRequested': args.apply}, indent=2))
    if not args.apply or proposed == original:
        return
    if config.exists() and config.read_text() != original:
        raise ValueError('Configuration changed since preview; retry')
    config.parent.mkdir(parents=True, exist_ok=True)
    if config.exists():
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        backup = config.with_name(config.name+'.soc-backup-'+stamp)
        shutil.copy2(config, backup)
        print('Backup written beside user config: '+backup.name)
    else:
        backup = None
    fd, temporary = tempfile.mkstemp(prefix='.soc-config-', dir=config.parent)
    try:
        with os.fdopen(fd, 'w') as stream:
            stream.write(proposed)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, stat.S_IMODE(config.stat().st_mode) if config.exists() else 0o600)
        os.replace(temporary, config)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print('Applied. Restart Codex to load project configuration; permissions remain a separate setting.')

if __name__ == '__main__':
    main()
