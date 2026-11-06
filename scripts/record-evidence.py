#!/usr/bin/env python3
"""Run complete or sharded acceptance evidence and merge validated shards."""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import re
import subprocess
import sys

from verify import (
    GateError,
    acceptance_command,
    acceptance_results,
    acceptance_shard,
    acceptance_suites,
    require,
)


ROOT = Path(__file__).resolve().parents[1]
RESULT_ROW = re.compile(r'^(ok|not ok) (\d+) - (AC-SOC-\d+)(.*)$')
TAP_RESULT_ROW = re.compile(r'^(ok|not ok) (\d+) - .+$', re.M)
COMMAND_PREFIX = ['node', '--test', '--test-isolation=process']


def sha256_bytes(value):
    return hashlib.sha256(value).hexdigest()


def input_hashes(root, plan):
    paths = plan['inputs'] + ['spec/acceptance-plan.json']
    return {path: hashlib.sha256((root / path).read_bytes()).hexdigest() for path in paths}


def changed_inputs(root, hashes):
    return [path for path, digest in hashes.items()
            if not (root / path).is_file() or hashlib.sha256((root / path).read_bytes()).hexdigest() != digest]


def plan_ids(root, plan):
    suites = plan.get('suites')
    require(isinstance(suites, dict) and suites, 'Missing acceptance suites')
    ids = [test_id for suite in suites.values() for test_id in suite]
    require(all((root / path).is_file() for path in suites), 'Missing acceptance suite')
    return ids


def parse_results_or_error(output, expected, duplicate_plan=False):
    try:
        if duplicate_plan:
            raise GateError('Duplicate acceptance plan ID')
        return acceptance_results(output, expected), None
    except GateError as error:
        return {}, str(error)


def validate_node_tap(output):
    """Require a complete successful Node TAP run, including unregistered tests."""
    require(output.startswith('TAP version 13\n') and output.count('TAP version 13') == 1,
            'Node TAP version header is missing or duplicated')
    require(not re.search(r'^\s*not ok \d+ - ', output, re.M),
            'Node TAP contains a failed test result')
    require(not re.search(r'^Bail out!', output, re.M), 'Node TAP bailed out')
    plans = re.findall(r'^1\.\.(\d+)\s*$', output, re.M)
    require(len(plans) == 1, 'Node TAP plan is missing, duplicated, or truncated')
    totals = {}
    for label in ('tests', 'suites', 'pass', 'fail', 'cancelled', 'skipped', 'todo'):
        matches = re.findall(rf'^# {label} (\d+)\s*$', output, re.M)
        require(len(matches) == 1, f'Node TAP {label} summary is missing or duplicated')
        totals[label] = int(matches[0])
    duration_lines = re.findall(r'^# duration_ms [0-9]+(?:\.[0-9]+)?\s*$', output, re.M)
    require(len(duration_lines) == 1,
            'Node TAP duration summary is missing or duplicated')
    require(output.rstrip().endswith(duration_lines[0].strip()), 'Node TAP terminal summary is truncated or followed by extra output')
    result_rows = TAP_RESULT_ROW.findall(output)
    nested_rows = re.findall(r'^\s+(?:ok|not ok) \d+ - .+$', output, re.M)
    require(int(plans[0]) == len(result_rows),
            f"Node TAP plan and top-level result rows disagree ({plans[0]}, {len(result_rows)})")
    require(len(result_rows) + len(nested_rows) == totals['tests'] + totals['suites'],
            'Node TAP nested results and test/suite summary disagree')
    require(totals['fail'] == 0 and totals['cancelled'] == 0 and totals['todo'] == 0,
            'Node TAP reports failures, cancellation, or TODO tests')
    require(sum(totals[key] for key in ('pass', 'fail', 'cancelled', 'skipped')) == totals['tests'],
            'Node TAP summary totals disagree')
    return totals


