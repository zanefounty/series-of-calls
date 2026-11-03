#!/usr/bin/env python3
"""Bounded, per-file evidence runner for the complete inherited Node suite."""
import concurrent.futures
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import threading
import time

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
LOGS = OUT / "suite-logs"
NODE_PATH = "/home/zane-fountylabs/workspace/fountry/node_modules"
WORKERS = 4
PER_FILE_CEILING = 240
TESTS = sorted((ROOT / "tests").glob("*.test.js"))
TIMINGS = json.loads((ROOT / "tests/durations.json").read_text())
known = sorted(float(v) for v in TIMINGS.values() if isinstance(v, (int, float)) and v > 0)
typical = known[len(known) // 2] if known else 1.0
total = len(TESTS)
lock = threading.Lock()
finished = 0
manifest = {
    "kind": "bounded-full-node-suite-per-file",
    "startedAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "command": "NODE_PATH=/home/zane-fountylabs/workspace/fountry/node_modules node --test --test-reporter=tap --test-isolation=none tests/<file>.test.js",
    "workers": WORKERS,
    "perFileTimeoutSeconds": "min(240, max(45, ceil(2 * recorded duration or median fallback + 15)))",
    "filesDiscovered": total,
    "results": [],
}
OUT.mkdir(parents=True, exist_ok=True)
LOGS.mkdir(parents=True, exist_ok=True)
manifest_path = OUT / "per-file-results.json"


def write_manifest():
    manifest["results"] = sorted(manifest["results"], key=lambda x: x["file"])
    manifest["updatedAtUtc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    temp = manifest_path.with_suffix(".json.tmp")
    temp.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    temp.replace(manifest_path)


def run_one(index_and_path):
    global finished
    index, path = index_and_path
    relative = path.relative_to(ROOT).as_posix()
    duration = float(TIMINGS.get(relative, typical))
    timeout = min(PER_FILE_CEILING, max(45, math.ceil(2 * duration + 15)))
    source = path.read_bytes()
    env = os.environ.copy()
    env["NODE_PATH"] = NODE_PATH
    env["NO_COLOR"] = "1"
    cmd = ["node", "--test", "--test-reporter=tap", "--test-isolation=none", relative]
    print(f"START {index}/{total} {relative} timeout={timeout}s", flush=True)
    began = time.monotonic()
    timed_out = False
    try:
        proc = subprocess.run(cmd, cwd=ROOT, env=env, text=True, encoding="utf-8", errors="replace",
                              stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                              timeout=timeout, check=False)
        output = proc.stdout or ""
        return_code = proc.returncode
    except subprocess.TimeoutExpired as exc:
        timed_out = True
        partial = exc.stdout or ""
        output = partial.decode("utf-8", "replace") if isinstance(partial, bytes) else partial
        return_code = None
    elapsed = round(time.monotonic() - began, 3)
    log_path = LOGS / f"{path.stem}.tap.log"
    log_path.write_text(output)
    tests_count = re.search(r"^# tests (\d+)$", output, re.M)
    pass_count = re.search(r"^# pass (\d+)$", output, re.M)
    fail_count = re.search(r"^# fail (\d+)$", output, re.M)
    skip_count = re.search(r"^# skipped (\d+)$", output, re.M)
    not_ok = [line.strip() for line in output.splitlines() if line.startswith("not ok ")]
    errors = [line.strip() for line in output.splitlines() if line.startswith("# error ")]
    ok = return_code == 0 and not timed_out and tests_count is not None and int(fail_count.group(1)) == 0
    result = {
        "file": relative,
        "sourceSha256": hashlib.sha256(source).hexdigest(),
        "log": log_path.relative_to(ROOT).as_posix(),
        "logSha256": hashlib.sha256(output.encode("utf-8")).hexdigest(),
        "exitCode": return_code,
        "timedOut": timed_out,
        "timeoutSeconds": timeout,
        "elapsedSeconds": elapsed,
        "tests": int(tests_count.group(1)) if tests_count else None,
        "passed": int(pass_count.group(1)) if pass_count else None,
        "failed": int(fail_count.group(1)) if fail_count else None,
        "skipped": int(skip_count.group(1)) if skip_count else None,
        "status": "pass" if ok else ("timeout" if timed_out else "fail"),
        "failureLines": (not_ok + errors)[:30],
    }
    with lock:
        finished += 1
        manifest["results"].append(result)
        write_manifest()
        print(f"DONE {finished}/{total} {result['status']} {relative} tests={result['tests']} fail={result['failed']} elapsed={elapsed}s", flush=True)


def main():
    write_manifest()
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        list(pool.map(run_one, enumerate(TESTS, 1)))
    counts = {}
    for row in manifest["results"]:
        counts[row["status"]] = counts.get(row["status"], 0) + 1
    manifest["completedAtUtc"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    manifest["suiteStatusCounts"] = counts
    manifest["completedSuites"] = len(manifest["results"])
    write_manifest()
    print(f"SUMMARY {len(manifest['results'])}/{total} suites {counts}", flush=True)


if __name__ == "__main__":
    main()
