#!/usr/bin/env python3
"""Visible-control provider campaign smoke through pinned Playwright MCP stdio.

This diagnostic owns a separate headless Chromium process, does not inject
SOC state, and writes every report/artifact only to the requested output dir.
It is not full browser acceptance or native-connector verification.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("soc_browser_mcp",ROOT/"scripts/browser-mcp-smoke.py")
browser=importlib.util.module_from_spec(spec)
spec.loader.exec_module(browser)


def manifest():
    paths=[ROOT/"package.json",ROOT/"package-lock.json",Path(__file__)]
    for folder in ("src","site","content"):
        paths.extend(p for p in (ROOT/folder).rglob("*") if p.is_file())
    return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}


def result_text(value):
    return "\n".join(x.get("text","") for x in value.get("content",[])).split("### Result\n",1)[-1].split("\n### ",1)[0].strip()


def wait(client,condition,name,timeout=20):
    code="async () => { const end=Date.now()+"+str(int(timeout*1000))+"; while(Date.now()<end){if("+condition+") return {passed:true}; await new Promise(r=>setTimeout(r,100));} throw new Error("+json.dumps(name)+"); }"
    client.evaluate(code)
    client.report["checks"].append(name)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--mcp-dir",type=Path,required=True)
    parser.add_argument("--executable",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True,help="External raw-output directory, such as /tmp/soc-provider-mcp")
    args=parser.parse_args()
    stamp=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S-%fZ")
    out=args.output.resolve()/stamp
    out.mkdir(parents=True,exist_ok=False)
    package=json.loads((args.mcp_dir/"package.json").read_text())
    if package.get("version")!="0.0.84":
        raise ValueError("Pinned @playwright/mcp 0.0.84 required")
    executable=args.executable.resolve()
    if not executable.is_file() or not os.access(executable,os.X_OK):
        raise ValueError("Explicit executable Chromium path must exist and be executable")
    browser_version=subprocess.check_output([str(executable),"--version"],text=True,stderr=subprocess.STDOUT).strip()
    command=["node",str(args.mcp_dir.resolve()/"cli.js"),"--headless","--isolated","--caps","network","--executable-path",str(executable),"--save-session","--output-dir",str(out)]
    report={"status":"running","startedAt":datetime.now(timezone.utc).isoformat(),"scope":"Synthetic provider campaign visible-control diagnostic through separate Playwright MCP/Chromium process; not full campaign/browser acceptance or native connector verification","mcpPackage":package["version"],"mcpPlaywrightDependencies":{k:v for k,v in package.get("dependencies",{}).items() if k.startswith("playwright")},"command":command,"node":subprocess.check_output(["node","--version"],text=True).strip(),"browserExecutable":str(executable),"browserVersion":browser_version,"nativeConnectorObservation":{"attemptedPath":"/opt/google/chrome/chrome","result":"missing executable; native connector remains unverified"},"inputs":manifest(),"checks":[],"calls":[]}
    client=server=None
    try:
        with tempfile.TemporaryDirectory(prefix="soc-provider-mcp-build-") as build:
            server_code="const b=require('./scripts/build');b.build({out:"+json.dumps(build)+"});const s=require('./scripts/serve').start({directory:"+json.dumps(build)+",port:0});"
            server=subprocess.Popen(["node","-e",server_code],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
            deadline=time.monotonic()+30
            url=None
            while time.monotonic()<deadline:
                line=server.stdout.readline()
                if line.startswith("Series of Calls preview:"):
                    url=line.strip().split("preview: ",1)[1]
                    break
                if server.poll() is not None:
                    raise RuntimeError(server.stderr.read())
            if not url:
                raise TimeoutError("Static built preview did not start")
            report["url"]=url
            report["artifactHashes"]={str(p.relative_to(build)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(Path(build).rglob("*")) if p.is_file()}
            client=browser.BrowserClient(command,report)
            report["initialize"]=client.request("initialize",{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"series-of-calls-provider-mcp-smoke","version":"1"}})
            client.process.stdin.write(b'{"jsonrpc":"2.0","method":"notifications/initialized"}\n');client.process.stdin.flush()
            schemas=client.request("tools/list")
            report["tools"]=[x["name"] for x in schemas["tools"]]
            required={"browser_navigate","browser_click","browser_fill_form","browser_press_key","browser_snapshot","browser_wait_for","browser_evaluate"}
            if not required.issubset(report["tools"]):
                raise AssertionError("Pinned browser MCP missing required visible-control tools: "+str(sorted(required-set(report["tools"]))))
            client.call("browser_resize",{"width":1440,"height":1000})
            client.call("browser_navigate",{"url":url})
            client.evaluate("() => ({userAgent:navigator.userAgent,appTitle:document.title})")
            client.check("provider-launch-visible","!!document.querySelector('#provider-campaign button[data-provider-action=open]') && !!document.querySelector('#provider-campaign button[data-provider-action=show-new-game]')")
            client.call("browser_snapshot",{"target":"#provider-campaign","depth":3})

            # Exercise Play/Continue, close the owned career through the menu, then
            # start the explicit scenario from the visible New career form.
            client.click('#provider-campaign .provider-launch-actions button[data-provider-action="open"]')
            wait(client,"!!SCP.state && SCP.locked","play-continue-opens-and-locks-career")
            client.check("play-continue-creates-campaign","SCP.state.providerCampaign.scenario === 'smb' && SCP.state.clock === 0")
            client.click('#provider-campaign button[data-provider-action="drawer"][data-provider-value="menu"]')
            client.click('#provider-campaign button[data-provider-action="close"]')
            client.check("close-returns-to-launch","SCP.atHome && !SCP.locked && !!document.querySelector('#provider-campaign button[data-provider-action=show-new-game]')")
            client.click('#provider-campaign button[data-provider-action="show-new-game"]')
            client.call("browser_fill_form",{"fields":[
                {"target":'#provider-campaign [data-provider-form="new-game"] [name="providerName"]',"name":"Provider name","type":"textbox","value":"Visible MCP Provider"},
                {"target":'#provider-campaign [data-provider-form="new-game"] [name="market"]',"name":"Home market","type":"combobox","value":"Sydney"},
                {"target":'#provider-campaign [data-provider-form="new-game"] [name="scenario"]',"name":"Opening mission","type":"combobox","value":"smb"},
                {"target":'#provider-campaign [data-provider-form="new-game"] [name="difficulty"]',"name":"Difficulty","type":"combobox","value":"normal"}
            ]})
            client.click('#provider-campaign [data-provider-form="new-game"] button[type="submit"]')
            wait(client,"SCP.state?.providerCampaign?.providerName === 'Visible MCP Provider' && SCP.locked","new-career-created-through-form")
            client.check("new-career-starts-paused","SCP.state.clock === 0 && SCP.speed === 0 && SCP.state.providerCampaign.customers.length === 0")

            # Open and cancel a visible quote with Escape; open again, submit its
            # retail offer and commit the actual provider order through the UI.
            client.click('#provider-campaign button[data-provider-action="quote"][data-offer="starter"]')
            wait(client,"!!document.querySelector('#provider-campaign .provider-modal [data-provider-action=confirm-quote]')","starter-quote-opened")
            client.check("quote-focus-is-accessible","document.activeElement?.closest('.provider-modal') === document.querySelector('#provider-campaign .provider-modal')")
            client.call("browser_press_key",{"key":"Escape"})
            client.check("quote-cancelled-by-keyboard","!SCP.state.providerCampaign.customers.length && !document.querySelector('#provider-campaign .provider-modal')")
            client.click('#provider-campaign button[data-provider-action="quote"][data-offer="starter"]')
            client.click('#provider-campaign .provider-starter-retail > summary')
            wait(client,"!!document.querySelector('#provider-campaign form[data-provider-form=retail-quote]')","retail-agreement-visible")
            client.call("browser_snapshot",{"target":"#provider-campaign .provider-modal","depth":3})
            client.click('#provider-campaign form[data-provider-form="retail-quote"] button')
            wait(client,"!!document.querySelector('#provider-campaign .provider-modal [data-provider-action=confirm-quote]')","retail-quote-rechecked")
            client.check("quoted-retail-is-visible","!!document.querySelector('#provider-campaign .provider-modal input[name=retailPrice]') && !!document.querySelector('#provider-campaign .provider-modal [data-provider-action=confirm-quote]:not([disabled])')")
            client.click('#provider-campaign .provider-modal button[data-provider-action="confirm-quote"]')
            wait(client,"SCP.state.providerCampaign.projects.some(p => p.kind === 'stage' && p.stage === 'base')","starter-order-committed")
            client.check("commit-is-a-real-funded-project","SCP.state.providerCampaign.customers.length === 1 && SCP.state.providerCampaign.projects[0].status === 'running' && SCP.state.clock === 0")

            # Inspect actual finance data, advance using the visible speed controls,
            # then save from the campaign menu.
            client.click('#provider-campaign button[data-provider-action="drawer"][data-provider-value="finance"]')
            client.call("browser_snapshot",{"target":"#provider-campaign","depth":2})
            client.check("finance-inspector-visible","document.querySelector('#provider-campaign [data-provider-region=inspector]')?.textContent.includes('Finance') || document.querySelector('#provider-campaign [data-provider-region=rail]')?.textContent.includes('Finance')")
            client.click('#provider-campaign button[data-provider-action="speed"][data-provider-value="8"]')
            wait(client,"SCP.state.clock >= 2","visible-clock-advances",timeout=20)
            client.click('#provider-campaign button[data-provider-action="pause"]')
            client.check("clock-control-pauses","SCP.speed === 0 && SCP.state.clock >= 2")
            client.click('#provider-campaign button[data-provider-action="drawer"][data-provider-value="menu"]')
            beforeSeq=client.evaluate("() => JSON.parse(localStorage.getItem('series-of-calls:provider:v1')).seq")
            client.click('#provider-campaign button[data-provider-action="save"]')
            client.check("save-control-persists-current-clock","JSON.parse(localStorage.getItem('series-of-calls:provider:v1')).state.clock === SCP.state.clock && JSON.parse(localStorage.getItem('series-of-calls:provider:v1')).seq > "+result_text(beforeSeq))
            saved=client.evaluate("() => ({seq:JSON.parse(localStorage.getItem('series-of-calls:provider:v1')).seq,clock:SCP.state.clock,requestSequence:SCP.state.providerRequestSequence,projects:SCP.state.providerCampaign.projects.length,providerName:SCP.state.providerCampaign.providerName})")
            report["savedObservation"]=result_text(saved)
            client.call("browser_press_key",{"key":"Tab"})
            client.check("keyboard-keeps-campaign-controls-usable","SCP.locked && document.activeElement !== document.body")
            client.call("browser_take_screenshot",{"filename":str(out/"provider-campaign.png"),"fullPage":True,"scale":"css"})
            report["status"]="diagnostic-passed"
    except Exception as error:
        report["status"]="failed"
        report["error"]=str(error)
    finally:
        if client:
            report["stderr"]=client.stderr.decode(errors="replace")
            client.close()
        if server:
            server.terminate()
            server.wait(timeout=5)
        current=manifest()
        report["sourceDrift"]=[p for p in set(report["inputs"])|set(current) if report["inputs"].get(p)!=current.get(p)]
        if report["sourceDrift"] and report["status"]=="diagnostic-passed":
            report["status"]="diagnostic-source-drift"
        report["finishedAt"]=datetime.now(timezone.utc).isoformat()
        (out/"report.json").write_text(json.dumps(report,indent=2)+"\n")
        print(json.dumps({"status":report["status"],"checks":report["checks"],"sourceDrift":report["sourceDrift"],"report":str(out/"report.json"),"error":report.get("error")}))
    return 0 if report["status"]=="diagnostic-passed" else 1


if __name__=="__main__":
    raise SystemExit(main())