def run_record(root, plan, shard=None):
    planned = plan_ids(root, plan)
    selected = acceptance_suites(plan, shard)
    selected_ids = [test_id for suite in selected.values() for test_id in suite]
    initial_inputs = input_hashes(root, plan)
    command = acceptance_command(list(selected))
    out = root / 'evidence'
    out.mkdir(exist_ok=True)
    tap_path = out / 'communications.tap'
    report_path = out / 'acceptance.json'
    report_path.unlink(missing_ok=True)
    with tap_path.open('w', encoding='utf-8', buffering=1) as tap_stream:
        result = subprocess.run(command, cwd=root, stdout=tap_stream,
                                stderr=subprocess.STDOUT, text=True)
    tap_bytes = tap_path.read_bytes()
    tap_text = tap_bytes.decode(errors='replace')
    tests, parse_error = parse_results_or_error(
        tap_text, set(selected_ids), duplicate_plan=len(planned) != len(set(planned)))
    if parse_error is None:
        if re.search(r'^\s*not ok \d+ - ', tap_text, re.M):
            parse_error = 'Node TAP contains a failed test result'
        elif re.search(r'^Bail out!', tap_text, re.M):
            parse_error = 'Node TAP bailed out'
    node_summary = None
    if shard is not None and parse_error is None:
        try:
            node_summary = validate_node_tap(tap_text)
        except GateError as error:
            parse_error = str(error)
    changed = changed_inputs(root, initial_inputs)
    if changed:
        parse_error = 'Acceptance inputs changed during execution: ' + ', '.join(changed)

    report = {
        'runAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'command': command,
        'runtime': subprocess.check_output(['node', '--version'], text=True).strip(),
        'tests': tests,
        'failures': 0 if result.returncode == 0 and parse_error is None else 1,
        'parseError': parse_error,
        'inputs': initial_inputs,
        'changedInputs': changed,
    }
    if shard is not None:
        report['shard'] = {
            'index': shard[0],
            'total': shard[1],
            'suites': list(selected),
        }
        report['exitCode'] = result.returncode
        report['tapSha256'] = sha256_bytes(tap_bytes)
    if node_summary is not None:
        report['nodeSummary'] = node_summary
    report_path.write_text(json.dumps(report, indent=2) + '\n')
    label = f' shard {shard[0]}/{shard[1]}' if shard is not None else ''
    print(f"Executed {len(tests)} acceptance cases{label}; failures={report['failures']}")
    return report['failures']


def validate_shard_command(command, suite_paths):
    require(isinstance(command, list) and all(isinstance(item, str) for item in command),
            'Invalid acceptance shard command')
    require(len(command) == 5 + len(suite_paths), 'Acceptance shard command suite list mismatch')
    require(command[:3] == COMMAND_PREFIX, 'Acceptance shard command prefix mismatch')
    require(re.fullmatch(r'--test-concurrency=[1-9][0-9]*', command[3]) is not None,
            'Acceptance shard command concurrency is invalid')
    require(command[4] == '--test-reporter=tap', 'Acceptance shard command reporter mismatch')
    require(command[5:] == suite_paths, 'Acceptance shard command suite list mismatch')
    return command[:5]


