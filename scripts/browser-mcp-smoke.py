#!/usr/bin/env python3
"""Diagnostic served-UI checks through a pinned, actual Playwright MCP process.

No gameplay state is injected. Browser evaluation is read-only except the
explicit browser Worker failure used to exercise the application's fallback.
This bounded diagnostic is not full campaign or release acceptance.
"""
import argparse
import hashlib
import importlib.util
import json
import os
import re
from pathlib import Path
import selectors
import subprocess
import tempfile
import time
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("soc_mcp_smoke", ROOT / "scripts/mcp-smoke.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def manifest():
    paths = [ROOT / "package.json", ROOT / "package-lock.json", Path(__file__)]
    for folder in ("src", "site", "content"):
        paths.extend(p for p in (ROOT / folder).rglob("*") if p.is_file())
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}


class BrowserClient(module.Client):
    def __init__(self, command, report):
        self.process = subprocess.Popen(command, cwd=ROOT, stdin=subprocess.PIPE,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        self.selector = selectors.DefaultSelector()
        self.selector.register(self.process.stdout, selectors.EVENT_READ, "stdout")
        self.selector.register(self.process.stderr, selectors.EVENT_READ, "stderr")
        self.buffer = b""
        self.stderr = b""
        self.sequence = 0
        self.timeout = 60
        self.report = report

    def request(self, method, params=None):
        self.sequence += 1
        message = {"jsonrpc": "2.0", "id": self.sequence, "method": method}
        if params is not None:
            message["params"] = params
        self.process.stdin.write((json.dumps(message) + "\n").encode())
        self.process.stdin.flush()
        deadline = time.monotonic() + self.timeout
        while True:
            while b"\n" in self.buffer:
                line, self.buffer = self.buffer.split(b"\n", 1)
                response = json.loads(line)
                if "id" not in response and "method" in response:
                    self.report.setdefault("notifications", []).append(response)
                    continue
                if response.get("id") != self.sequence:
                    raise AssertionError({"unexpectedProtocolMessage": response})
                if "error" in response:
                    raise AssertionError(response["error"])
                return response["result"]
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("MCP response timed out: " + method)
            for key, _ in self.selector.select(remaining):
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    self.selector.unregister(key.fileobj)
                    if key.data == "stdout":
                        raise RuntimeError("MCP closed stdout: " + self.stderr.decode(errors="replace"))
                elif key.data == "stdout":
                    self.buffer += chunk
                    if len(self.buffer) > 32_000_000:
                        raise RuntimeError("MCP response exceeded bound")
                else:
                    self.stderr = (self.stderr + chunk)[-20000:]

    def call(self, name, args=None):
        result = self.request("tools/call", {"name": name, "arguments": args or {}})
        # Screenshots are retained as files by MCP. Never duplicate base64 blobs.
        compact = {**result, "content": [x if x.get("type") != "image" else
                   {"type": "image", "mimeType": x.get("mimeType"), "omitted": "retained by MCP as artifact"}
                   for x in result.get("content", [])]}
        self.report["calls"].append({"tool": name, "arguments": args or {}, "result": compact})
        if result.get("isError"):
            raise AssertionError({"tool": name, "result": compact})
        return result

    def evaluate(self, code):
        return self.call("browser_evaluate", {"function": code})

    def click(self, target):
        return self.call("browser_click", {"target": target})

    def check(self, name, expression):
        self.evaluate("() => { const value = (" + expression + "); if (!value) throw new Error(" +
                      json.dumps(name) + "); return {check:" + json.dumps(name) + ", passed:true}; }")
        self.report["checks"].append(name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--mcp-dir", type=Path, required=True)
    parser.add_argument("--executable", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "evidence/access-restored-2026-11-04/browser-mcp")
    args = parser.parse_args()
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%fZ")
    out = args.output.resolve() / stamp
    out.mkdir(parents=True, exist_ok=False)
    package = json.loads((args.mcp_dir / "package.json").read_text())
    if package["version"] != "0.0.84":
        raise ValueError("Pinned @playwright/mcp 0.0.84 required")
    command = ["node", str(args.mcp_dir / "cli.js"), "--headless", "--isolated", "--caps", "network",
               "--executable-path", str(args.executable.resolve()), "--save-session", "--output-dir", str(out)]
    report = {"checkedAt": datetime.now(timezone.utc).isoformat(), "status": "running", "checks": [], "calls": [],
              "scope": "Diagnostic real browser MCP visible-control smoke; not full campaign or release acceptance",
              "mcpPackage": package["version"], "mcpDependencies": package["dependencies"], "command": command,
              "node": subprocess.check_output(["node", "--version"], text=True).strip(),
              "nodePath": os.environ.get("NODE_PATH"), "inputs": manifest()}
    client = server = None
    try:
        with tempfile.TemporaryDirectory(prefix="soc-mcp-browser-build-") as build:
            server_code = "const b=require('./scripts/build');b.build({out:" + json.dumps(build) + "});const s=require('./scripts/serve').start({directory:" + json.dumps(build) + ",port:0});"
            server = subprocess.Popen(["node", "-e", server_code], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            deadline = time.monotonic() + 30
            url = None
            while time.monotonic() < deadline:
                line = server.stdout.readline()
                if line.startswith("Series of Calls preview:"):
                    url = line.strip().split("preview: ", 1)[1]
                    break
                if server.poll() is not None:
                    raise RuntimeError(server.stderr.read())
            if not url:
                raise TimeoutError("Preview did not start")
            report["url"] = url
            report["artifactHashes"] = {str(p.relative_to(build)): hashlib.sha256(p.read_bytes()).hexdigest()
                                        for p in sorted(Path(build).rglob("*")) if p.is_file()}
            client = BrowserClient(command, report)
            report["initialize"] = client.request("initialize", {"protocolVersion": "2025-11-25", "capabilities": {},
                "clientInfo": {"name": "series-of-calls-browser-diagnostic", "version": "1"}})
            client.process.stdin.write(b'{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
            client.process.stdin.flush()
            schemas = client.request("tools/list")
            (out / "tool-schemas.json").write_text(json.dumps(schemas, indent=2) + "\n")
            report["tools"] = [x["name"] for x in schemas["tools"]]
            client.call("browser_resize", {"width": 1440, "height": 1000})
            client.call("browser_navigate", {"url": url})
            client.evaluate("async () => {await navigator.serviceWorker.ready; return {browser:navigator.userAgent,serviceWorkerReady:true};}")
            client.evaluate("() => {const NativeWorker=globalThis.Worker;globalThis.__socBrowserWorkerObserved={created:0,results:0,errors:0,fallbacks:0};globalThis.Worker=class extends NativeWorker{constructor(...args){super(...args);__socBrowserWorkerObserved.created++;this.addEventListener('message',()=>__socBrowserWorkerObserved.results++);this.addEventListener('error',()=>__socBrowserWorkerObserved.errors++);}};return {instrumentation:'browser Worker events only; no gameplay mutation'};}")
            client.click('[data-provider-action="training"]')
            client.check("first-training-entry", "SCT.locked && !!document.querySelector('#soc-console:not([hidden])')")
            client.call("browser_snapshot", {"target": "#soc-console", "depth": 2})
            client.click('[data-soc="select"][data-id="people"]')
            client.call("browser_fill_form", {"fields": [{"target": '#soc-config [name="people"]', "name": "Staffed people", "type": "textbox", "value": "-1"}]})
            client.click('#soc-config button[type="submit"]')
            client.check("invalid-configuration-not-applied", "SCT.state.resources.people.desired.people !== -1 && !document.querySelector('#soc-config').checkValidity()")
            client.call("browser_fill_form", {"fields": [{"target": '#soc-config [name="people"]', "name": "Staffed people", "type": "textbox", "value": "2"}]})
            client.click('#soc-config button[type="submit"]')
            client.check("configuration-repair-pending", "SCT.state.resources.people.desired.people === 2 && SCT.state.resources.people.provisioning.status === 'pending'")
            client.click('[data-soc="minute"]')
            client.call("browser_wait_for", {"time": 1})
            client.check("worker-provisioning-effective", "!SCT.busy && SCT.state.clock === 1 && SCT.state.resources.people.effective.people === 2")
            client.check("actual-worker-result", "__socBrowserWorkerObserved.created > 0 && __socBrowserWorkerObserved.results > 0 && __socBrowserWorkerObserved.errors === 0")
            client.click('[data-soc="interaction"]')
            client.click('[data-soc="five"]')
            client.call("browser_wait_for", {"time": 1})
            client.check("actual-reference-assessment", "!SCT.busy && SOC.assess(SCT.state).passed")
            client.click("#soc-topology")
            client.call("browser_press_key", {"key": "End"})
            client.check("keyboard-topology", "SCT.selected === 'people' && document.activeElement.id === 'soc-topology'")
            # Browser capability fault only: no SOC state or dispatcher injection.
            client.evaluate("() => { globalThis.Worker = function(){__socBrowserWorkerObserved.fallbacks++;throw new Error('synthetic browser Worker construction failure');}; return {browserFault:'Worker constructor unavailable'}; }")
            client.click('[data-soc="minute"]')
            client.call("browser_wait_for", {"time": 1})
            client.check("worker-fallback", "!SCT.busy && SCT.state.clock === 7 && __socBrowserWorkerObserved.fallbacks === 1")
            saved = client.evaluate("() => JSON.stringify(SCT.state)")
            report["savedObservation"] = saved
            export_path = out / "exercise-export.json"
            client.call("browser_run_code_unsafe", {"code": "async (page) => {const pending=page.waitForEvent('download'); await page.locator('[data-soc=export]').click(); const download=await pending; await download.saveAs(" + json.dumps(str(export_path)) + "); return {download:download.suggestedFilename(),saved:true};}"})
            exported = json.loads(export_path.read_text())
            if exported.get("clock") != 7:
                raise AssertionError("Export does not contain the exercised state")
            client.click('[data-soc="new"]')
            client.check("new-exercise-before-import", "SCT.state.clock === 0 && !SOC.assess(SCT.state).passed")
            client.click("#soc-import")
            client.call("browser_file_upload", {"paths": [str(export_path)]})
            client.check("export-import", "SCT.state.clock === 7 && SOC.assess(SCT.state).passed")
            invalid_path = out / "invalid-import.json"
            invalid_path.write_text('{"app":"foreign","v":1}\n')
            client.click("#soc-import")
            client.call("browser_file_upload", {"paths": [str(invalid_path)]})
            client.check("invalid-import-preserves-state", "SCT.state.clock === 7 && SOC.assess(SCT.state).passed && !!SCT.error")
            client.click("#soc-import")
            client.call("browser_file_upload", {"paths": [str(export_path)]})
            client.check("import-recovery", "SCT.state.clock === 7 && !SCT.error")
            client.call("browser_tabs", {"action": "new", "url": url})
            client.click('[data-provider-action="training"]')
            client.check("second-tab-readonly", "!!SCT.state && !SCT.locked")
            client.call("browser_tabs", {"action": "close"})
            client.call("browser_tabs", {"action": "select", "index": 0})
            client.call("browser_navigate", {"url": url})
            client.click('[data-provider-action="training"]')
            client.check("save-reload", "SCT.locked && SCT.state.clock === 7 && SOC.assess(SCT.state).passed")
            restored = client.evaluate("() => JSON.stringify(SCT.state)")
            # Compare only the Result block; MCP may append navigation context.
            def result_text(value):
                return '\n'.join(x.get('text', '') for x in value.get('content', [])).split('### Result\n', 1)[-1].split('\n### ', 1)[0].strip()
            if result_text(saved) != result_text(restored):
                raise AssertionError("Exact saved state differs after reload")
            report["checks"].append("exact-save-reload")
            client.click('[data-soc="new"]')
            client.click('[data-soc="select"][data-id="people"]')
            client.call("browser_fill_form", {"fields": [{"target": '#soc-config [name="people"]', "name": "Staffed people", "type": "textbox", "value": "2"}]})
            client.click('#soc-config button[type="submit"]')
            for selector in ('[data-soc="minute"]', '[data-soc="interaction"]', '[data-soc="five"]', '[data-soc="minute"]'):
                client.click(selector)
                client.call("browser_wait_for", {"time": 1})
            replayed = client.evaluate("() => JSON.stringify(SCT.state)")
            if result_text(saved) != result_text(replayed):
                raise AssertionError("Visible-control replay differs from saved state")
            report["checks"].append("deterministic-visible-control-replay")
            client.check("cache-installed", "!!navigator.serviceWorker.controller")
            client.call("browser_network_state_set", {"state": "offline"})
            client.call("browser_navigate", {"url": url})
            client.click('[data-provider-action="training"]')
            client.check("offline-reload", "SCT.locked && SCT.state.clock === 7 && SOC.assess(SCT.state).passed && !!navigator.serviceWorker.controller")
            client.call("browser_network_state_set", {"state": "online"})
            for width, height in ((1440, 1000), (390, 844), (844, 390)):
                client.call("browser_resize", {"width": width, "height": height})
                client.check("responsive-" + str(width), "document.querySelector('#soc-console').scrollWidth <= innerWidth")
                client.call("browser_take_screenshot", {"filename": str(out / ("training-" + str(width) + ".png")), "fullPage": True, "scale": "css"})
            console = client.call("browser_console_messages", {"level": "error", "all": True})
            console_text = "\n".join(x.get("text", "") for x in console.get("content", []))
            if not re.search(r"Errors: 0\b", console_text):
                raise AssertionError("Browser console reports errors: " + console_text)
            report["checks"].append("no-console-errors-across-navigations")
            client.call("browser_network_requests", {"static": False, "all": True})
            report["status"] = "diagnostic-passed"
    except Exception as error:
        report["status"] = "failed"
        report["error"] = str(error)
    finally:
        if client:
            report["stderr"] = client.stderr.decode(errors="replace")
            client.close()
        if server:
            server.terminate()
            server.wait(timeout=5)
        current = manifest()
        report["sourceDrift"] = [p for p in set(report["inputs"]) | set(current) if report["inputs"].get(p) != current.get(p)]
        if report["sourceDrift"] and report["status"] == "diagnostic-passed":
            report["status"] = "diagnostic-source-drift"
        report["finishedAt"] = datetime.now(timezone.utc).isoformat()
        (out / "report.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps({"status": report["status"], "checks": report["checks"], "sourceDrift": report["sourceDrift"], "report": str(out / "report.json"), "error": report.get("error")}))
    return 0 if report["status"] == "diagnostic-passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