def merge_shards(root, plan, directory, shard_count, command):
    planned = plan_ids(root, plan)
    require(len(planned) == len(set(planned)), 'Duplicate acceptance plan ID')
    require(type(shard_count) is int and 1 <= shard_count <= len(plan['suites']),
            'Invalid acceptance shard count')
    directory = Path(directory).resolve()
    require(directory.is_dir(), 'Acceptance shard directory does not exist')
    paths = sorted(directory.rglob('acceptance.json'))
    require(len(paths) == shard_count, f'Expected exactly {shard_count} acceptance shard reports; found {len(paths)}')
    tap_paths = sorted(directory.rglob('communications.tap'))
    require(len(tap_paths) == shard_count, f'Expected exactly {shard_count} shard TAP files; found {len(tap_paths)}')

    current_inputs = input_hashes(root, plan)
    current_runtime = subprocess.check_output(['node', '--version'], text=True).strip()
    seen_parts = set()
    seen_tests = set()
    seen_suites = set()
    common_prefix = None
    shards = []

    for report_path in paths:
        tap_path = report_path.parent / 'communications.tap'
        require(tap_path.is_file(), f'Acceptance shard is missing sibling communications.tap: {report_path}')
        try:
            raw_report = report_path.read_bytes()
            report = json.loads(raw_report)
            tap_bytes = tap_path.read_bytes()
            tap = tap_bytes.decode()
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            raise GateError(f'Cannot read acceptance shard {report_path}: {error}')

        part = report.get('shard')
        require(isinstance(part, dict) and set(part) == {'index', 'total', 'suites'},
                f'Acceptance shard metadata is invalid: {report_path}')
        index, total = part['index'], part['total']
        require(type(index) is int and type(total) is int and total == shard_count and 1 <= index <= total,
                f'Acceptance shard index/count mismatch: {report_path}')
        require(index not in seen_parts, f'Duplicate acceptance shard index: {index}')
        seen_parts.add(index)

        selected = acceptance_suites(plan, (index, total))
        suite_paths = list(selected)
        require(part['suites'] == suite_paths, f'Acceptance shard suite assignment mismatch: {report_path}')
        expected_ids = [test_id for suite in selected.values() for test_id in suite]
        require(not (set(expected_ids) & seen_tests), f'Duplicate acceptance shard tests: {report_path}')
        seen_tests.update(expected_ids)
        require(not (set(suite_paths) & seen_suites), f'Duplicate acceptance shard suites: {report_path}')
        seen_suites.update(suite_paths)

        require(report.get('inputs') == current_inputs,
                f'Acceptance shard inputs differ from the current full plan: {report_path}')
        require(report.get('changedInputs') == [], f'Acceptance shard changed inputs: {report_path}')
        require(report.get('runtime') == current_runtime, f'Acceptance shard runtime mismatch: {report_path}')
        require(report.get('failures') == 0 and report.get('exitCode') == 0 and report.get('parseError') is None,
                f'Acceptance shard did not pass: {report_path}')
        require(report.get('tests') == dict.fromkeys(expected_ids, 'passed'),
                f'Acceptance shard test receipt mismatch: {report_path}')
        require(report.get('tapSha256') == sha256_bytes(tap_bytes),
                f'Acceptance shard TAP hash mismatch: {report_path}')
        parsed = acceptance_results(tap, set(expected_ids))
        require(parsed == report['tests'], f'Acceptance shard TAP/report mismatch: {report_path}')
        node_summary = validate_node_tap(tap)
        require(report.get('nodeSummary') == node_summary,
                f'Acceptance shard Node summary mismatch: {report_path}')

        prefix = validate_shard_command(report.get('command'), suite_paths)
        if common_prefix is None:
            common_prefix = prefix
        require(prefix == common_prefix, f'Acceptance shard command mismatch: {report_path}')

        shards.append({
            'index': index,
            'total': total,
            'suites': suite_paths,
            'tests': expected_ids,
            'command': report['command'],
            'runtime': report['runtime'],
            'reportPath': report_path,
            'reportBytes': raw_report,
            'reportSha256': sha256_bytes(raw_report),
            'tapPath': tap_path,
            'tapBytes': tap_bytes,
            'tapSha256': sha256_bytes(tap_bytes),
            'nodeSummary': node_summary,
        })

    require(seen_parts == set(range(1, shard_count + 1)), 'Acceptance shard inventory is incomplete')
    require(seen_suites == set(plan['suites']), 'Acceptance shard suites do not cover the full plan')
    require(seen_tests == set(planned), 'Acceptance shard tests do not cover the full plan')
    shards.sort(key=lambda row: row['index'])

    # Keep each complete TAP stream byte-for-byte. Boundary comments make the
    # concatenation inspectable without inventing or renumbering test results.
    merged_tap_bytes = b''.join(
        f"# --- captured shard {shard['index']}/{shard_count}; TAP SHA-256 {shard['tapSha256']} ---\n".encode()
        + shard['tapBytes']
        + (b'' if shard['tapBytes'].endswith(b'\n') else b'\n')
        for shard in shards
    )
    merged_tap = merged_tap_bytes.decode(errors='replace')
    merged_tests, merged_parse_error = parse_results_or_error(merged_tap, set(planned))
    require(merged_parse_error is None and merged_tests == dict.fromkeys(planned, 'passed'),
            'Merged TAP does not contain the full passing acceptance inventory')
    changed_during_merge = changed_inputs(root, current_inputs)
    require(not changed_during_merge,
            'Acceptance inputs changed during shard merge: ' + ', '.join(changed_during_merge))

    out = root / 'evidence'
    out.mkdir(exist_ok=True)
    archive_rel = Path('evidence') / 'acceptance-shards' / datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    archive = root / archive_rel
    archive.mkdir(parents=True, exist_ok=False)
    shard_receipts = []
    for shard in shards:
        part_dir = archive / f"shard-{shard['index']:02d}-of-{shard_count:02d}"
        part_dir.mkdir()
        report_dest = part_dir / 'shard-report.json'
        tap_dest = part_dir / 'shard-communications.tap'
        report_dest.write_bytes(shard['reportBytes'])
        tap_dest.write_bytes(shard['tapBytes'])
        shard_receipts.append({
            'index': shard['index'],
            'total': shard['total'],
            'suites': shard['suites'],
            'tests': shard['tests'],
            'command': shard['command'],
            'sourceReport': str(shard['reportPath'].relative_to(directory)),
            'sourceReportSha256': shard['reportSha256'],
            'sourceTap': str(shard['tapPath'].relative_to(directory)),
            'sourceTapSha256': shard['tapSha256'],
            'archivedReport': str(report_dest.relative_to(root)),
            'archivedTap': str(tap_dest.relative_to(root)),
        })

    changed_during_merge = changed_inputs(root, current_inputs)
    require(not changed_during_merge,
            'Acceptance inputs changed while archiving shards: ' + ', '.join(changed_during_merge))

    final_report = {
        'runAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'command': command,
        'runtime': current_runtime,
        'tests': dict.fromkeys(planned, 'passed'),
        'failures': 0,
        'parseError': None,
        'inputs': current_inputs,
        'changedInputs': [],
        'nodeSummary': {
            'tests': sum(shard['nodeSummary']['tests'] for shard in shards),
            'suites': sum(shard['nodeSummary']['suites'] for shard in shards),
            'pass': sum(shard['nodeSummary']['pass'] for shard in shards),
            'fail': 0,
            'cancelled': 0,
            'skipped': sum(shard['nodeSummary']['skipped'] for shard in shards),
            'todo': 0,
        },
        'shardMerge': {
            'count': shard_count,
            'sourceDirectory': str(directory),
            'shards': shard_receipts,
            'tapSha256': sha256_bytes(merged_tap_bytes),
        },
    }
    (out / 'communications.tap').write_bytes(merged_tap_bytes)
    (out / 'acceptance.json').write_text(json.dumps(final_report, indent=2) + '\n')
    print(f'Merged {shard_count} validated acceptance shards; cases={len(planned)}; failures=0')
    return 0


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    mode = result.add_mutually_exclusive_group()
    mode.add_argument('--shard', type=acceptance_shard, metavar='I/N',
                      help='run this one-based round-robin acceptance shard')
    mode.add_argument('--merge-shards', type=Path, metavar='DIRECTORY',
                      help='merge exactly --shard-count validated shard receipts found recursively')
    result.add_argument('--shard-count', type=int,
                        help='required shard count when using --merge-shards')
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    if args.merge_shards is None and args.shard_count is not None:
        parser().error('--shard-count requires --merge-shards')
    if args.merge_shards is not None and args.shard_count is None:
        parser().error('--merge-shards requires --shard-count')

    try:
        plan = json.loads((ROOT / 'spec/acceptance-plan.json').read_text())
        planned = plan_ids(ROOT, plan)
        if args.merge_shards is not None:
            command = ['python3', 'scripts/record-evidence.py', '--merge-shards',
                       str(args.merge_shards), '--shard-count', str(args.shard_count)]
            return merge_shards(ROOT, plan, args.merge_shards, args.shard_count, command)
        if args.shard is not None:
            acceptance_suites(plan, args.shard)
        return run_record(ROOT, plan, args.shard)
    except (GateError, OSError, json.JSONDecodeError, KeyError, TypeError) as error:
        if args.merge_shards is not None:
            # A failed merge invalidates any older global pass so it cannot be
            # mistaken for the result of this attempted aggregation.
            out = ROOT / 'evidence'
            out.mkdir(exist_ok=True)
            try:
                plan = json.loads((ROOT / 'spec/acceptance-plan.json').read_text())
                hashes = input_hashes(ROOT, plan)
            except Exception:
                hashes = {}
            report = {
                'runAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                'command': ['python3', 'scripts/record-evidence.py', '--merge-shards',
                            str(args.merge_shards), '--shard-count', str(args.shard_count)],
                'runtime': subprocess.check_output(['node', '--version'], text=True).strip(),
                'tests': {},
                'failures': 1,
                'parseError': str(error),
                'inputs': hashes,
                'changedInputs': [],
            }
            (out / 'acceptance.json').write_text(json.dumps(report, indent=2) + '\n')
        else:
            print(f'Acceptance recorder failed: {error}', file=sys.stderr)
            return 1
        print(f'Acceptance shard merge failed: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
